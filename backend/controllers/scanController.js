const fs = require("fs-extra");
const path = require("path");
const { saveDocument, getDocumentById ,getDocumentsByUser,updateMatchRate} = require("../models/documentModel"); // Import DB functions
const { deductCredit ,checkCredits} = require('../routes/creditRoutes');  // Add this import at the top
const db = require('../config/db');
const DOCUMENTS_DIR = path.join(__dirname, "../documents");

/**
 * Read all stored .txt files from `documents/` folder
 */
async function getStoredDocuments() {
    const files = await fs.readdir(DOCUMENTS_DIR);
    const txtFiles = files.filter(file => file.endsWith(".txt"));

    const documents = [];
    for (let file of txtFiles) {
        const filePath = path.join(DOCUMENTS_DIR, file);
        const content = await fs.readFile(filePath, "utf8");
        documents.push({ filename: file, text: content });
    }
    return documents;
}

/**
 * Calculate Levenshtein Distance
 */
function levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const dp = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 0; j <= len2; j++) dp[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
            }
        }
    }

    return dp[len1][len2];
}

/**
 * Calculate word frequency similarity
 */
function wordFrequencySimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\W+/);
    const words2 = text2.toLowerCase().split(/\W+/);

    const freq1 = words1.reduce((acc, word) => (acc[word] = (acc[word] || 0) + 1, acc), {});
    const freq2 = words2.reduce((acc, word) => (acc[word] = (acc[word] || 0) + 1, acc), {});

    let intersection = 0;
    let union = new Set([...words1, ...words2]).size;

    for (let word in freq1) {
        if (freq2[word]) intersection++;
    }

    return (intersection / union) * 100;
}

/**
 * Process Uploaded File & Find Matches
 */

exports.scanFile = async (req, res) => {
    try {
        console.log("📄 Uploaded file:", req.file.originalname);
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });
        
        const userId = req.headers.userid;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const filePath = req.file.path;
        const fileContent = await fs.readFile(filePath, "utf8");
        const fileSize = fs.statSync(filePath).size;
        
        // Save document to database
        const docId = saveDocument(userId, req.file.originalname, fileContent);

        // Process document matching
        const storedDocuments = await getStoredDocuments();
        const matches = storedDocuments.map(doc => {
            const levenshteinScore = levenshteinDistance(fileContent, doc.text);
            const maxLen = Math.max(fileContent.length, doc.text.length);
            const similarity = (1 - levenshteinScore / maxLen) * 100;
            const wordFreqScore = wordFrequencySimilarity(fileContent, doc.text);

            return {
                filename: doc.filename,
                levenshteinSimilarity: similarity.toFixed(2),
                wordFrequencySimilarity: wordFreqScore.toFixed(2),
                avgSimilarity: ((similarity + wordFreqScore) / 2).toFixed(2)
            };
        });

        matches.sort((a, b) => b.avgSimilarity - a.avgSimilarity);

        if (matches.length > 0) {
            const highestMatchRate = parseFloat(matches[0].avgSimilarity);
            await updateMatchRate(docId, highestMatchRate);
        }

        // Record the scan in scans table
        const recordScan = db.prepare(`
            INSERT INTO scans (user_id, scan_date)
            VALUES (?, CURRENT_TIMESTAMP)
        `);
        recordScan.run(userId);

        // Get updated scan statistics
        const userStats = db.prepare(`
            SELECT 
                COUNT(CASE WHEN DATE(scan_date) = DATE('now') THEN 1 END) as scans_today,
                COUNT(*) as total_scans
            FROM scans 
            WHERE user_id = ?
        `).get(userId);

        // Deduct credit and get remaining credits
        const creditResult = await deductCredit(userId);
        if (!creditResult) {
            return res.status(400).json({ error: "Failed to deduct credit" });
        }

        // Clean up uploaded file
        await fs.remove(filePath);

        res.json({ 
            message: "Document saved successfully", 
            documentId: docId, 
            matches,
            stats: {
                scansToday: userStats.scans_today,
                totalScans: userStats.total_scans,
                remainingCredits: creditResult.credits
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.getMatchesByDocId = async (req, res) => {
    try {
        const docId = req.params.docId;
        const document = await getDocumentById(docId);
        if (!document) {
            return res.status(404).json({ error: "Document not found" });
        }

        // Get stored documents to compare with
        const storedDocuments = await getStoredDocuments();

        // Compare document content with stored documents
        const matches = storedDocuments.map(doc => {
            const levenshteinScore = levenshteinDistance(document.content, doc.text);
            const maxLen = Math.max(document.content.length, doc.text.length);
            const similarity = (1 - levenshteinScore / maxLen) * 100;

            const wordFreqScore = wordFrequencySimilarity(document.content, doc.text);

            return {
                filename: doc.filename,
                levenshteinSimilarity: similarity.toFixed(2),
                wordFrequencySimilarity: wordFreqScore.toFixed(2),
                avgSimilarity: ((similarity + wordFreqScore) / 2).toFixed(2)
            };
        });

        // Sort by highest similarity
        matches.sort((a, b) => b.avgSimilarity - a.avgSimilarity);

        res.json({ 
            document: {
                id: document.id,
                filename: document.filename,
                content: document.content,
                match_rate: document.match_rate,
                fileSize: document.fileSize,
                upload_date: document.upload_date,
                user_id: document.user_id
            },
            matches 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.getDocumentsByUserId = async (req, res) => {
    try {
        const userId = req.params.userId;
        const documents = await getDocumentsByUser(userId);
        const credits = await checkCredits(userId);
        // console.log(documents)
        res.json({ documents, credits });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}