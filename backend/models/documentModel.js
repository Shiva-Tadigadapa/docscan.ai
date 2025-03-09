const db = require('../config/db');

// Drop existing table if exists and recreate
// db.prepare(`DROP TABLE IF EXISTS documents`).run();

// Create Documents table
db.prepare(`
    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        fileSize INTEGER NOT NULL,
        content TEXT NOT NULL,
        match_rate REAL DEFAULT 0.0,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`).run();

// Function to save a document
const saveDocument = (userId, filename, content) => {
    const stmt = db.prepare(`
        INSERT INTO documents (user_id, filename, content, fileSize) 
        VALUES (?, ?, ?, ?)
    `);
    const fileSize = Buffer.from(content).length; // Calculate file size from content
    return stmt.run(userId, filename, content, fileSize).lastInsertRowid;
};

// Function to fetch all documents by user ID
const getDocumentsByUser = (userId) => {
    const stmt = db.prepare(`SELECT * FROM documents WHERE user_id = ?`);
    return stmt.all(userId);
};
const getDocumentById = (id) => {
    const stmt = db.prepare(`SELECT * FROM documents WHERE id = ?`);
    return stmt.get(id);
};
// Function to update match rate for a document
const updateMatchRate = (docId, matchRate) => {
    const stmt = db.prepare(`
        UPDATE documents 
        SET match_rate = ? 
        WHERE id = ?
    `);
    return stmt.run(matchRate, docId);
};




module.exports = { saveDocument, getDocumentsByUser, getDocumentById ,updateMatchRate};
