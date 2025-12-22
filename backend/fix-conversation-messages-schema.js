// Fix conversation_messages table to make conversation_id nullable
require('dotenv').config();
const { pool } = require('./src/config/database-postgres');

async function fixSchema() {
  try {
    console.log('🔧 Making ghl_conversation_id and ghl_location_id nullable...\n');

    // Make conversation_id nullable
    await pool.query(`
      ALTER TABLE conversation_messages
      ALTER COLUMN ghl_conversation_id DROP NOT NULL
    `);
    console.log('✅ ghl_conversation_id is now nullable');

    // Make location_id nullable
    await pool.query(`
      ALTER TABLE conversation_messages
      ALTER COLUMN ghl_location_id DROP NOT NULL
    `);
    console.log('✅ ghl_location_id is now nullable');

    console.log('\n✅ Schema fixed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixSchema();
