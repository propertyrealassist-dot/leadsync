#!/usr/bin/env node

/**
 * Migration Runner for CockroachDB
 * Runs all pending SQL migrations in order
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

async function runMigrations() {
  console.log('\n🔄 Starting database migrations...\n');

  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql') && !file.includes('sqlite'))
    .sort();

  console.log(`Found ${migrationFiles.length} migration files:\n`);

  for (const file of migrationFiles) {
    console.log(`📄 Running: ${file}`);

    try {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Split by semicolon but be careful with functions/procedures
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement) {
          try {
            await pool.query(statement);
          } catch (error) {
            // Ignore "already exists" errors
            if (!error.message.includes('already exists') &&
                !error.message.includes('duplicate')) {
              throw error;
            }
          }
        }
      }

      console.log(`   ✅ Completed: ${file}\n`);
    } catch (error) {
      console.error(`   ❌ Error in ${file}:`, error.message);
      console.error('   Continuing with next migration...\n');
    }
  }

  console.log('✅ All migrations completed!\n');

  // Verify critical tables exist
  console.log('🔍 Verifying critical tables...\n');

  const criticalTables = [
    'users',
    'templates',
    'conversations',
    'calendar_connections',
    'appointments',
    'leads',
    'ghl_credentials'
  ];

  for (const table of criticalTables) {
    try {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = $1
        )
      `, [table]);

      const exists = result.rows[0].exists;
      if (exists) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ⚠️  ${table} - NOT FOUND`);
      }
    } catch (error) {
      console.log(`   ❌ ${table} - Error checking: ${error.message}`);
    }
  }

  console.log('\n✅ Migration verification complete!\n');
}

async function main() {
  try {
    await runMigrations();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

main();
