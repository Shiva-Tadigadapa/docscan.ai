const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");
const db = require("../config/db");

// Auth routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);
router.get("/verify", verifyToken, (req, res) => {
  res.status(200).json({ message: "user verified successfully" });
});


// Protected routes
router.get("/profile", verifyToken, (req, res) => {
  try {
    const user = db.prepare("SELECT id, name, email, created_at FROM users WHERE id = ?").get(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Get user credits
    const userCredits = db.prepare("SELECT credits, last_reset_date FROM user_credits WHERE user_id = ?").get(user.id);
    
    // Get user scan history
    const scanHistory = db.prepare("SELECT * FROM document_scans WHERE user_id = ? ORDER BY created_at DESC LIMIT 10").all(user.id);
    
    res.json({
      user,
      credits: userCredits || { credits: 20, last_reset_date: new Date().toISOString().split('T')[0] },
      scanHistory: scanHistory || []
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin routes
router.get("/users", verifyToken, (req, res) => {
  try {
    const users = db.prepare("SELECT id, name, email, created_at FROM users").all();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;