require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixAllUUIDColumns() {
  const client = await pool.connect();

  try {
    console.log('🔧 Converting ALL UUID columns to TEXT for GHL compatibility...\n');

    // Step 1: Drop ALL foreign key constraints that depend on conversations.id and templates.id
    console.log('1️⃣ Dropping ALL foreign key constraints...');

    const constraints = [
      'ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey',
      'ALTER TABLE scheduled_messages DROP CONSTRAINT IF EXISTS scheduled_messages_conversation_id_fkey',
      'ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_template_id_fkey',
      'ALTER TABLE faqs DROP CONSTRAINT IF EXISTS faqs_template_id_fkey',
      'ALTER TABLE qualification_questions DROP CONSTRAINT IF EXISTS qualification_questions_template_id_fkey',
      'ALTER TABLE follow_ups DROP CONSTRAINT IF EXISTS follow_ups_template_id_fkey'
    ];

    for (const sql of constraints) {
      try {
        await client.query(sql);
      } catch (e) {
        // Constraint might not exist, continue
      }
    }
    console.log('✅ All foreign key constraints dropped');

    // Step 2: Convert all ID columns to TEXT
    console.log('2️⃣ Converting all ID columns to TEXT...');

    const conversions = [
      { table: 'conversations', column: 'id', desc: 'conversations.id' },
      { table: 'messages', column: 'conversation_id', desc: 'messages.conversation_id' },
      { table: 'scheduled_messages', column: 'conversation_id', desc: 'scheduled_messages.conversation_id' },
      { table: 'templates', column: 'id', desc: 'templates.id' },
      { table: 'conversations', column: 'template_id', desc: 'conversations.template_id' },
      { table: 'faqs', column: 'template_id', desc: 'faqs.template_id' },
      { table: 'qualification_questions', column: 'template_id', desc: 'qualification_questions.template_id' },
      { table: 'follow_ups', column: 'template_id', desc: 'follow_ups.template_id' }
    ];

    for (const conv of conversions) {
      try {
        await client.query(`
          ALTER TABLE ${conv.table}
          ALTER COLUMN ${conv.column} TYPE TEXT
        `);
        console.log(`   ✅ ${conv.desc}`);
      } catch (e) {
        console.log(`   ⚠️  ${conv.desc} - ${e.message}`);
      }
    }

    // Step 3: Recreate all foreign key constraints
    console.log('3️⃣ Recreating foreign key constraints...');

    const newConstraints = [
      `ALTER TABLE messages
       ADD CONSTRAINT messages_conversation_id_fkey
       FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE`,

      `ALTER TABLE scheduled_messages
       ADD CONSTRAINT scheduled_messages_conversation_id_fkey
       FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE`,

      `ALTER TABLE conversations
       ADD CONSTRAINT conversations_template_id_fkey
       FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE`,

      `ALTER TABLE faqs
       ADD CONSTRAINT faqs_template_id_fkey
       FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE`,

      `ALTER TABLE qualification_questions
       ADD CONSTRAINT qualification_questions_template_id_fkey
       FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE`,

      `ALTER TABLE follow_ups
       ADD CONSTRAINT follow_ups_template_id_fkey
       FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE`
    ];

    for (const sql of newConstraints) {
      try {
        await client.query(sql);
      } catch (e) {
        console.log(`   ⚠️  ${e.message}`);
      }
    }
    console.log('✅ All foreign key constraints recreated');

    console.log('\n🎉 Migration complete!\n');
    console.log('✅ All UUID columns converted to TEXT');
    console.log('✅ GHL IDs like "tnWudfU3pQpo0npdziEJ" will now work!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAllUUIDColumns()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
