#!/usr/bin/env node

/**
 * Emergency table creation script
 * Creates missing tables directly on CockroachDB
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTables() {
  console.log('\n🔧 Creating missing tables on CockroachDB...\n');

  const sql = fs.readFileSync(path.join(__dirname, 'create-missing-tables.sql'), 'utf8');

  try {
    await pool.query(sql);
    console.log('✅ All tables created successfully!\n');

    // Verify tables exist
    const tables = ['calendar_connections', 'leads', 'lead_activities', 'appointments'];
    console.log('🔍 Verifying tables...\n');

    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = $1
        )
      `, [table]);

      if (result.rows[0].exists) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} - NOT FOUND`);
      }
    }

    console.log('\n✅ Done!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTables();
