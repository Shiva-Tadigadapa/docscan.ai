const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "your_access_token_secret";

// Middleware to verify JWT token
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(403).json({ error: "Invalid token" });
  }
};

// Middleware to verify admin role
exports.verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin privileges required." });
  }
  next();
};

// Middleware to check if user has enough credits
exports.verifyCredits = (req, res, next) => {
  const userId = req.user.userId;
  
  // Implement your credit checking logic here
  // This is just a placeholder
  const userCredits = getUserCredits(userId);
  
  if (userCredits <= 0) {
    return res.status(403).json({ 
      error: "Insufficient credits. Please request more credits or wait until tomorrow." 
    });
  }
  
  next();
};

// Helper function to get user credits (placeholder)
function getUserCredits(userId) {
  // This should be replaced with actual DB query
  // For now, returning a placeholder value
  return 10;
}