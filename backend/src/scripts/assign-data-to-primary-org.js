/**
 * Assign all existing data to primary organization
 *
 * This script assigns all data with NULL organization_id to the user's
 * FIRST (oldest) organization, leaving other organizations empty
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? {
    rejectUnauthorized: false
  } : false
});

async function assignDataToPrimaryOrg() {
  let client;

  try {
    console.log('🔄 Assigning existing data to primary organization...\n');

    client = await pool.connect();

    // Get all users with their PRIMARY (first/oldest) organization
    console.log('1️⃣ Finding users and their PRIMARY organizations...');
    const usersWithPrimaryOrg = await client.query(`
      SELECT DISTINCT ON (u.id)
        u.id as user_id,
        u.email,
        om.organization_id,
        o.name as org_name
      FROM users u
      INNER JOIN organization_members om ON u.id = om.user_id
      INNER JOIN organizations o ON om.organization_id = o.id
      WHERE om.status = 'active'
      ORDER BY u.id, om.joined_at ASC
    `);

    console.log(`   ✅ Found ${usersWithPrimaryOrg.rows.length} users with primary organizations\n`);

    for (const row of usersWithPrimaryOrg.rows) {
      console.log(`📦 Processing user: ${row.email}`);
      console.log(`   Primary org: "${row.org_name}" (${row.organization_id})\n`);

      // Assign templates
      const templatesResult = await client.query(`
        UPDATE templates
        SET organization_id = $1
        WHERE user_id = $2 AND organization_id IS NULL
        RETURNING id
      `, [row.organization_id, row.user_id]);
      console.log(`   ✅ Assigned ${templatesResult.rowCount} templates`);

      // Assign conversations
      const conversationsResult = await client.query(`
        UPDATE conversations
        SET organization_id = $1
        WHERE user_id = $2 AND organization_id IS NULL
        RETURNING id
      `, [row.organization_id, row.user_id]);
      console.log(`   ✅ Assigned ${conversationsResult.rowCount} conversations`);

      // Assign leads
      const leadsResult = await client.query(`
        UPDATE leads
        SET organization_id = $1
        WHERE user_id = $2 AND organization_id IS NULL
        RETURNING id
      `, [row.organization_id, row.user_id]);
      console.log(`   ✅ Assigned ${leadsResult.rowCount} leads\n`);
    }

    // Verify - check for any remaining orphaned data
    console.log('2️⃣ Verifying assignment...');
    const orphanedTemplates = await client.query('SELECT COUNT(*) FROM templates WHERE organization_id IS NULL');
    const orphanedConversations = await client.query('SELECT COUNT(*) FROM conversations WHERE organization_id IS NULL');
    const orphanedLeads = await client.query('SELECT COUNT(*) FROM leads WHERE organization_id IS NULL');

    const orphanedCount =
      parseInt(orphanedTemplates.rows[0].count) +
      parseInt(orphanedConversations.rows[0].count) +
      parseInt(orphanedLeads.rows[0].count);

    if (orphanedCount > 0) {
      console.log(`   ⚠️  Warning: ${orphanedCount} records still without organization_id`);
    } else {
      console.log('   ✅ All data successfully assigned to primary organizations!');
    }

    console.log('\n🎉 Assignment completed successfully!');
    console.log('📝 Result: Existing data assigned to PRIMARY organization only');
    console.log('🆕 Other organizations will start with a clean slate\n');

  } catch (error) {
    console.error('❌ Assignment failed:', error);
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

// Run assignment
assignDataToPrimaryOrg();
