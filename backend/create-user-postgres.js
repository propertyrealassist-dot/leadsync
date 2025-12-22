// Script to create user in PostgreSQL database
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, generateApiKey, generateUUID, hashApiKey } = require('./src/config/database-postgres');

async function createUser() {
  let client;

  try {
    const email = 'kmv736@gmail.com';
    const password = 'Jamk52657*';

    console.log('🔍 Checking if user exists...');

    client = await pool.connect();

    // Check if user already exists
    const existing = await client.query('SELECT * FROM users WHERE email = $1', [email]);

    if (existing.rows.length > 0) {
      console.log('✅ User already exists:', email);
      console.log('User ID:', existing.rows[0].id);
      client.release();
      process.exit(0);
    }

    console.log('📝 Creating new user...');

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate credentials
    const userId = generateUUID();
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    // Insert user
    const result = await client.query(`
      INSERT INTO users (
        id, email, password_hash, client_id, api_key, api_key_hash,
        account_status, email_verified, plan_type, subscription_status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      userId,
      email,
      passwordHash,
      clientId,
      apiKey,
      apiKeyHash,
      'active',
      true, // email_verified
      'free',
      'active'
    ]);

    console.log('✅ User created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 User ID:', result.rows[0].id);
    console.log('🆔 Client ID:', clientId);
    console.log('🔐 API Key:', apiKey);

    client.release();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (client) client.release();
    process.exit(1);
  }
}

createUser();
