// Add GHL location to ghl_integrations for marketplace webhook auth
require('dotenv').config();
const { pool, generateUUID } = require('./src/config/database-postgres');

async function addLocation() {
  try {
    const userId = '882687d4-ae2b-48d0-b42c-8d846cb5a613'; // Your user ID
    const locationId = 'bRLdonapBAI3vQ1YLWLU'; // From your webhook payload

    console.log('🔍 Checking if location already exists...\n');

    const existing = await pool.query(
      'SELECT * FROM ghl_integrations WHERE user_id = $1 AND location_id = $2',
      [userId, locationId]
    );

    if (existing.rows.length > 0) {
      console.log('✅ Location already exists!');
      console.log('Location ID:', locationId);
      process.exit(0);
    }

    console.log('📝 Adding location to ghl_integrations...\n');

    // Insert with placeholder tokens (you'll connect properly later through OAuth)
    await pool.query(`
      INSERT INTO ghl_integrations (
        id, user_id, location_id, location_name,
        access_token, refresh_token, token_type,
        is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      generateUUID(),
      userId,
      locationId,
      'Main Location',
      'placeholder_token', // Will be replaced when you connect via OAuth
      'placeholder_refresh',
      'Bearer',
      true
    ]);

    console.log('✅ Location added successfully!');
    console.log('📍 Location ID:', locationId);
    console.log('👤 User ID:', userId);
    console.log('\n⚠️  NOTE: Connect your GHL account properly to get real OAuth tokens!');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addLocation();
