const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../data/leadsync.db');
const db = new Database(dbPath);

console.log('🚀 Starting database migration...');

try {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      api_key TEXT UNIQUE NOT NULL,
      client_id TEXT UNIQUE NOT NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Users table created');

  // Add user_id to templates table if not exists
  const templateColumns = db.pragma('table_info(templates)');
  const hasUserId = templateColumns.some(col => col.name === 'user_id');
  
  if (!hasUserId) {
    db.exec(`ALTER TABLE templates ADD COLUMN user_id INTEGER DEFAULT 1`);
    console.log('✅ Added user_id to templates table');
  }

  // Add user_id to conversations table if not exists
  const conversationColumns = db.pragma('table_info(conversations)');
  const hasUserIdConv = conversationColumns.some(col => col.name === 'user_id');
  
  if (!hasUserIdConv) {
    db.exec(`ALTER TABLE conversations ADD COLUMN user_id INTEGER DEFAULT 1`);
    console.log('✅ Added user_id to conversations table');
  }

  console.log('🎉 Migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}