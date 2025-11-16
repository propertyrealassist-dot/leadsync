const Database = require('better-sqlite3');
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'data', 'leadsync.db');
const db = new Database(dbPath);

console.log('Connected to database:', dbPath);

// Update the old user
const email = 'kmv736@gmail.com';
const fullName = 'Kurt Viviers'; // Or whatever name you want
const nameParts = fullName.split(' ');
const firstName = nameParts[0];
const lastName = nameParts.slice(1).join(' ');

console.log('\nUpdating user:', email);
console.log('Setting:', { firstName, lastName });

const result = db.prepare(`
  UPDATE users
  SET first_name = ?,
      last_name = ?,
      updated_at = CURRENT_TIMESTAMP
  WHERE email = ?
`).run(firstName, lastName, email.toLowerCase());

console.log('Rows updated:', result.changes);

// Verify
const user = db.prepare(`
  SELECT id, email, first_name, last_name
  FROM users
  WHERE email = ?
`).get(email.toLowerCase());

console.log('\nVerified user data:');
console.log(user);

db.close();
console.log('\n✅ Done!');
