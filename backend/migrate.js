const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('./leadsync.db');

console.log('🔄 Running database migrations...');

const migrationsDir = path.join(__dirname, 'migrations');
const migrations = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

migrations.forEach(file => {
  console.log(`📄 Applying: ${file}`);
  const migration = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  try {
    db.exec(migration);
    console.log(`✅ Applied: ${file}`);
  } catch (error) {
    console.error(`❌ Failed: ${file}`, error.message);
  }
});

console.log('✅ All migrations completed!');
db.close();
