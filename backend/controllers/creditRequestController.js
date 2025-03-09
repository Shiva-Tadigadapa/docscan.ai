const db = require('../config/db');
const { checkCredits } = require('../routes/creditRoutes');

// Submit a credit request
const submitCreditRequest = async (req, res) => {
    try {
        const { requestedAmount, reason } = req.body;
        const userId = req.user.userId; // Assuming this is set by your auth middleware
        
        // Validate requested amount
        if (!requestedAmount || isNaN(requestedAmount) || requestedAmount <= 0 || requestedAmount > 20) {
            return res.status(400).json({ 
                success: false, 
                error: "Requested amount must be between 1 and 20 credits" 
            });
        }
        
        // Check if user already has a pending request
        const pendingRequestStmt = db.prepare(`
            SELECT COUNT(*) as count FROM credit_requests 
            WHERE user_id = ? AND status = 'pending'
        `);
        const pendingResult = pendingRequestStmt.get(userId);
        
        if (pendingResult.count > 0) {
            return res.status(400).json({ 
                success: false, 
                error: "You already have a pending credit request" 
            });
        }
        
        // Check current credits to ensure user doesn't exceed maximum
        const creditInfo = await checkCredits(userId);
        const currentCredits = creditInfo ? creditInfo.credits : 0;
        const maxPossibleCredits = 20; // Maximum credits a user can have
        
        if (currentCredits + requestedAmount > maxPossibleCredits) {
            return res.status(400).json({ 
                success: false, 
                error: `You can only request up to ${maxPossibleCredits - currentCredits} credits` 
            });
        }
        
        // Insert credit request
        const insertStmt = db.prepare(`
            INSERT INTO credit_requests (user_id, requested_amount, status, request_date)
            VALUES (?, ?, 'pending', CURRENT_TIMESTAMP)
        `);
        
        const result = insertStmt.run(userId, requestedAmount);
        
        if (result.changes > 0) {
            // Get count of pending requests for this user
            const countStmt = db.prepare(`
                SELECT COUNT(*) as count FROM credit_requests 
                WHERE user_id = ? AND status = 'pending'
            `);
            const countResult = countStmt.get(userId);
            
            return res.status(200).json({ 
                success: true, 
                message: "Credit request submitted successfully",
                pendingRequests: countResult.count
            });
        } else {
            return res.status(500).json({ 
                success: false, 
                error: "Failed to submit credit request" 
            });
        }
    } catch (error) {
        console.error("Credit request error:", error);
        return res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

// Get all credit requests for admin
const getAdminCreditRequests = async (req, res) => {
    try {
        // Verify admin role (assuming middleware already checked this)
        const adminId = req.user.adminId;
        
        if (!adminId) {
            return res.status(403).json({ 
                success: false, 
                error: "Unauthorized access" 
            });
        }
        
        // Get all pending credit requests
        const requestsStmt = db.prepare(`
            SELECT * FROM admin_credit_requests
            WHERE status = 'pending'
            ORDER BY request_date DESC
        `);
        
        const requests = requestsStmt.all();
        
        return res.status(200).json({ 
            success: true, 
            requests: requests
        });
    } catch (error) {
        console.error("Admin credit requests error:", error);
        return res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

// Process (approve/deny) a credit request
const processCreditRequest = async (req, res) => {
    try {
        const { requestId, status, reason } = req.body;
        const adminId = req.user.adminId;
        
        if (!adminId) {
            return res.status(403).json({ 
                success: false, 
                error: "Unauthorized access" 
            });
        }
        
        if (!requestId || !status || (status !== 'approved' && status !== 'denied')) {
            return res.status(400).json({ 
                success: false, 
                error: "Invalid request parameters" 
            });
        }
        
        // Start a transaction
        db.prepare('BEGIN TRANSACTION').run();
        
        try {
            // Get the request details
            const requestStmt = db.prepare(`
                SELECT * FROM credit_requests 
                WHERE id = ? AND status = 'pending'
            `);
            const request = requestStmt.get(requestId);
            
            if (!request) {
                db.prepare('ROLLBACK').run();
                return res.status(404).json({ 
                    success: false, 
                    error: "Credit request not found or already processed" 
                });
            }
            
            // Update the request status
            const updateStmt = db.prepare(`
                UPDATE credit_requests 
                SET status = ?, admin_id = ?, response_date = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            updateStmt.run(status, adminId, requestId);
            
            // If approved, add credits to user
            if (status === 'approved') {
                // Add credits to user_credits
                const addCreditsStmt = db.prepare(`
                    UPDATE user_credits 
                    SET credits = credits + ?
                    WHERE user_id = ?
                `);
                addCreditsStmt.run(request.requested_amount, request.user_id);
                
                // Record in credits_issued table
                const recordIssueStmt = db.prepare(`
                    INSERT INTO credits_issued (user_id, credits, issue_date)
                    VALUES (?, ?, CURRENT_TIMESTAMP)
                `);
                recordIssueStmt.run(request.user_id, request.requested_amount);
            }
            
            // Commit the transaction
            db.prepare('COMMIT').run();
            
            return res.status(200).json({ 
                success: true, 
                message: `Credit request ${status} successfully`
            });
        } catch (error) {
            // Rollback on error
            db.prepare('ROLLBACK').run();
            throw error;
        }
    } catch (error) {
        console.error("Process credit request error:", error);
        return res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

module.exports = {
    submitCreditRequest,
    getAdminCreditRequests,
    processCreditRequest
};