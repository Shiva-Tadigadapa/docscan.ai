const Database = require('better-sqlite3');
const path = require('path');

// Define database file path
const dbPath = path.join(__dirname, '../../database.sqlite');

// Connect to SQLite database
const db = new Database(dbPath, { verbose: console.log });

console.log('✅ SQLite database connected successfully.');

module.exports = db;
