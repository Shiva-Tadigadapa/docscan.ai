CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Create credit reset logs table
CREATE TABLE IF NOT EXISTS credit_reset_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reset_date DATE NOT NULL,
  users_affected INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create admin actions table for tracking manual resets
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