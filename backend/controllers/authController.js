const UserModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AdminModel = require("../models/adminModel");
const db = require("../config/db"); // Add this line to import the db

// Load environment variables
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "your_access_token_secret";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "your_refresh_token_secret";

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = UserModel.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const result = UserModel.createUser(name, email, hashedPassword);
    const userId = result.lastInsertRowid;
    
    // Generate tokens
    const accessToken = jwt.sign(
      { userId, email, role: "user" },
      ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );
    
    const refreshToken = jwt.sign(
      { userId, email, role: "user" },
      REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // Store refresh token in database
    storeRefreshToken(userId, refreshToken);
    
    // Initialize user role
    db.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, ?)").run(userId, "user");
    
    // Initialize user credits
    db.prepare("INSERT INTO user_credits (user_id, credits) VALUES (?, ?)").run(userId, 20);

    // Set refresh token in http-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "strict",
    });

    res.status(201).json({
      message: "User registered successfully",
      user: { id: userId, name, email },
      accessToken,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

 

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login request received",email,password)

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // First check if it's an admin email
    const isUserAdmin = await AdminModel.isAdmin(email);
    console.log("isUserAdmin",isUserAdmin)

    if (isUserAdmin) {
      // Admin authentication flow
      const adminDetails = AdminModel.getAdminDetails(email);
      if (!adminDetails) {
        return res.status(401).json({ error: "Invalid admin credentials" });
      }

      const tokenPayload = {
        userId: adminDetails.id,
        email: adminDetails.email,
        role: 'admin',
        adminId: adminDetails.id
      };

      const accessToken = jwt.sign(tokenPayload, ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
      const refreshToken = jwt.sign(tokenPayload, REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

      // Store refresh token and set cookie
      storeRefreshToken(adminDetails.id, refreshToken);
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "strict",
      });

      return res.json({
        message: "Admin login successful",
        user: {
          id: adminDetails.id,
          name: adminDetails.name,
          email: adminDetails.email,
          role: 'admin'
        },
        admin: adminDetails,
        accessToken
      });

    } else {
      // Regular user authentication flow
      const user = UserModel.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify password for regular users
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: 'user'
      };

      const accessToken = jwt.sign(tokenPayload, ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
      const refreshToken = jwt.sign(tokenPayload, REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

      // Store refresh token and set cookie
      storeRefreshToken(user.id, refreshToken);
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "strict",
      });

      return res.json({
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: 'user'
        },
        accessToken
      });
    }

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

 

exports.refreshToken = (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token not found" });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    
    // Check if token exists in database
    const storedToken = findRefreshToken(decoded.userId, refreshToken);
    if (!storedToken) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ accessToken });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(403).json({ error: "Invalid refresh token" });
  }
};

exports.logout = (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (refreshToken) {
    try {
      // Verify token to get userId
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
      
      // Remove refresh token from database
      removeRefreshToken(decoded.userId, refreshToken);
    } catch (error) {
      // Even if token verification fails, we still want to remove the cookie
      console.error("Logout error:", error);
    }
  }

  // Clear refresh token cookie
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
};

// Helper functions for refresh token management
function storeRefreshToken(userId, token) {
  try {
    const stmt = db.prepare(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+7 days'))"
    );
    stmt.run(userId, token);
  } catch (error) {
    console.error("Error storing refresh token:", error);
    throw error;
  }
}

function findRefreshToken(userId, token) {
  try {
    const stmt = db.prepare(
      "SELECT * FROM refresh_tokens WHERE user_id = ? AND token = ? AND expires_at > datetime('now')"
    );
    return stmt.get(userId, token);
  } catch (error) {
    console.error("Error finding refresh token:", error);
    return null;
  }
}

function removeRefreshToken(userId, token) {
  try {
    const stmt = db.prepare(
      "DELETE FROM refresh_tokens WHERE user_id = ? AND token = ?"
    );
    stmt.run(userId, token);
  } catch (error) {
    console.error("Error removing refresh token:", error);
    throw error;
  }
}