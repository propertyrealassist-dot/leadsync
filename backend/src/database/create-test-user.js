const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

const dbPath = process.env.DB_PATH || './data/leadsync.db';
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Helper functions
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

async function createTestUser() {
  console.log('🔧 Creating test user...\n');

  const email = 'test@example.com';
  const password = 'password123';
  const firstName = 'Test';
  const lastName = 'User';
  const companyName = 'Test Company';

  // Check if user already exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingUser) {
    console.log('❌ User already exists with email:', email);
    console.log('   User ID:', existingUser.id);
    process.exit(0);
  }

  // Generate credentials
  const userId = generateUUID();
  const clientId = generateUUID();
  const apiKey = generateApiKey();
  const apiKeyHash = hashApiKey(apiKey);

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  db.prepare(`
    INSERT INTO users (
      id, email, password_hash, first_name, last_name, company_name,
      client_id, api_key, api_key_hash, account_status, email_verified,
      plan_type, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(
    userId,
    email.toLowerCase(),
    passwordHash,
    firstName,
    lastName,
    companyName,
    clientId,
    apiKey,
    apiKeyHash,
    'active',
    1, // email verified
    'free'
  );

  console.log('✅ Test user created successfully!\n');
  console.log('📧 Email:       ', email);
  console.log('🔒 Password:    ', password);
  console.log('👤 User ID:     ', userId);
  console.log('🆔 Client ID:   ', clientId);
  console.log('🔑 API Key:     ', apiKey);
  console.log('\n💡 Use these credentials to login at http://localhost:3000/login\n');

  db.close();
}

createTestUser().catch(error => {
  console.error('❌ Error creating test user:', error);
  process.exit(1);
});
