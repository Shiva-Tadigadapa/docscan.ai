const getDocumentsByUser = (userId) => {
    const stmt = db.prepare(`SELECT * FROM documents WHERE user_id = ?`);
    return stmt.all(5);
};