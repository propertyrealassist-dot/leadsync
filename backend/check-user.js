const Database = require('better-sqlite3');
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'data', 'leadsync.db');
const db = new Database(dbPath);

console.log('Connected to database:', dbPath);
console.log('\n=== ALL USERS IN DATABASE ===\n');

const users = db.prepare(`
  SELECT id, email, first_name, last_name, company_name, plan_type, created_at
  FROM users
  ORDER BY created_at DESC
`).all();

users.forEach((user, index) => {
  console.log(`User ${index + 1}:`);
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  First Name:', user.first_name);
  console.log('  Last Name:', user.last_name);
  console.log('  Company:', user.company_name);
  console.log('  Plan:', user.plan_type);
  console.log('  Created:', user.created_at);
  console.log('');
});

console.log(`Total users: ${users.length}`);

db.close();
