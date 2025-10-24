const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || './data/appointwise.db';
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

module.exports = db;