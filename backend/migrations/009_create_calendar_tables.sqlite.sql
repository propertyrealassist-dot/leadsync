-- Migration: Create Calendar Integration Tables (SQLite)
-- Description: Creates tables for storing Google Calendar connections and appointments

-- Table: calendar_connections
-- Stores OAuth tokens and calendar connection info for each user
CREATE TABLE IF NOT EXISTS calendar_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry DATETIME NOT NULL,
  calendar_id TEXT DEFAULT 'primary',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_id ON calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_provider ON calendar_connections(provider);

-- Table: appointments
-- Stores appointment bookings and their details
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  calendar_connection_id INTEGER NOT NULL,
  event_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  attendee_email TEXT NOT NULL,
  attendee_name TEXT,
  status TEXT DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled', 'rescheduled', 'completed')),
  meeting_link TEXT,
  lead_id INTEGER,
  conversation_id INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (calendar_connection_id) REFERENCES calendar_connections(id) ON DELETE CASCADE,
  UNIQUE(calendar_connection_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_event_id ON appointments(event_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_attendee_email ON appointments(attendee_email);

-- Table: calendar_settings
-- Stores user-specific calendar preferences and working hours
CREATE TABLE IF NOT EXISTS calendar_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  working_hours_start INTEGER DEFAULT 9,
  working_hours_end INTEGER DEFAULT 17,
  time_zone TEXT DEFAULT 'America/New_York',
  default_duration INTEGER DEFAULT 30,
  buffer_time INTEGER DEFAULT 0,
  min_notice_hours INTEGER DEFAULT 24,
  max_days_advance INTEGER DEFAULT 30,
  allow_weekends INTEGER DEFAULT 0,
  auto_confirm INTEGER DEFAULT 1,
  send_reminders INTEGER DEFAULT 1,
  include_video_conference INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

-- Table: appointment_types
-- Defines different types of appointments with custom settings
CREATE TABLE IF NOT EXISTS appointment_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 30,
  color TEXT DEFAULT '#4285F4',
  is_active INTEGER DEFAULT 1,
  questions TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_appointment_types_user_id ON appointment_types(user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_types_is_active ON appointment_types(is_active);

-- Insert default calendar settings for existing users
INSERT OR IGNORE INTO calendar_settings (user_id)
SELECT id FROM users;

-- Insert default appointment types for existing users
INSERT OR IGNORE INTO appointment_types (user_id, name, description, duration, color)
SELECT id, 'Discovery Call', 'Initial consultation with potential client', 30, '#4285F4'
FROM users;

INSERT OR IGNORE INTO appointment_types (user_id, name, description, duration, color)
SELECT id, 'Demo', 'Product demonstration and walkthrough', 45, '#0F9D58'
FROM users;

INSERT OR IGNORE INTO appointment_types (user_id, name, description, duration, color)
SELECT id, 'Follow-up', 'Follow-up discussion with existing lead', 15, '#F4B400'
FROM users;
