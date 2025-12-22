// Script to create user in SQLite database
require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Force SQLite mode
process.env.DB_TYPE = 'sqlite';

const db = require('./src/database/db');

function generateApiKey(prefix = 'ak_live') {
  const randomBytes = crypto.randomBytes(24);
  const key = randomBytes.toString('base64')
    .replace(/\+/g, '')
    .replace(/\//g, '')
    .replace(/=/g, '')
    .substring(0, 32);
  return `${prefix}_${key}`;
}

function generateUUID() {
  return crypto.randomUUID();
}

function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

async function createUser() {
  try {
    const email = 'kmv736@gmail.com';
    const password = 'Jamk52657*';

    console.log('🔍 Checking if user exists...');

    // Check if user already exists
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (existing) {
      console.log('✅ User already exists:', email);
      console.log('User ID:', existing.id);
      return;
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
    const stmt = db.prepare(`
      INSERT INTO users (
        id, email, password_hash, client_id, api_key, api_key_hash,
        account_status, email_verified, plan_type, subscription_status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      userId,
      email,
      passwordHash,
      clientId,
      apiKey,
      apiKeyHash,
      'active',
      1, // email_verified = true
      'free',
      'active'
    );

    console.log('✅ User created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 User ID:', userId);
    console.log('🆔 Client ID:', clientId);
    console.log('🔐 API Key:', apiKey);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createUser();
