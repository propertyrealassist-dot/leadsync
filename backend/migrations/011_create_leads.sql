-- Lead Management Tables Migration

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_id TEXT,

  -- Contact Info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,

  -- Lead Data
  status TEXT DEFAULT 'new',
  source TEXT,
  score INTEGER DEFAULT 0,
  tags TEXT,

  -- Conversation
  conversation_summary TEXT,
  last_message TEXT,
  last_message_at DATETIME,
  message_count INTEGER DEFAULT 0,

  -- Metadata
  custom_fields TEXT,
  notes TEXT,
  assigned_to TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

CREATE TABLE IF NOT EXISTS lead_activities (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
