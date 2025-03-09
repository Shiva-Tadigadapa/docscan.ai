const adminModel = require('../models/adminModel');

// Get all dashboard data
const getDashboardData = (req, res) => {
    try {
        // Get all required dashboard data
        const stats = adminModel.getDashboardStats();
        const pendingRequests = adminModel.getPendingCreditRequests(5);
        const topUsers = adminModel.getTopUsersByScanCount(5);
        const recentMatches = adminModel.getRecentDocumentMatches(5);

        // Format the data for frontend consumption 
        const formattedPendingRequests = pendingRequests?.map(req => ({
            id: req.id,
            user: {
                id: req.user_id,
                name: req.user_name,
                email: req.user_email,
                initials: req.user_name.split(' ').map(n => n[0]).join('')
            },
            requestedAmount: req.requested_amount,
            requestDate: new Date(req.request_date + 'Z').toISOString(),
            timeAgo: getTimeAgo(new Date(req.request_date + 'Z'))
        })) || [];

        const formattedTopUsers = topUsers?.map(user => ({
            id: user.id,
            name: user.name,
            initials: user.name.split(' ').map(n => n[0]).join(''),
            scansToday: user.scans_today,
            totalScans: user.total_scans,
            creditsLeft: user.credits_left
        })) || [];

        const formattedRecentMatches = recentMatches?.map(match => ({
            id: match.id,
            filename: match.filename,
            fileSize: formatFileSize(match.file_size),
            uploadedBy: match.uploaded_by,
            uploadDate: formatDate(new Date(match.upload_date)),
            matchCount: match.match_count,
            matchRate: match.max_match_rate
        })) || [];

        res.json({
            success: true,
            data: {
                stats: {
                    totalUsers: stats.totalUsers,
                    newUsersThisWeek: stats.newUsersThisWeek,
                    creditRequests: stats.creditRequests,
                    todaysCreditRequests: stats.todaysCreditRequests,
                    totalDocuments: stats.totalDocuments,
                    newDocumentsThisWeek: stats.newDocumentsThisWeek,
                    totalCreditsIssued: stats.totalCreditsIssued
                },
                pendingRequests: formattedPendingRequests,
                topUsers: formattedTopUsers,
                recentMatches: formattedRecentMatches
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: error.message
        });
    }
};

// Handle credit request approval/denial
const handleCreditRequest = (req, res) => {
    try {
        const { requestId, status } = req.body;
        
        if (!requestId || !status || !['approved', 'denied'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request parameters'
            });
        }
        
        adminModel.handleCreditRequest(requestId, status);
        
        res.json({
            success: true,
            message: `Credit request ${status} successfully`
        });
    } catch (error) {
        console.error('Error handling credit request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to handle credit request',
            error: error.message
        });
    }
};

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Helper function to format date
function formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }
}

// Helper function to get time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return Math.floor(seconds) + ' seconds ago';
}

module.exports = {
    getDashboardData,
    handleCreditRequest
};