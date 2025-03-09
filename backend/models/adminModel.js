const db = require('../config/db');

// Get all credit requests for admin dashboard
const getCreditRequests = () => {
    const stmt = db.prepare(`
        SELECT 
            cr.id,
            cr.user_id,
            u.name as user_name,
            u.email as user_email,
            cr.requested_amount,
            cr.status,
            cr.request_date,
            cr.response_date,
            cr.reason
        FROM credit_requests cr
        JOIN users u ON cr.user_id = u.id
        ORDER BY cr.request_date DESC
    `);
    return stmt.all();
};

// Update credit request status and handle credits
const handleCreditRequest = (requestId, status) => {
    const db_transaction = db.transaction((requestId, status) => {
        // Get request details first
        const request = db.prepare('SELECT * FROM credit_requests WHERE id = ?').get(requestId);
        if (!request) throw new Error('Request not found');

        // Update request status
        db.prepare(`
            UPDATE credit_requests 
            SET status = ?, 
                response_date = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(status, requestId);

        // If approved, add credits to user
        if (status === 'approved') {
            db.prepare(`
                UPDATE user_credits 
                SET credits = credits + ? 
                WHERE user_id = ?
            `).run(request.requested_amount, request.user_id);
            
            // Record the credits issued
            db.prepare(`
                INSERT INTO credits_issued (user_id, credits, issue_date)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `).run(request.user_id, request.requested_amount);
        }

        return true;
    });

    return db_transaction(requestId, status);
};

// Check if user is admin
const isAdmin = (email) => {
    const stmt = db.prepare(`
        SELECT a.id 
        FROM admins a
        JOIN users u ON a.user_id = u.id
        JOIN user_roles ur ON u.id = ur.user_id
        WHERE u.email = ? AND ur.role = 'admin'
    `);
    return stmt.get(email) !== undefined;
};

// Get admin details
const getAdminDetails = (email) => {
    const stmt = db.prepare(`
        SELECT u.id, u.name, u.email 
        FROM users u
        JOIN admins a ON u.id = a.user_id
        WHERE u.email = ?
    `);
    return stmt.get(email);
};

// Get dashboard statistics
const getDashboardStats = () => {
    // Get total users
    const totalUsers = db.prepare('SELECT total_users FROM total_users').get();
    
    // Get new users this week
    const newUsersThisWeek = db.prepare(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE created_at >= datetime('now', '-7 days')
    `).get();
    
    // Get credit requests
    const creditRequests = db.prepare('SELECT total_credit_requests FROM total_credit_requests').get();
    
    // Get today's credit requests
    const todaysCreditRequests = db.prepare('SELECT todays_credit_requests FROM todays_credit_requests').get();
    
    // Get total documents
    const totalDocuments = db.prepare('SELECT COUNT(*) as count FROM documents').get();
    
    // Get new documents this week
    const newDocumentsThisWeek = db.prepare(`
        SELECT COUNT(*) as count 
        FROM documents 
        WHERE upload_date >= datetime('now', '-7 days')
    `).get();
    
    // Get total credits issued
    const totalCreditsIssued = db.prepare('SELECT total_credits_issued FROM total_credits_issued').get();
    
    return {
        totalUsers: totalUsers?.total_users || 0,
        newUsersThisWeek: newUsersThisWeek?.count || 0,
        creditRequests: creditRequests?.total_credit_requests || 0,
        todaysCreditRequests: todaysCreditRequests?.todays_credit_requests || 0,
        totalDocuments: totalDocuments?.count || 0,
        newDocumentsThisWeek: newDocumentsThisWeek?.count || 0,
        totalCreditsIssued: totalCreditsIssued?.total_credits_issued || 0
    };
};

// Get pending credit requests
// Get pending credit requests
const getPendingCreditRequests = (limit = 5) => {
    const stmt = db.prepare(`
        SELECT 
            cr.id,
            cr.user_id,
            u.name as user_name,
            u.email as user_email,
            cr.requested_amount,
            cr.request_date
        FROM credit_requests cr
        JOIN users u ON cr.user_id = u.id
        WHERE cr.status = 'pending'
        ORDER BY cr.request_date DESC
        LIMIT ?
    `);
    return stmt.all(limit);
};

// Get top users by scan count
const getTopUsersByScanCount = (limit = 5) => {
    const stmt = db.prepare(`
        SELECT 
            u.id,
            u.name,
            COUNT(s.id) as total_scans,
            (SELECT COUNT(*) FROM scans WHERE user_id = u.id AND scan_date >= datetime('now', 'start of day')) as scans_today,
            uc.credits as credits_left
        FROM users u
        LEFT JOIN scans s ON u.id = s.user_id
        LEFT JOIN user_credits uc ON u.id = uc.user_id
        GROUP BY u.id
        ORDER BY total_scans DESC
        LIMIT ?
    `);
    return stmt.all(limit);
};
 
// Get recent document matches
// Get recent document matches
const getRecentDocumentMatches = (limit = 5) => {
    const stmt = db.prepare(`
        SELECT 
            d.id,
            d.filename,
            LENGTH(d.content) as file_size,
            u.name as uploaded_by,
            datetime(d.upload_date, 'localtime') as upload_date,
            ROUND(COALESCE(d.match_rate, 0), 2) as max_match_rate,
            (SELECT COUNT(*) FROM documents WHERE match_rate > 0) as match_count
        FROM documents d
        JOIN users u ON d.user_id = u.id
        WHERE d.match_rate IS NOT NULL
        ORDER BY d.upload_date DESC
        LIMIT ?
    `);
    return stmt.all(limit);
};
module.exports = {
    getCreditRequests,
    handleCreditRequest,
    isAdmin,
    getAdminDetails,
    getDashboardStats,
    getPendingCreditRequests,
    getTopUsersByScanCount,
    getRecentDocumentMatches
};