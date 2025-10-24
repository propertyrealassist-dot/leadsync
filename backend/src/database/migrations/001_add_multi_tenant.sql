-- ==========================================
-- PHASE 1: MULTI-TENANT SAAS DATABASE SCHEMA
-- ==========================================
-- This migration adds multi-tenant support with:
-- 1. Users table for authentication
-- 2. API Keys table for secure access
-- 3. User isolation for all entities

-- ==========================================
-- CREATE USERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
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
  account_status TEXT DEFAULT 'active', -- active, suspended, deleted
  email_verified BOOLEAN DEFAULT 0,

  -- Subscription Info
  plan_type TEXT DEFAULT 'free', -- free, starter, pro, enterprise
  subscription_status TEXT DEFAULT 'active',
  trial_ends_at DATETIME,
  subscription_ends_at DATETIME,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);

-- ==========================================
-- CREATE API KEYS TABLE (Multiple keys per user)
-- ==========================================
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  -- Key Information
  key_name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  api_key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- First 8 chars for display (e.g., "ak_live_...")

  -- Key Status
  active BOOLEAN DEFAULT 1,
  revoked_at DATETIME,

  -- Key Metadata
  last_used_at DATETIME,
  usage_count INTEGER DEFAULT 0,

  -- Permissions (for future use)
  permissions TEXT DEFAULT 'full', -- JSON: ["read", "write", "delete"] or "full"

  -- Rate Limiting
  rate_limit INTEGER DEFAULT 1000, -- requests per hour

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME, -- NULL = never expires

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for api_keys table
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);

-- ==========================================
-- CREATE SESSIONS TABLE (for JWT refresh tokens)
-- ==========================================
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

-- ==========================================
-- ADD USER_ID TO EXISTING TABLES
-- ==========================================

-- Add user_id to templates (if column doesn't exist)
-- SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS
-- So we need to check if column exists first via a different approach
-- For now, we'll use a safer approach with CREATE TABLE IF NOT EXISTS

-- Step 1: Create temporary table with new schema
CREATE TABLE IF NOT EXISTS templates_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Step 2: Copy data from old table to new (if old table exists)
-- This will be handled in the migration script

-- Add user_id to conversations
CREATE TABLE IF NOT EXISTS conversations_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  template_id TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  status TEXT DEFAULT 'active',
  lead_score INTEGER DEFAULT 0,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (template_id) REFERENCES templates(id)
);

-- ==========================================
-- CREATE WEBHOOK LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS webhook_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  client_id TEXT,

  -- Request Info
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  payload TEXT, -- JSON
  headers TEXT, -- JSON

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

-- ==========================================
-- CREATE AUDIT LOG TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,

  -- Action Info
  action TEXT NOT NULL, -- login, logout, create_template, delete_conversation, etc.
  entity_type TEXT, -- template, conversation, appointment, etc.
  entity_id TEXT,

  -- Change Details
  old_value TEXT, -- JSON
  new_value TEXT, -- JSON

  -- Request Info
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamp
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ==========================================
-- CREATE USAGE STATS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS usage_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,

  -- Date for aggregation
  date DATE NOT NULL,

  -- Usage Metrics
  api_calls INTEGER DEFAULT 0,
  conversations_started INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  ai_tokens_used INTEGER DEFAULT 0,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON usage_stats(date);

-- ==========================================
-- UPDATE EXISTING TABLES WITH USER_ID
-- ==========================================
-- Note: The actual data migration will be done in the JavaScript migration script
-- This SQL file defines the schema only

-- ==========================================
-- CREATE DEFAULT SYSTEM USER
-- ==========================================
-- This will be created in the JavaScript migration script
-- with proper API key generation and hashing
