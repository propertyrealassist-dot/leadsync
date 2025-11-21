/**
 * Migration: Assign Existing Data to Organizations
 *
 * This script assigns all existing templates, conversations, and leads
 * that don't have an organization_id to their user's default organization
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? {
    rejectUnauthorized: false
  } : false
});

async function migrateExistingData() {
  let client;

  try {
    console.log('🔄 Starting data migration to organizations...\n');

    client = await pool.connect();

    // Get all users with their organizations
    console.log('1️⃣ Finding users and their organizations...');
    const usersWithOrgs = await client.query(`
      SELECT DISTINCT
        u.id as user_id,
        om.organization_id
      FROM users u
      INNER JOIN organization_members om ON u.id = om.user_id
      WHERE om.status = 'active'
      ORDER BY om.joined_at ASC
    `);

    console.log(`   ✅ Found ${usersWithOrgs.rows.length} user-organization relationships\n`);

    // Migrate templates
    console.log('2️⃣ Migrating templates...');
    let templatesUpdated = 0;
    for (const row of usersWithOrgs.rows) {
      const result = await client.query(`
        UPDATE templates
        SET organization_id = $1
        WHERE user_id = $2 AND organization_id IS NULL
      `, [row.organization_id, row.user_id]);
      templatesUpdated += result.rowCount;
    }
    console.log(`   ✅ Updated ${templatesUpdated} templates\n`);

    // Migrate conversations
    console.log('3️⃣ Migrating conversations...');
    let conversationsUpdated = 0;
    for (const row of usersWithOrgs.rows) {
      const result = await client.query(`
        UPDATE conversations
        SET organization_id = $1
        WHERE user_id = $2 AND organization_id IS NULL
      `, [row.organization_id, row.user_id]);
      conversationsUpdated += result.rowCount;
    }
    console.log(`   ✅ Updated ${conversationsUpdated} conversations\n`);

    // Migrate leads
    console.log('4️⃣ Migrating leads...');
    let leadsUpdated = 0;
    for (const row of usersWithOrgs.rows) {
      const result = await client.query(`
        UPDATE leads
        SET organization_id = $1
        WHERE user_id = $2 AND organization_id IS NULL
      `, [row.organization_id, row.user_id]);
      leadsUpdated += result.rowCount;
    }
    console.log(`   ✅ Updated ${leadsUpdated} leads\n`);

    // Summary
    console.log('📊 Migration Summary:');
    console.log(`   Templates:     ${templatesUpdated} migrated`);
    console.log(`   Conversations: ${conversationsUpdated} migrated`);
    console.log(`   Leads:         ${leadsUpdated} migrated`);
    console.log(`   Total:         ${templatesUpdated + conversationsUpdated + leadsUpdated} records\n`);

    // Verify - check for any remaining orphaned data
    console.log('5️⃣ Verifying migration...');
    const orphanedTemplates = await client.query('SELECT COUNT(*) FROM templates WHERE organization_id IS NULL');
    const orphanedConversations = await client.query('SELECT COUNT(*) FROM conversations WHERE organization_id IS NULL');
    const orphanedLeads = await client.query('SELECT COUNT(*) FROM leads WHERE organization_id IS NULL');

    const orphanedCount =
      parseInt(orphanedTemplates.rows[0].count) +
      parseInt(orphanedConversations.rows[0].count) +
      parseInt(orphanedLeads.rows[0].count);

    if (orphanedCount > 0) {
      console.log(`   ⚠️  Warning: ${orphanedCount} records still without organization_id`);
      console.log(`      Templates: ${orphanedTemplates.rows[0].count}`);
      console.log(`      Conversations: ${orphanedConversations.rows[0].count}`);
      console.log(`      Leads: ${orphanedLeads.rows[0].count}`);
    } else {
      console.log('   ✅ All data successfully migrated to organizations!');
    }

    console.log('\n🎉 Migration completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run migration
migrateExistingData();
