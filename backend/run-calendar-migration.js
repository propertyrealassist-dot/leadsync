const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || './data/leadsync.db';
const db = new Database(dbPath);

console.log('📦 Running calendar tables migration (SQLite)...');

const migration = fs.readFileSync('migrations/009_create_calendar_tables.sqlite.sql', 'utf8');

// Split by semicolons and execute each statement
const statements = migration.split(';').filter(s => s.trim());

for (const statement of statements) {
  if (statement.trim()) {
    try {
      db.exec(statement);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.error('Error executing statement:', err.message);
        console.error('Statement:', statement.substring(0, 100));
      }
    }
  }
}

console.log('✅ Calendar tables created successfully!');

// Verify tables were created
const tables = db.prepare(`
  SELECT name FROM sqlite_master
  WHERE type='table'
  AND name IN ('calendar_connections', 'appointments', 'calendar_settings', 'appointment_types')
`).all();

console.log('\n✅ Created tables:');
tables.forEach(table => {
  console.log(`   - ${table.name}`);
});

db.close();
