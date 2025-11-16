const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'leadsync.db');
const db = new Database(dbPath);

console.log('🗑️ Deleting templates with user_id = "default_user"...');

try {
  // First, let's see what we're deleting
  const templates = db.prepare("SELECT id, name, user_id FROM templates WHERE user_id = 'default_user'").all();

  console.log(`Found ${templates.length} templates to delete:`);
  templates.forEach(t => {
    console.log(`  - ${t.name} (${t.id})`);
  });

  if (templates.length === 0) {
    console.log('✅ No templates with default_user found!');
    process.exit(0);
  }

  // Delete them
  const result = db.prepare("DELETE FROM templates WHERE user_id = 'default_user'").run();

  console.log(`✅ Deleted ${result.changes} templates!`);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  db.close();
}
