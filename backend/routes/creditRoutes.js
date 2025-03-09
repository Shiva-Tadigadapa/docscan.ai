const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Deduct one credit from user
const deductCredit = async (userId) => {
    // First update the credits
    const updateStmt = db.prepare(`
        UPDATE user_credits  
        SET credits = credits - 1 
        WHERE user_id = ? AND credits > 0
    `);
    const updateResult = updateStmt.run(userId);

    // Then get the updated credit count
    if (updateResult.changes > 0) {
        const getStmt = db.prepare('SELECT credits FROM user_credits WHERE user_id = ?');  // <- Table name is here too
        return getStmt.get(userId);
    }
    return null;
};

// Check if user has enough credits
const checkCredits = async (userId) => {
    const stmt = db.prepare('SELECT credits FROM user_credits WHERE user_id = ?');
    return stmt.get(userId);
};

// Middleware to check and deduct credits
const handleCreditDeduction = async (req, res, next) => {
    try {
        const userId = req.headers.userid;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Check current credits
        const creditInfo = await checkCredits(userId);
        if (!creditInfo || creditInfo.credits <= 0) {
            return res.status(403).json({ 
                error: "Insufficient credits",
                credits: creditInfo ? creditInfo.credits : 0
            });
        }

        // Deduct credit
        const result = await deductCredit(userId);
        if (!result) {
            return res.status(400).json({ error: "Failed to deduct credit" });
        }

        // Add remaining credits to request for later use
        req.remainingCredits = result.credits;
        next();
    } catch (error) {
        console.error("Credit deduction error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Add this new export
module.exports = {
    handleCreditDeduction,
    deductCredit,  // Export the deductCredit function
    checkCredits
};

