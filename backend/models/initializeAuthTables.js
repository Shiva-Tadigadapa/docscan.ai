// const db = require("../config/db");

// function initializeAuthTables() {
//   // Create refresh tokens table
//   const createRefreshTokensTable = `
//     CREATE TABLE IF NOT EXISTS refresh_tokens (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       user_id INTEGER NOT NULL,
//       token TEXT NOT NULL,
//       expires_at DATETIME NOT NULL,
//       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//       FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
//     );
//   `;
  
//   // Create user roles table
//   const createUserRolesTable = `
//     CREATE TABLE IF NOT EXISTS user_roles (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       user_id INTEGER NOT NULL,
//       role TEXT NOT NULL DEFAULT 'user',
//       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//       FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
//     );
//   `;
  
//   // Create user credits table
//   const createUserCreditsTable = `
//     CREATE TABLE IF NOT EXISTS user_credits (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       user_id INTEGER NOT NULL,
//       credits INTEGER NOT NULL DEFAULT 20,
//       last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
//       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//       FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
//     );
//   `;
  
//   // Create credit requests table
//   const createCreditRequestsTable = `
//     CREATE TABLE IF NOT EXISTS credit_requests (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       user_id INTEGER NOT NULL,
//       requested_amount INTEGER NOT NULL,
//       status TEXT NOT NULL DEFAULT 'pending',
//       admin_id INTEGER,
//       request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
//       response_date DATETIME,
//       FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
//       FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE SET NULL
//     );
//   `;

//   // Create indexes for faster lookups
//   const createIndexes = `
//     CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
//     CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens (token);
//     CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
//     CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits (user_id);
//     CREATE INDEX IF NOT EXISTS idx_credit_requests_user_id ON credit_requests (user_id);
//   `;

//   try {
//     // Execute all the SQL statements
//     db.exec(createRefreshTokensTable);
//     console.log("✅ Refresh tokens table created successfully.");
    
//     db.exec(createUserRolesTable);
//     console.log("✅ User roles table created successfully.");
    
//     db.exec(createUserCreditsTable);
//     console.log("✅ User credits table created successfully.");
    
//     db.exec(createCreditRequestsTable);
//     console.log("✅ Credit requests table created successfully.");
    
//     db.exec(createIndexes);
//     console.log("✅ Indexes created successfully.");
//   } catch (error) {
//     console.error("❌ Error initializing auth tables:", error.message);
//     throw error;
//   }
// }

// module.exports = initializeAuthTables;