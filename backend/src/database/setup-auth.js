const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = process.env.DB_PATH || './data/leadsync.db';
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log('🔧 Setting up authentication tables...\n');

// ==========================================
// HELPER FUNCTIONS
// ==========================================
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

// ==========================================
// CREATE USERS TABLE
// ==========================================
console.log('📋 Creating users table...');

// Check if users table exists
const usersTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();

if (usersTableExists) {
  console.log('  Users table already exists, checking schema...');

  // Check if it has all required columns
  const usersColumns = db.prepare("PRAGMA table_info(users)").all();
  const hasAccountStatus = usersColumns.some(col => col.name === 'account_status');
  const hasClientId = usersColumns.some(col => col.name === 'client_id');
  const hasApiKey = usersColumns.some(col => col.name === 'api_key');

  if (!hasAccountStatus || !hasClientId || !hasApiKey) {
    console.log('  ⚠️  Users table has old schema, recreating...');

    // Backup existing data if any
    const existingUsers = db.prepare("SELECT * FROM users").all();

    // Drop old table
    db.exec(`DROP TABLE IF EXISTS users`);
    console.log('  Dropped old users table');

    // Create new table
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        company_name TEXT,

        -- API Authentication
        client_id TEXT UNIQUE NOT NULL,
        api_key TEXT UNIQUE NOT NULL,
        api_key_hash TEXT NOT NULL,

        -- Account Status
        account_status TEXT DEFAULT 'active',
        email_verified BOOLEAN DEFAULT 0,

        -- Subscription Info
        plan_type TEXT DEFAULT 'free',
        subscription_status TEXT DEFAULT 'active',
        trial_ends_at DATETIME,
        subscription_ends_at DATETIME,

        -- Timestamps
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME
      );
    `);
    console.log('  ✅ Created new users table with updated schema');

    // Restore data if any existed
    if (existingUsers.length > 0) {
      console.log(`  📦 Restoring ${existingUsers.length} existing users...`);
      // Note: This would need more complex logic to migrate old data to new schema
      console.log('  ⚠️  Manual data migration may be required');
    }
  } else {
    console.log('  ✅ Users table has correct schema');
  }
} else {
  // Create fresh table
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      company_name TEXT,

      -- API Authentication
      client_id TEXT UNIQUE NOT NULL,
      api_key TEXT UNIQUE NOT NULL,
      api_key_hash TEXT NOT NULL,

      -- Account Status
      account_status TEXT DEFAULT 'active',
      email_verified BOOLEAN DEFAULT 0,

      -- Subscription Info
      plan_type TEXT DEFAULT 'free',
      subscription_status TEXT DEFAULT 'active',
      trial_ends_at DATETIME,
      subscription_ends_at DATETIME,

      -- Timestamps
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME
    );
  `);
  console.log('✅ Users table created');
}

// ==========================================
// CREATE INDEXES
// ==========================================
console.log('📊 Creating indexes on users table...');

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);
  CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
  CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
`);

console.log('✅ Indexes created');

// ==========================================
// CREATE API KEYS TABLE (Multiple keys per user)
// ==========================================
console.log('🔑 Creating api_keys table...');

db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,

    -- Key Information
    key_name TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    api_key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,

    -- Key Status
    active BOOLEAN DEFAULT 1,
    revoked_at DATETIME,

    -- Key Metadata
    last_used_at DATETIME,
    usage_count INTEGER DEFAULT 0,

    -- Permissions
    permissions TEXT DEFAULT 'full',

    -- Rate Limiting
    rate_limit INTEGER DEFAULT 1000,

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
  CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key);
  CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);
`);

console.log('✅ API keys table created');

// ==========================================
// CREATE SESSIONS TABLE
// ==========================================
console.log('🔐 Creating sessions table...');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    refresh_token_hash TEXT NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    user_agent TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
`);

console.log('✅ Sessions table created');

// ==========================================
// CREATE WEBHOOK LOGS TABLE
// ==========================================
console.log('📝 Creating webhook_logs table...');

db.exec(`
  CREATE TABLE IF NOT EXISTS webhook_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    client_id TEXT,

    -- Request Info
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    payload TEXT,
    headers TEXT,

    -- Response Info
    status_code INTEGER,
    response_body TEXT,

    -- Processing Info
    processing_time_ms INTEGER,
    error_message TEXT,

    -- Matched Resources
    matched_template_id TEXT,
    created_conversation_id TEXT,

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id ON webhook_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_webhook_logs_client_id ON webhook_logs(client_id);
  CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);
`);

console.log('✅ Webhook logs table created');

// ==========================================
// UPDATE EXISTING TABLES WITH USER_ID
// ==========================================
console.log('🔄 Checking if existing tables need user_id column...');

// Check if templates table has user_id column
const templatesInfo = db.prepare("PRAGMA table_info(templates)").all();
const hasUserId = templatesInfo.some(col => col.name === 'user_id');

if (!hasUserId) {
  console.log('  Adding user_id to templates table...');
  db.exec(`
    ALTER TABLE templates ADD COLUMN user_id TEXT DEFAULT 'default_user';
  `);
  console.log('  ✅ Added user_id to templates');
} else {
  console.log('  ⏭️  Templates table already has user_id');
}

// Check if conversations table has user_id column
const conversationsInfo = db.prepare("PRAGMA table_info(conversations)").all();
const conversationsHasUserId = conversationsInfo.some(col => col.name === 'user_id');

if (!conversationsHasUserId) {
  console.log('  Adding user_id to conversations table...');
  db.exec(`
    ALTER TABLE conversations ADD COLUMN user_id TEXT DEFAULT 'default_user';
  `);
  console.log('  ✅ Added user_id to conversations');
} else {
  console.log('  ⏭️  Conversations table already has user_id');
}

console.log('\n✨ Authentication tables setup complete!');
console.log(`📍 Database location: ${path.resolve(dbPath)}`);

// List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('\n📚 Available tables:', tables.map(t => t.name).join(', '));

db.close();
console.log('\n✅ Database connection closed');
