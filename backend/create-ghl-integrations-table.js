#!/usr/bin/env node

/**
 * Create ghl_integrations table directly in CockroachDB
 */

require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createTable() {
  console.log('\n🔄 Creating ghl_integrations table...\n');

  try {
    // Create the table
    await pool.query(`
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
      )
    `);

    console.log('✅ Created ghl_integrations table\n');

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ghl_integrations_user_id ON ghl_integrations(user_id)
    `);
    console.log('✅ Created index: idx_ghl_integrations_user_id');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ghl_integrations_location_id ON ghl_integrations(location_id)
    `);
    console.log('✅ Created index: idx_ghl_integrations_location_id');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ghl_integrations_is_active ON ghl_integrations(is_active)
    `);
    console.log('✅ Created index: idx_ghl_integrations_is_active\n');

    // Verify the table was created
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'ghl_integrations'
      )
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ Table verification successful!\n');

      // Show table structure
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'ghl_integrations'
        ORDER BY ordinal_position
      `);

      console.log('📋 Table structure:');
      structure.rows.forEach(col => {
        console.log(`   ${col.column_name.padEnd(20)} ${col.data_type.padEnd(30)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      console.log('\n✅ ghl_integrations table created successfully!\n');
    } else {
      console.error('❌ Table verification failed!');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTable();
