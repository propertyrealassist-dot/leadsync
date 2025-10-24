const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || './data/leadsync.db';
const dbDir = path.dirname(dbPath);

// Create data directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tag TEXT NOT NULL,
    bot_temperature REAL DEFAULT 0.4,
    brief TEXT NOT NULL,
    resiliancy INTEGER DEFAULT 3,
    booking_readiness INTEGER DEFAULT 2,
    tone TEXT DEFAULT 'Friendly and Casual',
    initial_message TEXT NOT NULL,
    objective TEXT NOT NULL,
    company_information TEXT,
    message_delay_initial INTEGER DEFAULT 30,
    message_delay_standard INTEGER DEFAULT 5,
    cta TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    delay INTEGER DEFAULT 1,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS qualification_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id TEXT NOT NULL,
    text TEXT NOT NULL,
    conditions TEXT,
    delay INTEGER DEFAULT 1,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id TEXT NOT NULL,
    body TEXT NOT NULL,
    delay INTEGER NOT NULL,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS custom_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id TEXT NOT NULL,
    action TEXT NOT NULL,
    rule_condition TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS action_chains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    custom_action_id INTEGER NOT NULL,
    chain_name TEXT NOT NULL,
    chain_order INTEGER NOT NULL,
    FOREIGN KEY (custom_action_id) REFERENCES custom_actions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chain_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chain_id INTEGER NOT NULL,
    step_order INTEGER NOT NULL,
    function TEXT NOT NULL,
    parameters TEXT,
    FOREIGN KEY (chain_id) REFERENCES action_chains(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    contact_name TEXT,
    contact_phone TEXT,
    status TEXT DEFAULT 'active',
    lead_score INTEGER DEFAULT 0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES templates(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS scheduled_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    content TEXT NOT NULL,
    scheduled_for DATETIME NOT NULL,
    sent BOOLEAN DEFAULT 0,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  -- GHL Integration Tables
  CREATE TABLE IF NOT EXISTS ghl_credentials (
    user_id TEXT PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    location_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    ghl_event_id TEXT,
    ghl_calendar_id TEXT,
    contact_id TEXT,
    contact_name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    title TEXT NOT NULL,
    description TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status TEXT DEFAULT 'scheduled',
    appointment_type TEXT,
    location TEXT,
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT 0,
    reminder_sent_at DATETIME,
    synced_to_ghl BOOLEAN DEFAULT 0,
    last_synced_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    ghl_contact_id TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    tags TEXT,
    notes TEXT,
    last_appointment_date DATETIME,
    total_appointments INTEGER DEFAULT 0,
    synced_to_ghl BOOLEAN DEFAULT 0,
    last_synced_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, phone)
  );

  CREATE TABLE IF NOT EXISTS appointment_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id TEXT NOT NULL,
    reminder_type TEXT NOT NULL,
    send_at DATETIME NOT NULL,
    sent BOOLEAN DEFAULT 0,
    sent_at DATETIME,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    sync_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    direction TEXT NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS calendar_settings (
    user_id TEXT PRIMARY KEY,
    default_calendar_id TEXT,
    sync_enabled BOOLEAN DEFAULT 1,
    auto_sync_interval INTEGER DEFAULT 15,
    reminder_sms_enabled BOOLEAN DEFAULT 1,
    reminder_email_enabled BOOLEAN DEFAULT 1,
    reminder_hours_before INTEGER DEFAULT 24,
    business_hours_start TEXT DEFAULT '09:00',
    business_hours_end TEXT DEFAULT '17:00',
    timezone TEXT DEFAULT 'America/New_York',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Create indexes for better query performance
  CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
  CREATE INDEX IF NOT EXISTS idx_appointments_ghl_event_id ON appointments(ghl_event_id);
  CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
  CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
  CREATE INDEX IF NOT EXISTS idx_clients_ghl_contact_id ON clients(ghl_contact_id);
  CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at);
`);

console.log('✅ Database initialized successfully!');
console.log(`📍 Location: ${path.resolve(dbPath)}`);

db.close();

module.exports = db;