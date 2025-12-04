const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'leadsync.db');
const db = new Database(dbPath);

console.log('📋 Users table schema:\n');

const schema = db.pragma('table_info(users)');
schema.forEach(col => {
  console.log(`  ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}`);
});

console.log('\n📊 Sample user data:\n');
const users = db.prepare('SELECT * FROM users LIMIT 1').all();
if (users.length > 0) {
  console.log('Columns:', Object.keys(users[0]).join(', '));
}

db.close();
