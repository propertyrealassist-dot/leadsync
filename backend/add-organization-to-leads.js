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

// Helper function to create lead_activities table
function createLeadActivitiesTable(db, resolve, reject) {
  db.run(`
    CREATE TABLE IF NOT EXISTS lead_activities (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      description TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('❌ Failed to create lead_activities table:', err.message);
      db.close();
      reject(err);
      return;
    }

    console.log('✅ lead_activities table exists');

    // Create indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id)`, (err) => {
      if (err) console.error('Warning: Could not create idx_leads_user_id:', err.message);
    });
    db.run(`CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id)`, (err) => {
      if (err) console.error('Warning: Could not create idx_leads_organization_id:', err.message);
    });
    db.run(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`, (err) => {
      if (err) console.error('Warning: Could not create idx_leads_status:', err.message);
    });
    db.run(`CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id)`, (err) => {
      if (err) console.error('Warning: Could not create idx_lead_activities_lead_id:', err.message);
    });

    console.log('✅ All indexes created');

    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

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
      // First, ensure the leads table exists
      db.run(`
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
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('❌ Failed to create leads table:', err.message);
          db.close();
          reject(err);
          return;
        }

        console.log('✅ Leads table exists');

        // Now check if organization_id column already exists
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

            // Also ensure lead_activities table exists
            createLeadActivitiesTable(db, resolve, reject);
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

              console.log('✅ organization_id column migration completed!');

              // Now create lead_activities table
              createLeadActivitiesTable(db, resolve, reject);
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
