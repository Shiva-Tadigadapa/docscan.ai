const db = require('../config/db');

// Reset all users' credits to 20 at midnight
const resetDailyCredits = async (req, res) => {
    try {
        // Get current date
        const today = new Date().toISOString().split('T')[0];
        
        // Start a transaction
        db.prepare('BEGIN TRANSACTION').run();
        
        try {
            // Find users whose credits need to be reset (last_reset_date is not today)
            const usersToResetStmt = db.prepare(`
                SELECT user_id, credits FROM user_credits 
                WHERE last_reset_date < ?
            `);
            const usersToReset = usersToResetStmt.all(today);
            
            if (usersToReset.length > 0) {
                // Reset credits to 20 and update last_reset_date
                const resetStmt = db.prepare(`
                    UPDATE user_credits 
                    SET credits = 20, last_reset_date = ? 
                    WHERE last_reset_date < ?
                `);
                const result = resetStmt.run(today, today);
                
                // Log the reset in a separate table for audit purposes
                const logStmt = db.prepare(`
                    INSERT INTO credit_reset_logs (reset_date, users_affected)
                    VALUES (?, ?)
                `);
                logStmt.run(today, usersToReset.length);
                
                // Commit the transaction
                db.prepare('COMMIT').run();
                
                return res.status(200).json({
                    success: true,
                    message: `Credits reset for ${result.changes} users`,
                    usersAffected: result.changes
                });
            } else {
                // No users to reset
                db.prepare('COMMIT').run();
                
                return res.status(200).json({
                    success: true,
                    message: "No users needed credit reset",
                    usersAffected: 0
                });
            }
        } catch (error) {
            // Rollback on error
            db.prepare('ROLLBACK').run();
            throw error;
        }
    } catch (error) {
        console.error("Credit reset error:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};

// Manually reset credits for a specific user (admin only)
const resetUserCredits = async (req, res) => {
    try {
        const { userId } = req.body;
        const adminId = req.user.adminId;
        
        if (!adminId) {
            return res.status(403).json({
                success: false,
                error: "Unauthorized access"
            });
        }
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "User ID is required"
            });
        }
        
        // Get current date
        const today = new Date().toISOString().split('T')[0];
        
        // Reset credits for the specified user
        const resetStmt = db.prepare(`
            UPDATE user_credits 
            SET credits = 20, last_reset_date = ? 
            WHERE user_id = ?
        `);
        const result = resetStmt.run(today, userId);
        
        if (result.changes > 0) {
            // Log the manual reset
            const logStmt = db.prepare(`
                INSERT INTO admin_actions (admin_id, action_type, target_user_id, action_date, details)
                VALUES (?, 'credit_reset', ?, CURRENT_TIMESTAMP, 'Manual credit reset to 20')
            `);
            logStmt.run(adminId, userId);
            
            return res.status(200).json({
                success: true,
                message: "User credits reset successfully"
            });
        } else {
            return res.status(404).json({
                success: false,
                error: "User not found or credits already reset today"
            });
        }
    } catch (error) {
        console.error("Manual credit reset error:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};

// Check if credits need to be reset for the current user
const checkCreditReset = async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Get current date
        const today = new Date().toISOString().split('T')[0];
        
        // Check if user's credits need to be reset
        const checkStmt = db.prepare(`
            SELECT credits, last_reset_date FROM user_credits 
            WHERE user_id = ?
        `);
        const userCredits = checkStmt.get(userId);
        
        if (!userCredits) {
            return res.status(404).json({
                success: false,
                error: "User credits not found"
            });
        }
        
        // If last reset date is before today, reset credits
        if (userCredits.last_reset_date < today) {
            const resetStmt = db.prepare(`
                UPDATE user_credits 
                SET credits = 20, last_reset_date = ? 
                WHERE user_id = ?
            `);
            resetStmt.run(today, userId);
            
            return res.status(200).json({
                success: true,
                message: "Credits reset to 20",
                credits: 20,
                wasReset: true
            });
        } else {
            // Credits already reset today
            return res.status(200).json({
                success: true,
                message: "Credits already reset today",
                credits: userCredits.credits,
                wasReset: false
            });
        }
    } catch (error) {
        console.error("Check credit reset error:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};

module.exports = {
    resetDailyCredits,
    resetUserCredits,
    checkCreditReset
};