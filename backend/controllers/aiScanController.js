require("dotenv").config();
const { getDocumentById } = require("../models/documentModel");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Pinecone } = require("@pinecone-database/pinecone");

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
const analysisModel = genAI.getGenerativeModel({  model: "gemini-1.5-flash-8b" });

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Select the index
const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX);

// Function to get embeddings from Google Gemini
async function getTextEmbedding(inputText) {
  try {
    const result = await embeddingModel.embedContent(inputText);
    console.log("Embedding:", result);
    let embeddingValues;
    
    if (result && result.embedding && result.embedding.values) {
      embeddingValues = result.embedding.values;
    } else if (result && result.embedding) {
      embeddingValues = result.embedding;
    }
    
    if (!Array.isArray(embeddingValues)) {
      throw new Error("Embedding values is not an array");
    }
    
    return embeddingValues;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

// Function to analyze document content
async function analyzeDocumentContent(originalContent, matchContent) {
  try {
    const prompt = `
      Analyze these two text documents and provide the following metrics:
      1. Semantic Similarity: How similar the meaning and context is (as a percentage)
      2. Pattern Match: How similar the writing patterns, structure, and style are (as a percentage)
      3. Determine the similarity type that best describes the match: "Semantic", "Pattern", or "Context"
      
      Document 1:
      ${originalContent.substring(0, 1500)}
      
      Document 2:
      ${matchContent.substring(0, 1500)}
      
      Respond in JSON format like this:
      {
        "semanticSimilarity": 85,
        "patternMatch": 75,
        "similarityType": "Semantic"
      }
    `;

    const result = await analysisModel.generateContent(prompt);
    const textResult = result.response.text();
    
    // Extract JSON from the response
    const jsonMatch = textResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error("Failed to parse analysis results");
  } catch (error) {
    console.error("Content analysis error:", error);
    // Return fallback values if analysis fails
    return {
      semanticSimilarity: 70,
      patternMatch: 65,
      similarityType: "Context"
    };
  }
}

// Scan a document using AI embeddings based on document ID
exports.scanWithAI = async (req, res) => {
  
  try {
    const docId = req.params.docId;
    if (!docId) {
      return res.status(400).json({ error: "No document ID provided" });
    }
    
    // Get document from database
    const document = await getDocumentById(docId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    // Get embedding using Google Gemini
    const embedding = await getTextEmbedding(document.content);
    
    // Search Pinecone for similar documents
    const queryResponse = await pineconeIndex.query({
      vector: embedding,
      topK: 8,
      includeMetadata: true,
    });
    
    // Check if the document already exists (high similarity)
    const threshold = 0.98;
    const isDuplicate = queryResponse.matches.some(
      (match) => match.score >= threshold
    );
    
    if (!isDuplicate) {
      await pineconeIndex.upsert([
        {
          id: docId.toString(),
          values: embedding,
          metadata: {
            filename: document.filename,
            text: document.content,
            documentId: docId
          },
        },
      ]);
    }
    
    // Process matches with additional analysis
    const processedMatches = [];
    let overallConfidence = 0;
    let averageSemanticSimilarity = 0;
    let averagePatternMatch = 0;
    
    // For each match, analyze content and calculate metrics
    for (const match of queryResponse.matches) {
      const matchScore = match.score;
      let documentName = "Unnamed Document";
      let docText = "";
      
      if (match.metadata) {
        documentName = match.metadata.filename || documentName;
        docText = match.metadata.text || "";
      }
      
      // Get detailed analysis for this match
      const analysis = await analyzeDocumentContent(document.content, docText);
      
      // Calculate confidence score (weighted average of match score and analysis)
      const confidenceScore = Math.round((matchScore * 0.5 + analysis.semanticSimilarity * 0.003 + analysis.patternMatch * 0.002) * 100);
      
      // Add to overall metrics
      overallConfidence += confidenceScore;
      averageSemanticSimilarity += analysis.semanticSimilarity;
      averagePatternMatch += analysis.patternMatch;
      
      // Determine document icon based on filename extension
      let icon = "text";
      if (documentName.toLowerCase().endsWith(".pdf")) {
        icon = "pdf";
      } else if (documentName.toLowerCase().endsWith(".docx") || documentName.toLowerCase().endsWith(".doc")) {
        icon = "word";
      }
      
      processedMatches.push({
        id: match.id,
        filename: documentName,
        confidence: confidenceScore,
        type: analysis.similarityType,
        score: Math.round(matchScore * 100),
        semanticScore: analysis.semanticSimilarity,
        patternScore: analysis.patternMatch,
        icon: icon,
        metadata: match.metadata || {}
      });
    }
    
    // Calculate summary metrics
    const matchCount = processedMatches.length || 1;
    overallConfidence = Math.min(Math.round(overallConfidence / matchCount), 98);
    averageSemanticSimilarity = Math.min(Math.round(averageSemanticSimilarity / matchCount), 95);
    averagePatternMatch = Math.min(Math.round(averagePatternMatch / matchCount), 92);
    
    // Return comprehensive response with all UI elements
    res.json({
      document: {
        id: document.id,
        filename: document.filename,
        fileSize: document.fileSize
      },
      summary: {
        aiConfidenceScore: overallConfidence,
        semanticSimilarity: averageSemanticSimilarity,
        patternMatch: averagePatternMatch
      },
      matches: processedMatches,
      uploaded: !isDuplicate ? "Stored in Pinecone" : "Already exists",
    });
  } catch (error) {
    console.error("AI Scan Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get document comparison details
exports.getDocumentComparison = async (req, res) => {
  try {
    const { docId, compareId } = req.params;
    
    if (!docId || !compareId) {
      return res.status(400).json({ error: "Document IDs required" });
    }
    
    // Get both documents
    const originalDoc = await getDocumentById(docId);
    
    // Get the compared document from Pinecone
    const compareResponse = await pineconeIndex.fetch([compareId]);
    
    if (!originalDoc || !compareResponse.records[compareId]) {
      return res.status(404).json({ error: "One or both documents not found" });
    }
    
    const comparedDocData = compareResponse.records[compareId];
    const comparedDocText = comparedDocData.metadata.text || "";
    const comparedDocName = comparedDocData.metadata.filename || "Unnamed Document";
    
    // Analyze the documents for detailed comparison
    const analysis = await analyzeDocumentContent(originalDoc.content, comparedDocText);
    
    // Extract key phrases and calculate similar paragraphs
    const originalParagraphs = originalDoc.content.split(/\n\n+/).filter(p => p.trim().length > 0);
    const comparedParagraphs = comparedDocText.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    // Highlight similar paragraphs (simplified algorithm)
    const highlightedOriginal = [];
    const highlightedCompared = [];
    let similarParagraphCount = 0;
    
    for (const para of originalParagraphs) {
      let isSimilar = false;
      for (const comparePara of comparedParagraphs) {
        // Simple similarity check (would be better with embeddings)
        const similarity = calculateSimilarity(para, comparePara);
        if (similarity > 0.6) {
          isSimilar = true;
          similarParagraphCount++;
          break;
        }
      }
      
      highlightedOriginal.push({
        text: para,
        similar: isSimilar
      });
    }
    
    for (const para of comparedParagraphs) {
      let isSimilar = false;
      for (const originalPara of originalParagraphs) {
        const similarity = calculateSimilarity(para, originalPara);
        if (similarity > 0.6) {
          isSimilar = true;
          break;
        }
      }
      
      highlightedCompared.push({
        text: para,
        similar: isSimilar
      });
    }
    
    // Return comparison data
    res.json({
      originalDocument: {
        id: originalDoc.id,
        filename: originalDoc.filename,
        paragraphs: highlightedOriginal
      },
      comparedDocument: {
        id: compareId,
        filename: comparedDocName,
        paragraphs: highlightedCompared
      },
      comparisonStats: {
        overallMatch: Math.round(analysis.semanticSimilarity * 0.5 + analysis.patternMatch * 0.5),
        similarParagraphs: `${similarParagraphCount}/${Math.max(originalParagraphs.length, comparedParagraphs.length)}`,
        keyPhrases: Math.round(similarParagraphCount * 2.5) // Approximation for UI
      }
    });
    
  } catch (error) {
    console.error("Document comparison error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Simple text similarity function (Jaccard index)
function calculateSimilarity(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(word => word.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(word => word.length > 3));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}