#!/usr/bin/env node

/**
 * Migration Script: Add organization_id column to leads table
 *
 * This script safely adds the organization_id column to the existing leads table
 * in production without losing any data. Works with SQLite.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use the same database path as the app
const dbPath = process.env.DATABASE_URL || path.join(__dirname, 'leadsync.db');

async function migrate() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Failed to connect to database:', err.message);
        reject(err);
        return;
      }
      console.log('✅ Connected to database:', dbPath);
    });

    db.serialize(() => {
      // Check if organization_id column already exists
      db.all(`PRAGMA table_info(leads)`, (err, columns) => {
        if (err) {
          console.error('❌ Failed to check table info:', err.message);
          db.close();
          reject(err);
          return;
        }

        const hasOrgColumn = columns.some(col => col.name === 'organization_id');

        if (hasOrgColumn) {
          console.log('✅ organization_id column already exists in leads table');
          db.close();
          resolve();
          return;
        }

        console.log('📝 Adding organization_id column to leads table...');

        // Add the column
        db.run(`ALTER TABLE leads ADD COLUMN organization_id TEXT`, (err) => {
          if (err) {
            console.error('❌ Failed to add column:', err.message);
            db.close();
            reject(err);
            return;
          }

          console.log('✅ Added organization_id column');

          // Add index for better query performance
          db.run(`CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id)`, (err) => {
            if (err) {
              console.error('❌ Failed to add index:', err.message);
              db.close();
              reject(err);
              return;
            }

            console.log('✅ Added index on organization_id');

            // Verify the column was added
            db.all(`PRAGMA table_info(leads)`, (err, updatedColumns) => {
              if (err) {
                console.error('❌ Failed to verify:', err.message);
                db.close();
                reject(err);
                return;
              }

              const orgColumn = updatedColumns.find(col => col.name === 'organization_id');
              if (orgColumn) {
                console.log('✅ Verification successful:');
                console.log('   Column:', orgColumn.name);
                console.log('   Type:', orgColumn.type);
                console.log('   Nullable:', orgColumn.notnull === 0 ? 'YES' : 'NO');
              }

              console.log('✅ Migration completed successfully!');

              db.close((err) => {
                if (err) {
                  console.error('❌ Error closing database:', err.message);
                  reject(err);
                } else {
                  resolve();
                }
              });
            });
          });
        });
      });
    });
  });
}

migrate()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Script failed:', err);
    process.exit(1);
  });
