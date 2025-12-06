-- Migration: Add ghl_location_id to templates table
-- This allows strategies to be matched to specific LeadConnector locations

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'templates' AND column_name = 'ghl_location_id'
    ) THEN
        ALTER TABLE templates ADD COLUMN ghl_location_id VARCHAR(255);
    END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_templates_ghl_location_id ON templates(ghl_location_id);
