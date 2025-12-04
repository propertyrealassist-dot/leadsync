const { db } = require('./backend/src/config/database');

(async () => {
  try {
    // Check for GHL tables
    const ghlTables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%ghl%'");
    console.log('GHL Tables:', JSON.stringify(ghlTables, null, 2));

    // Check all tables
    const allTables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('\nAll Tables:', allTables.map(t => t.name).join(', '));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
