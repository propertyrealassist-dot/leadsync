#!/usr/bin/env node

/**
 * Auto-run migrations on server startup
 * This ensures all tables exist when deploying to production
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('⚠️  DATABASE_URL not found - skipping migrations');
  process.exit(0);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigrations() {
  console.log('\n🔄 Running database migrations...');

  try {
    const migrationsDir = path.join(__dirname, '../../migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️  No migrations directory found - skipping');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql') && !file.includes('sqlite'))
      .sort();

    console.log(`📁 Found ${migrationFiles.length} migration files`);

    for (const file of migrationFiles) {
      try {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        // Split SQL statements carefully
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
                console.error(`   ⚠️  Error in ${file}:`, error.message);
              }
            }
          }
        }

        console.log(`   ✅ ${file}`);
      } catch (error) {
        console.error(`   ❌ Failed to run ${file}:`, error.message);
      }
    }

    console.log('✅ Migrations complete!\n');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run migrations and exit
runMigrations().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
