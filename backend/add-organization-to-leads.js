#!/usr/bin/env node

/**
 * Migration Script: Add organization_id column to leads table
 *
 * This script safely adds the organization_id column to the existing leads table
 * in production without losing any data.
 */

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function migrate() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if organization_id column already exists
    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'leads'
      AND column_name = 'organization_id'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ organization_id column already exists in leads table');
      await client.end();
      return;
    }

    console.log('📝 Adding organization_id column to leads table...');

    // Add the column
    await client.query(`
      ALTER TABLE leads
      ADD COLUMN organization_id TEXT
    `);

    console.log('✅ Added organization_id column');

    // Add foreign key constraint
    await client.query(`
      ALTER TABLE leads
      ADD CONSTRAINT fk_leads_organization
      FOREIGN KEY (organization_id)
      REFERENCES organizations(id)
      ON DELETE CASCADE
    `);

    console.log('✅ Added foreign key constraint');

    // Add index for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_organization_id
      ON leads(organization_id)
    `);

    console.log('✅ Added index on organization_id');

    // Verify the column was added
    const verify = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'leads'
      AND column_name = 'organization_id'
    `);

    if (verify.rows.length > 0) {
      console.log('✅ Verification successful:');
      console.log('   Column:', verify.rows[0].column_name);
      console.log('   Type:', verify.rows[0].data_type);
      console.log('   Nullable:', verify.rows[0].is_nullable);
    }

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
