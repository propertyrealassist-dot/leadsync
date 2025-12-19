require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixMessagesTable() {
  const client = await pool.connect();

  try {
    console.log('🔧 Making conversation_id nullable in messages table...\n');

    // Make conversation_id nullable
    await client.query(`
      ALTER TABLE messages
      ALTER COLUMN conversation_id DROP NOT NULL
    `);

    console.log('✅ conversation_id is now nullable');

    // Optional: Set default value for future inserts
    await client.query(`
      ALTER TABLE messages
      ALTER COLUMN conversation_id SET DEFAULT gen_random_uuid()
    `);

    console.log('✅ Added default value generator');

    console.log('\n🎉 Migration completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixMessagesTable()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
