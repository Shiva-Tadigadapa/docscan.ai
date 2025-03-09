const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const db = require("./config/db.js");
const app = express();

// Ensure DB initializes on startup
require('./config/db.js'); 
require("dotenv").config();

// Import routes
const scanRoutes = require("./routes/scanRoutes.js");
const authRoutes = require("./routes/authRoutes.js");
const creditRoutes = require("./routes/creditRoutes.js");
const adminRoutes = require("./routes/adminRoutes.js"); // Add admin routes
const creditRequestRoutes = require("./routes/creditRequestRoute.js");
const creditResetRoutes = require('./routes/creditResetRoutes.js');
// Initialize database
require("./migrations/initDB.js");

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





// module.exports = app;