const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const db = require("../backend/config/db.js");
const app = express();

// Ensure DB initializes on startup
require('../backend/config/db.js'); 
require("dotenv").config();

// Import routes
const scanRoutes = require("../backend/routes/scanRoutes.js");
const authRoutes = require("../backend/routes/authRoutes.js");
const creditRoutes = require("../backend/routes/creditRoutes.js");
const adminRoutes = require("../backend/routes/adminRoutes.js"); // Add admin routes
const creditRequestRoutes = require("../backend/routes/creditRequestRoute.js");
const creditResetRoutes = require('../backend/routes/creditResetRoutes.js');
// Initialize database
require("../backend/migrations/initDB.js");

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api", scanRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes); // Add admin routes
app.use("/api/dashboard", adminRoutes);
app.use('/api/credits', creditRequestRoutes);
app.use('/api/credits/reset', creditResetRoutes);
// app.use("/api/credits", creditRoutes);
// app.use("/api/admin", adminRoutes); // Add admin routes

// Home route
app.get("/", (req, res) => {
  res.send("hello world");
});

// Start server
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});



module.exports = app;