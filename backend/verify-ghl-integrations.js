#!/usr/bin/env node

/**
 * Verify ghl_integrations table exists and check its structure
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

async function verifyTable() {
  console.log('\n🔍 Verifying ghl_integrations table...\n');

  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'ghl_integrations'
      )
    `);

    const exists = tableCheck.rows[0].exists;

    if (!exists) {
      console.error('❌ ghl_integrations table does NOT exist!');
      process.exit(1);
    }

    console.log('✅ ghl_integrations table exists!\n');

    // Get table structure
    console.log('📋 Table structure:\n');
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'ghl_integrations'
      ORDER BY ordinal_position
    `);

    structure.rows.forEach(col => {
      console.log(`   ${col.column_name.padEnd(20)} ${col.data_type.padEnd(30)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Get indexes
    console.log('\n📋 Indexes:\n');
    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'ghl_integrations'
    `);

    indexes.rows.forEach(idx => {
      console.log(`   ${idx.indexname}`);
    });

    // Check constraints
    console.log('\n📋 Constraints:\n');
    const constraints = await pool.query(`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'ghl_integrations'::regclass
    `);

    constraints.rows.forEach(con => {
      const type = con.contype === 'p' ? 'PRIMARY KEY' :
                   con.contype === 'f' ? 'FOREIGN KEY' :
                   con.contype === 'u' ? 'UNIQUE' :
                   con.contype;
      console.log(`   ${con.conname.padEnd(40)} ${type}`);
    });

    console.log('\n✅ Verification complete!\n');

  } catch (error) {
    console.error('❌ Error verifying table:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyTable();
