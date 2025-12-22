const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkCredentials() {
  try {
    console.log('🔍 Checking GHL credentials in database...\n');
    
    // Get user info
    const users = await pool.query(`
      SELECT id, email, client_id FROM users WHERE email = 'kurtvonbergen@icloud.com'
    `);
    
    if (users.rows.length > 0) {
      const user = users.rows[0];
      console.log('✅ User found:');
      console.log('   Email:', user.email);
      console.log('   User ID:', user.id);
      console.log('   Client ID:', user.client_id);
      console.log('');
      
      // Check ghl_credentials table
      const legacyCreds = await pool.query(`
        SELECT user_id, location_id, access_token, refresh_token, expires_at
        FROM ghl_credentials
        WHERE user_id = $1
      `, [user.id]);
      
      console.log('📋 ghl_credentials table:');
      if (legacyCreds.rows.length > 0) {
        legacyCreds.rows.forEach(cred => {
          console.log('   ✅ Found credentials:');
          console.log('      User ID:', cred.user_id);
          console.log('      Location ID:', cred.location_id);
          console.log('      Has access_token:', !!cred.access_token);
          console.log('      Has refresh_token:', !!cred.refresh_token);
          console.log('      Expires at:', cred.expires_at);
        });
      } else {
        console.log('   ❌ No credentials found');
      }
      console.log('');
      
      // Check ghl_integrations table
      const marketplaceCreds = await pool.query(`
        SELECT user_id, location_id, access_token, refresh_token, expires_at, is_active
        FROM ghl_integrations
        WHERE user_id = $1
      `, [user.id]);
      
      console.log('📋 ghl_integrations table:');
      if (marketplaceCreds.rows.length > 0) {
        marketplaceCreds.rows.forEach(cred => {
          console.log('   ✅ Found integration:');
          console.log('      User ID:', cred.user_id);
          console.log('      Location ID:', cred.location_id);
          console.log('      Has access_token:', !!cred.access_token);
          console.log('      Has refresh_token:', !!cred.refresh_token);
          console.log('      Expires at:', cred.expires_at);
          console.log('      Is active:', cred.is_active);
        });
      } else {
        console.log('   ❌ No integrations found');
      }
      
    } else {
      console.log('❌ User not found');
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

checkCredentials();
