const db = require("../config/db");

function initializeDatabase() {
  // Create users table
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Create refresh tokens table
  const createRefreshTokensTable = `
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `;
  
  // Create user roles table
  const createUserRolesTable = `
    CREATE TABLE IF NOT EXISTS user_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `;
  
  // Create user credits table
  const createUserCreditsTable = `
    CREATE TABLE IF NOT EXISTS user_credits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      credits INTEGER NOT NULL DEFAULT 20,
      last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `;
  
  // Create credit requests table
  const createCreditRequestsTable = `
    CREATE TABLE IF NOT EXISTS credit_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      requested_amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_id INTEGER,
      request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      response_date DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE SET NULL
    );
  `;

  // Create scans table
  const createScansTable = `
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      scan_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `;

  // Create credits issued table
  const createCreditsIssuedTable = `
    CREATE TABLE IF NOT EXISTS credits_issued (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      credits INTEGER NOT NULL,
      issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `;

  // Create admins table
  const createAdminTable = `
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `;

  // Create admin credit requests view
  const createAdminCreditRequestsView = `
    CREATE VIEW IF NOT EXISTS admin_credit_requests AS
    SELECT 
      cr.id as request_id,
      cr.user_id,
      u.name as user_name,
      u.email as user_email,
      cr.requested_amount,
      cr.status,
      cr.request_date,
      cr.response_date,
      cr.admin_id,
      a.name as admin_name
    FROM credit_requests cr
    LEFT JOIN users u ON cr.user_id = u.id
    LEFT JOIN users a ON cr.admin_id = a.id
    ORDER BY cr.request_date DESC;
  `;

  // Create total scans view
  const createTotalScansView = `
    CREATE VIEW IF NOT EXISTS total_scans AS
    SELECT COUNT(*) as total_scans FROM scans;
  `;

  // Create total credit requests view
  const createTotalCreditRequestsView = `
    CREATE VIEW IF NOT EXISTS total_credit_requests AS
    SELECT COUNT(*) as total_credit_requests FROM credit_requests;
  `;

  // Create today's credit requests view
  const createTodaysCreditRequestsView = `
    CREATE VIEW IF NOT EXISTS todays_credit_requests AS
    SELECT COUNT(*) as todays_credit_requests 
    FROM credit_requests 
    WHERE DATE(request_date) = DATE('now');
  `;

  // Create total users view
  const createTotalUsersView = `
    CREATE VIEW IF NOT EXISTS total_users AS
    SELECT COUNT(*) as total_users FROM users;
  `;

  // Create total credits issued view
  const createTotalCreditsIssuedView = `
    CREATE VIEW IF NOT EXISTS total_credits_issued AS
    SELECT SUM(credits) as total_credits_issued FROM credits_issued;
  `;

  // Create scans per user view
  const createScansPerUserView = `
    CREATE VIEW IF NOT EXISTS scans_per_user AS
    SELECT u.id, u.name, COUNT(s.id) as total_scans
    FROM users u
    LEFT JOIN scans s ON u.id = s.user_id
    GROUP BY u.id, u.name;
  `;


  // Create credit reset logs table
  const createCreditResetLogsTable = `
    CREATE TABLE IF NOT EXISTS credit_reset_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reset_date DATE NOT NULL,
      users_affected INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Create admin actions table
  const createAdminActionsTable = `
    CREATE TABLE IF NOT EXISTS admin_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      target_user_id INTEGER,
      action_date DATETIME NOT NULL,
      details TEXT,
      FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (target_user_id) REFERENCES users (id) ON DELETE SET NULL
    );
  `;
  // Create indexes for faster lookups
  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens (token);
    CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
    CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits (user_id);
    CREATE INDEX IF NOT EXISTS idx_credit_requests_user_id ON credit_requests (user_id);
    CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans (user_id);
    CREATE INDEX IF NOT EXISTS idx_credits_issued_user_id ON credits_issued (user_id);
  `;

  // Create default admin user and assign roles
  const createDefaultAdmin = `
    INSERT OR IGNORE INTO users (name, email, password) 
    VALUES ('Admin User', 'admin@cathago.com', 'Admin@123');
  `;

  const assignAdminRole = `
    INSERT OR IGNORE INTO user_roles (user_id, role)
    SELECT id, 'admin' FROM users WHERE email = 'admin@cathago.com';
  `;

  const createAdminEntry = `
    INSERT OR IGNORE INTO admins (user_id)
    SELECT id FROM users WHERE email = 'admin@cathago.com';
  `;
  // Create documents table
  const createDocumentsTable = `
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      content TEXT,
      match_rate REAL DEFAULT 0,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `;

  // Create recent document matches view
  const createRecentDocumentMatchesView = `
    CREATE VIEW IF NOT EXISTS recent_document_matches AS
    SELECT 
      d.id,
      d.filename,
      d.file_size,
      u.name as uploaded_by,
      d.upload_date,
      d.match_rate,
      (SELECT COUNT(*) FROM documents WHERE match_rate > 0) as match_count
    FROM documents d
    JOIN users u ON d.user_id = u.id
    WHERE d.match_rate > 0
    ORDER BY d.upload_date DESC;
  `;

 
    
    
    // ... rest of the code ...
    try {
    db.exec(createDocumentsTable);
    console.log("✅ Documents table created successfully.");
    
    db.exec(createRecentDocumentMatchesView);
    console.log("✅ Recent document matches view created successfully.");
    // Execute all the SQL statements
    db.exec(createUsersTable);
    console.log("✅ Users table created successfully.");
    
    db.exec(createRefreshTokensTable);
    console.log("✅ Refresh tokens table created successfully.");
    
    db.exec(createUserRolesTable);
    console.log("✅ User roles table created successfully.");
    
    db.exec(createUserCreditsTable);
    console.log("✅ User credits table created successfully.");
    
    db.exec(createCreditRequestsTable);
    console.log("✅ Credit requests table created successfully.");
    
    db.exec(createScansTable);
    console.log("✅ Scans table created successfully.");
    
    db.exec(createCreditsIssuedTable);
    console.log("✅ Credits issued table created successfully.");
    
    db.exec(createAdminTable);
    console.log("✅ Admin table created successfully.");
    
    db.exec(createAdminCreditRequestsView);
    console.log("✅ Admin credit requests view created successfully.");
    
    db.exec(createTotalScansView);
    console.log("✅ Total scans view created successfully.");
    
    db.exec(createTotalCreditRequestsView);
    console.log("✅ Total credit requests view created successfully.");
    
    db.exec(createTodaysCreditRequestsView);
    console.log("✅ Today's credit requests view created successfully.");
    
    db.exec(createTotalUsersView);
    console.log("✅ Total users view created successfully.");
    
    db.exec(createTotalCreditsIssuedView);
    console.log("✅ Total credits issued view created successfully.");
    
    db.exec(createScansPerUserView);
    console.log("✅ Scans per user view created successfully.");
    
    db.exec(createIndexes);
    console.log("✅ Indexes created successfully.");

    // Create default admin user and assign roles
    db.exec(createDefaultAdmin);
    db.exec(assignAdminRole);
    db.exec(createAdminEntry);
    db.exec(createCreditResetLogsTable);
    db.exec(createAdminActionsTable);
    console.log("✅ Default admin user created successfully.");



  } catch (error) {
    console.error("❌ Error initializing database:", error.message);
    throw error;
  }
}

initializeDatabase();
