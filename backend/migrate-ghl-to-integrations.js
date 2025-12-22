// Migrate GHL credentials from ghl_credentials to ghl_integrations table
// This ensures marketplace webhooks can find the credentials

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateCredentials() {
  try {
    console.log('🔄 Migrating GHL credentials to integrations table...\n');

    // Get all credentials from ghl_credentials
    const oldCreds = await pool.query(`
      SELECT user_id, location_id, access_token, refresh_token, expires_at
      FROM ghl_credentials
    `);

    if (oldCreds.rows.length === 0) {
      console.log('❌ No credentials found in ghl_credentials table');
      await pool.end();
      return;
    }

    console.log(`✅ Found ${oldCreds.rows.length} credential(s) to migrate\n`);

    // Migrate each credential
    for (const cred of oldCreds.rows) {
      console.log('📤 Migrating credentials for user:', cred.user_id);
      console.log('   Location ID:', cred.location_id);

      // Check if already exists in ghl_integrations
      const existing = await pool.query(`
        SELECT id FROM ghl_integrations
        WHERE user_id = $1 AND location_id = $2
      `, [cred.user_id, cred.location_id]);

      if (existing.rows.length > 0) {
        console.log('   ⏭️  Already exists in ghl_integrations, updating...');

        await pool.query(`
          UPDATE ghl_integrations
          SET access_token = $1,
              refresh_token = $2,
              expires_at = $3,
              is_active = true,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $4 AND location_id = $5
        `, [cred.access_token, cred.refresh_token, cred.expires_at, cred.user_id, cred.location_id]);

        console.log('   ✅ Updated existing integration\n');
      } else {
        console.log('   ➕ Creating new integration...');

        await pool.query(`
          INSERT INTO ghl_integrations (
            user_id, location_id, access_token, refresh_token, expires_at, is_active
          ) VALUES ($1, $2, $3, $4, $5, true)
        `, [cred.user_id, cred.location_id, cred.access_token, cred.refresh_token, cred.expires_at]);

        console.log('   ✅ Created new integration\n');
      }
    }

    console.log('✅ Migration complete!\n');

    // Verify
    const integrations = await pool.query(`
      SELECT user_id, location_id, is_active FROM ghl_integrations
    `);

    console.log('📊 Current integrations:');
    integrations.rows.forEach(int => {
      console.log(`   - User: ${int.user_id}, Location: ${int.location_id}, Active: ${int.is_active}`);
    });

    await pool.end();

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

migrateCredentials();
