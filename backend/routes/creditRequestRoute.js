const express = require('express');
const router = express.Router();
const { submitCreditRequest, getAdminCreditRequests, processCreditRequest } = require('../controllers/creditRequestController');
const { verifyToken ,verifyAdmin} = require('../middleware/authMiddleware');

// Submit a credit request
router.post('/request', verifyToken, submitCreditRequest);

// Admin routes
router.get('/admin/requests', verifyToken,verifyAdmin, getAdminCreditRequests);
router.post('/admin/process', verifyToken,verifyAdmin, processCreditRequest);

module.exports = router;