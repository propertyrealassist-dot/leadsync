const { Pool } = require('pg');
const crypto = require('crypto');

// PostgreSQL connection pool for CockroachDB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? {
    rejectUnauthorized: false // CockroachDB requires SSL
  } : false,
  max: 20, // Maximum pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000 // Increased to 15s for cluster wake-up
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to CockroachDB');
});

pool.on('error', (err) => {
  console.error('❌ CockroachDB connection error:', err);
});

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

// Initialize database tables with retry logic for CockroachDB cluster wake-up
async function initializeDatabase(retries = 3) {
  let client;

  try {
    console.log('🔧 Connecting to CockroachDB...');
    client = await pool.connect();
    console.log('✅ Connection established');
    console.log('🔧 Initializing CockroachDB schema...');

    // ==========================================
    // USERS & AUTH TABLES
    // ==========================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        company_name VARCHAR(255),

        -- API Authentication
        client_id VARCHAR(255) UNIQUE NOT NULL,
        api_key VARCHAR(255) UNIQUE NOT NULL,
        api_key_hash VARCHAR(255) NOT NULL,

        -- Account Status
        account_status VARCHAR(50) DEFAULT 'active',
        email_verified BOOLEAN DEFAULT false,

        -- Subscription Info
        plan_type VARCHAR(50) DEFAULT 'free',
        subscription_status VARCHAR(50) DEFAULT 'active',
        trial_ends_at TIMESTAMP,
        subscription_ends_at TIMESTAMP,

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Key Information
        key_name VARCHAR(255) NOT NULL,
        api_key VARCHAR(255) UNIQUE NOT NULL,
        api_key_hash VARCHAR(255) NOT NULL,
        key_prefix VARCHAR(50) NOT NULL,

        -- Key Status
        active BOOLEAN DEFAULT true,
        revoked_at TIMESTAMP,

        -- Key Metadata
        last_used_at TIMESTAMP,
        usage_count INTEGER DEFAULT 0,

        -- Permissions
        permissions VARCHAR(50) DEFAULT 'full',

        -- Rate Limiting
        rate_limit INTEGER DEFAULT 1000,

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token_hash VARCHAR(255) NOT NULL,
        device_info TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        client_id VARCHAR(255),

        -- Request Info
        endpoint TEXT NOT NULL,
        method VARCHAR(10) NOT NULL,
        payload TEXT,
        headers TEXT,

        -- Response Info
        status_code INTEGER,
        response_body TEXT,

        -- Processing Info
        processing_time_ms INTEGER,
        error_message TEXT,

        -- Matched Resources
        matched_template_id UUID,
        created_conversation_id UUID,

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id ON webhook_logs(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_webhook_logs_client_id ON webhook_logs(client_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at)`);

    // ==========================================
    // AI TEMPLATES & CONVERSATIONS
    // ==========================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID DEFAULT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        tag VARCHAR(100) NOT NULL,
        bot_temperature REAL DEFAULT 0.4,
        brief TEXT NOT NULL,
        resiliancy INTEGER DEFAULT 3,
        booking_readiness INTEGER DEFAULT 2,
        tone VARCHAR(100) DEFAULT 'Friendly and Casual',
        initial_message TEXT NOT NULL,
        objective TEXT NOT NULL,
        company_information TEXT,
        message_delay_initial INTEGER DEFAULT 30,
        message_delay_standard INTEGER DEFAULT 5,
        cta TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_templates_tag ON templates(tag)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS faqs (
        id SERIAL PRIMARY KEY,
        template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        delay INTEGER DEFAULT 1
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS qualification_questions (
        id SERIAL PRIMARY KEY,
        template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        conditions TEXT,
        delay INTEGER DEFAULT 1
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS follow_ups (
        id SERIAL PRIMARY KEY,
        template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        delay INTEGER NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_actions (
        id SERIAL PRIMARY KEY,
        template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        rule_condition TEXT NOT NULL,
        description TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS action_chains (
        id SERIAL PRIMARY KEY,
        custom_action_id INTEGER NOT NULL REFERENCES custom_actions(id) ON DELETE CASCADE,
        chain_name VARCHAR(255) NOT NULL,
        chain_order INTEGER NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS chain_steps (
        id SERIAL PRIMARY KEY,
        chain_id INTEGER NOT NULL REFERENCES action_chains(id) ON DELETE CASCADE,
        step_order INTEGER NOT NULL,
        function VARCHAR(255) NOT NULL,
        parameters TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID DEFAULT NULL REFERENCES users(id) ON DELETE CASCADE,
        template_id UUID NOT NULL REFERENCES templates(id),
        contact_name VARCHAR(255),
        contact_phone VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        lead_score INTEGER DEFAULT 0,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_template_id ON conversations(template_id)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS scheduled_messages (
        id SERIAL PRIMARY KEY,
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        scheduled_for TIMESTAMP NOT NULL,
        sent BOOLEAN DEFAULT false
      )
    `);

    // ==========================================
    // GHL INTEGRATION TABLES
    // ==========================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS ghl_credentials (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        location_id VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ghl_event_id VARCHAR(255),
        ghl_calendar_id VARCHAR(255),
        contact_id VARCHAR(255),
        contact_name VARCHAR(255) NOT NULL,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        duration_minutes INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        appointment_type VARCHAR(100),
        location TEXT,
        notes TEXT,
        reminder_sent BOOLEAN DEFAULT false,
        reminder_sent_at TIMESTAMP,
        synced_to_ghl BOOLEAN DEFAULT false,
        last_synced_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_appointments_ghl_event_id ON appointments(ghl_event_id)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ghl_contact_id VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        tags TEXT,
        notes TEXT,
        last_appointment_date TIMESTAMP,
        total_appointments INTEGER DEFAULT 0,
        synced_to_ghl BOOLEAN DEFAULT false,
        last_synced_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, phone)
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_clients_ghl_contact_id ON clients(ghl_contact_id)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS appointment_reminders (
        id SERIAL PRIMARY KEY,
        appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
        reminder_type VARCHAR(50) NOT NULL,
        send_at TIMESTAMP NOT NULL,
        sent BOOLEAN DEFAULT false,
        sent_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id),
        sync_type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id VARCHAR(255),
        direction VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS calendar_settings (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        default_calendar_id VARCHAR(255),
        sync_enabled BOOLEAN DEFAULT true,
        auto_sync_interval INTEGER DEFAULT 15,
        reminder_sms_enabled BOOLEAN DEFAULT true,
        reminder_email_enabled BOOLEAN DEFAULT true,
        reminder_hours_before INTEGER DEFAULT 24,
        business_hours_start VARCHAR(10) DEFAULT '09:00',
        business_hours_end VARCHAR(10) DEFAULT '17:00',
        timezone VARCHAR(100) DEFAULT 'America/New_York',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ CockroachDB schema initialized successfully');

  } catch (error) {
    console.error('❌ Error initializing database:', error.message);

    // Check if it's a connection timeout and we have retries left
    const isTimeout = error.message && (
      error.message.includes('timeout') ||
      error.message.includes('Connection terminated') ||
      error.message.includes('ECONNREFUSED')
    );

    if (retries > 0 && isTimeout) {
      console.log(`⏳ CockroachDB cluster may be waking up...`);
      console.log(`⏳ Retrying connection in 5 seconds... (${retries} attempts left)`);

      // Release client if it exists
      if (client) {
        try {
          client.release();
        } catch (releaseError) {
          // Ignore release errors
        }
      }

      // Wait 5 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Recursive retry
      return initializeDatabase(retries - 1);
    }

    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        // Ignore release errors during cleanup
      }
    }
  }
}

// Query helper
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Query executed', { duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Query error:', error);
    throw error;
  }
}

// Get a client from the pool
async function getClient() {
  return await pool.connect();
}

module.exports = {
  pool,
  query,
  getClient,
  initializeDatabase,
  generateApiKey,
  generateUUID,
  hashApiKey
};
