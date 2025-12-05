-- Migration: Add ghl_location_id to templates table
-- This allows strategies to be matched to specific LeadConnector locations

ALTER TABLE templates ADD COLUMN IF NOT EXISTS ghl_location_id VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_templates_ghl_location_id ON templates(ghl_location_id);
