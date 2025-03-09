const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");
const dahsboardController = require("../controllers/dashboardController");

const db = require("../config/db");

// Admin authentication routes
router.get("/verify", verifyToken, verifyAdmin, (req, res) => {
    res.status(200).json({ message: "Admin verified successfully" });
});


router.get("/stats",dahsboardController.getDashboardData)
// // Admin user management routes
// router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
//     try {
//         const users = await db.query("SELECT * FROM users");
//         res.status(200).json(users.rows);
//     } catch (error) {
//         res.status(500).json({ error: "Failed to fetch users" });
//     }
// });

// // Admin dashboard statistics
// router.get("/stats", verifyToken, verifyAdmin, async (req, res) => {
//     try {
//         const userCount = await db.query("SELECT COUNT(*) FROM users");
//         const activeUsers = await db.query("SELECT COUNT(*) FROM users WHERE status = 'active'");
        
//         res.status(200).json({
//             totalUsers: userCount.rows[0].count,
//             activeUsers: activeUsers.rows[0].count
//         });
//     } catch (error) {
//         res.status(500).json({ error: "Failed to fetch statistics" });
//     }
// });

module.exports = router;
