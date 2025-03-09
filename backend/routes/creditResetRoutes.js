const express = require('express');
const router = express.Router();
const { resetDailyCredits, resetUserCredits, checkCreditReset } = require('../controllers/creditResetController');
const { verifyToken } = require('../middleware/authMiddleware');

// Route to reset all users' credits (can be triggered by a cron job)
router.post('/reset-all', resetDailyCredits);

// Route to manually reset a specific user's credits (admin only)
router.post('/reset-user', verifyToken, resetUserCredits);

// Route to check and reset credits for the current user if needed
router.get('/check-reset', verifyToken, checkCreditReset);

module.exports = router;