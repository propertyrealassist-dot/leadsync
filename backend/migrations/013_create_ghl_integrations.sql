-- GHL Integrations Table
-- This table stores OAuth tokens and location information for GoHighLevel integrations
-- Each user can have multiple locations connected

CREATE TABLE IF NOT EXISTS ghl_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id VARCHAR(255) NOT NULL,
  location_name VARCHAR(255),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMP,
  scope TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_ghl_integrations_user_id ON ghl_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_ghl_integrations_location_id ON ghl_integrations(location_id);
CREATE INDEX IF NOT EXISTS idx_ghl_integrations_is_active ON ghl_integrations(is_active);
