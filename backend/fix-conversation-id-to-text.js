require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixConversationIdColumns() {
  const client = await pool.connect();

  try {
    console.log('🔧 Converting conversation_id columns from UUID to TEXT...\n');

    // Step 1: Drop ALL foreign key constraints
    console.log('1️⃣ Dropping all foreign key constraints...');
    await client.query(`
      ALTER TABLE messages
      DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey
    `);
    await client.query(`
      ALTER TABLE scheduled_messages
      DROP CONSTRAINT IF EXISTS scheduled_messages_conversation_id_fkey
    `);
    await client.query(`
      ALTER TABLE conversations
      DROP CONSTRAINT IF EXISTS conversations_template_id_fkey
    `);
    console.log('✅ All foreign key constraints dropped');

    // Step 2: Convert conversations.id to TEXT
    console.log('2️⃣ Converting conversations.id to TEXT...');
    await client.query(`
      ALTER TABLE conversations
      ALTER COLUMN id TYPE TEXT
    `);
    console.log('✅ conversations.id is now TEXT');

    // Step 3: Convert messages.conversation_id to TEXT
    console.log('3️⃣ Converting messages.conversation_id to TEXT...');
    await client.query(`
      ALTER TABLE messages
      ALTER COLUMN conversation_id TYPE TEXT
    `);
    console.log('✅ messages.conversation_id is now TEXT');

    // Step 4: Convert scheduled_messages.conversation_id to TEXT
    console.log('4️⃣ Converting scheduled_messages.conversation_id to TEXT...');
    await client.query(`
      ALTER TABLE scheduled_messages
      ALTER COLUMN conversation_id TYPE TEXT
    `);
    console.log('✅ scheduled_messages.conversation_id is now TEXT');

    // Step 5: Recreate foreign key constraints
    console.log('5️⃣ Recreating foreign key constraints...');
    await client.query(`
      ALTER TABLE messages
      ADD CONSTRAINT messages_conversation_id_fkey
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    `);
    await client.query(`
      ALTER TABLE scheduled_messages
      ADD CONSTRAINT scheduled_messages_conversation_id_fkey
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    `);
    console.log('✅ Foreign key constraints recreated');

    // Step 6: Convert templates.id to TEXT
    console.log('6️⃣ Converting templates.id to TEXT...');
    await client.query(`
      ALTER TABLE templates
      ALTER COLUMN id TYPE TEXT
    `);
    console.log('✅ templates.id is now TEXT');

    // Step 7: Convert conversations.template_id to TEXT
    console.log('7️⃣ Converting conversations.template_id to TEXT...');
    await client.query(`
      ALTER TABLE conversations
      ALTER COLUMN template_id TYPE TEXT
    `);
    console.log('✅ conversations.template_id is now TEXT');

    // Step 8: Recreate template_id foreign key
    console.log('8️⃣ Recreating template_id foreign key...');
    await client.query(`
      ALTER TABLE conversations
      ADD CONSTRAINT conversations_template_id_fkey
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
    `);
    console.log('✅ Template foreign key recreated');

    console.log('\n🎉 All ID columns converted to TEXT!\n');
    console.log('GHL IDs like "tnWudfU3pQpo0npdziEJ" will now work!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixConversationIdColumns()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
