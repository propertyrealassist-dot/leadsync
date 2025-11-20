#!/usr/bin/env node

/**
 * MIGRATION SCRIPT: SQLite → CockroachDB (PostgreSQL)
 *
 * This script migrates all data from your SQLite database to CockroachDB
 *
 * Usage:
 *   node src/scripts/migrate-to-cockroach.js
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

// SQLite connection
const sqliteDbPath = process.env.DB_PATH || './data/leadsync.db';
let sqlite;

try {
  sqlite = new Database(sqliteDbPath, { readonly: true });
  console.log(`✅ Connected to SQLite database: ${sqliteDbPath}`);
} catch (error) {
  console.error(`❌ Failed to connect to SQLite database at ${sqliteDbPath}`);
  console.error(error.message);
  process.exit(1);
}

// PostgreSQL connection
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? {
    rejectUnauthorized: false
  } : false
});

async function migrateUsers() {
  console.log('\n📦 Migrating users...');

  try {
    // Get all users from SQLite
    const users = sqlite.prepare('SELECT * FROM users').all();

    console.log(`Found ${users.length} users to migrate`);

    for (const user of users) {
      try {
        await pool.query(
          `INSERT INTO users (
            id, email, password_hash, first_name, last_name, company_name,
            client_id, api_key, api_key_hash, account_status, email_verified,
            plan_type, subscription_status, trial_ends_at, subscription_ends_at,
            created_at, updated_at, last_login_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            updated_at = EXCLUDED.updated_at`,
          [
            user.id,
            user.email,
            user.password_hash,
            user.first_name || null,
            user.last_name || null,
            user.company_name || null,
            user.client_id,
            user.api_key,
            user.api_key_hash,
            user.account_status || 'active',
            user.email_verified === 1,
            user.plan_type || 'free',
            user.subscription_status || 'active',
            user.trial_ends_at || null,
            user.subscription_ends_at || null,
            user.created_at || new Date().toISOString(),
            user.updated_at || new Date().toISOString(),
            user.last_login_at || null
          ]
        );
        console.log(`  ✅ Migrated user: ${user.email}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate user ${user.email}:`, error.message);
      }
    }

    console.log(`✅ Users migration complete: ${users.length} users`);
  } catch (error) {
    console.error('❌ Error migrating users:', error);
    throw error;
  }
}

async function migrateTemplates() {
  console.log('\n📦 Migrating templates...');

  try {
    // Get all templates from SQLite
    const templates = sqlite.prepare('SELECT * FROM templates').all();

    console.log(`Found ${templates.length} templates to migrate`);

    for (const template of templates) {
      try {
        // Handle user_id (convert 'default_user' to NULL)
        const userId = template.user_id === 'default_user' ? null : template.user_id;

        await pool.query(
          `INSERT INTO templates (
            id, user_id, name, tag, bot_temperature, brief, resiliancy,
            booking_readiness, tone, initial_message, objective,
            company_information, message_delay_initial, message_delay_standard,
            cta, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            tag = EXCLUDED.tag,
            updated_at = EXCLUDED.updated_at`,
          [
            template.id,
            userId,
            template.name,
            template.tag,
            template.bot_temperature || 0.4,
            template.brief || '',
            template.resiliancy || 3,
            template.booking_readiness || 2,
            template.tone || 'Friendly and Casual',
            template.initial_message || '',
            template.objective || '',
            template.company_information || '',
            template.message_delay_initial || 30,
            template.message_delay_standard || 5,
            template.cta || '',
            template.created_at || new Date().toISOString(),
            template.updated_at || new Date().toISOString()
          ]
        );
        console.log(`  ✅ Migrated template: ${template.name}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate template ${template.name}:`, error.message);
      }
    }

    console.log(`✅ Templates migration complete: ${templates.length} templates`);
  } catch (error) {
    console.error('❌ Error migrating templates:', error);
    throw error;
  }
}

async function migrateFaqs() {
  console.log('\n📦 Migrating FAQs...');

  try {
    const faqs = sqlite.prepare('SELECT * FROM faqs').all();
    console.log(`Found ${faqs.length} FAQs to migrate`);

    for (const faq of faqs) {
      try {
        await pool.query(
          `INSERT INTO faqs (id, template_id, question, answer, delay)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [faq.id, faq.template_id, faq.question, faq.answer, faq.delay || 1]
        );
      } catch (error) {
        console.error(`  ❌ Failed to migrate FAQ:`, error.message);
      }
    }

    console.log(`✅ FAQs migration complete: ${faqs.length} FAQs`);
  } catch (error) {
    console.error('⚠️  Error migrating FAQs:', error.message);
  }
}

async function migrateQualificationQuestions() {
  console.log('\n📦 Migrating qualification questions...');

  try {
    const questions = sqlite.prepare('SELECT * FROM qualification_questions').all();
    console.log(`Found ${questions.length} qualification questions to migrate`);

    for (const question of questions) {
      try {
        await pool.query(
          `INSERT INTO qualification_questions (id, template_id, text, conditions, delay)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [question.id, question.template_id, question.text, question.conditions, question.delay || 1]
        );
      } catch (error) {
        console.error(`  ❌ Failed to migrate question:`, error.message);
      }
    }

    console.log(`✅ Qualification questions migration complete: ${questions.length} questions`);
  } catch (error) {
    console.error('⚠️  Error migrating qualification questions:', error.message);
  }
}

async function migrateFollowUps() {
  console.log('\n📦 Migrating follow-ups...');

  try {
    const followUps = sqlite.prepare('SELECT * FROM follow_ups').all();
    console.log(`Found ${followUps.length} follow-ups to migrate`);

    for (const followUp of followUps) {
      try {
        await pool.query(
          `INSERT INTO follow_ups (id, template_id, body, delay)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING`,
          [followUp.id, followUp.template_id, followUp.body, followUp.delay]
        );
      } catch (error) {
        console.error(`  ❌ Failed to migrate follow-up:`, error.message);
      }
    }

    console.log(`✅ Follow-ups migration complete: ${followUps.length} follow-ups`);
  } catch (error) {
    console.error('⚠️  Error migrating follow-ups:', error.message);
  }
}

async function migrateCustomActions() {
  console.log('\n📦 Migrating custom actions...');

  try {
    const actions = sqlite.prepare('SELECT * FROM custom_actions').all();
    console.log(`Found ${actions.length} custom actions to migrate`);

    for (const action of actions) {
      try {
        await pool.query(
          `INSERT INTO custom_actions (id, template_id, action, rule_condition, description)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [action.id, action.template_id, action.action, action.rule_condition, action.description]
        );
      } catch (error) {
        console.error(`  ❌ Failed to migrate custom action:`, error.message);
      }
    }

    console.log(`✅ Custom actions migration complete: ${actions.length} actions`);
  } catch (error) {
    console.error('⚠️  Error migrating custom actions:', error.message);
  }
}

async function migrateConversations() {
  console.log('\n📦 Migrating conversations...');

  try {
    const conversations = sqlite.prepare('SELECT * FROM conversations').all();
    console.log(`Found ${conversations.length} conversations to migrate`);

    for (const conv of conversations) {
      try {
        const userId = conv.user_id === 'default_user' ? null : conv.user_id;

        await pool.query(
          `INSERT INTO conversations (
            id, user_id, template_id, contact_name, contact_phone,
            status, lead_score, started_at, last_message_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            last_message_at = EXCLUDED.last_message_at`,
          [
            conv.id,
            userId,
            conv.template_id,
            conv.contact_name,
            conv.contact_phone,
            conv.status || 'active',
            conv.lead_score || 0,
            conv.started_at || new Date().toISOString(),
            conv.last_message_at || new Date().toISOString()
          ]
        );
      } catch (error) {
        console.error(`  ❌ Failed to migrate conversation:`, error.message);
      }
    }

    console.log(`✅ Conversations migration complete: ${conversations.length} conversations`);
  } catch (error) {
    console.error('⚠️  Error migrating conversations:', error.message);
  }
}

async function migrateMessages() {
  console.log('\n📦 Migrating messages...');

  try {
    const messages = sqlite.prepare('SELECT * FROM messages').all();
    console.log(`Found ${messages.length} messages to migrate`);

    for (const msg of messages) {
      try {
        await pool.query(
          `INSERT INTO messages (id, conversation_id, sender, content, timestamp)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [msg.id, msg.conversation_id, msg.sender, msg.content, msg.timestamp || new Date().toISOString()]
        );
      } catch (error) {
        console.error(`  ❌ Failed to migrate message:`, error.message);
      }
    }

    console.log(`✅ Messages migration complete: ${messages.length} messages`);
  } catch (error) {
    console.error('⚠️  Error migrating messages:', error.message);
  }
}

async function migrateAppointments() {
  console.log('\n📦 Migrating appointments...');

  try {
    const appointments = sqlite.prepare('SELECT * FROM appointments').all();
    console.log(`Found ${appointments.length} appointments to migrate`);

    for (const apt of appointments) {
      try {
        await pool.query(
          `INSERT INTO appointments (
            id, user_id, ghl_event_id, ghl_calendar_id, contact_id,
            contact_name, contact_email, contact_phone, title, description,
            start_time, end_time, duration_minutes, status, appointment_type,
            location, notes, reminder_sent, reminder_sent_at, synced_to_ghl,
            last_synced_at, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at`,
          [
            apt.id, apt.user_id, apt.ghl_event_id, apt.ghl_calendar_id, apt.contact_id,
            apt.contact_name, apt.contact_email, apt.contact_phone, apt.title, apt.description,
            apt.start_time, apt.end_time, apt.duration_minutes, apt.status || 'scheduled',
            apt.appointment_type, apt.location, apt.notes,
            apt.reminder_sent === 1, apt.reminder_sent_at,
            apt.synced_to_ghl === 1, apt.last_synced_at,
            apt.created_at || new Date().toISOString(),
            apt.updated_at || new Date().toISOString()
          ]
        );
      } catch (error) {
        console.error(`  ❌ Failed to migrate appointment:`, error.message);
      }
    }

    console.log(`✅ Appointments migration complete: ${appointments.length} appointments`);
  } catch (error) {
    console.error('⚠️  Error migrating appointments:', error.message);
  }
}

async function migrateClients() {
  console.log('\n📦 Migrating clients...');

  try {
    const clients = sqlite.prepare('SELECT * FROM clients').all();
    console.log(`Found ${clients.length} clients to migrate`);

    for (const client of clients) {
      try {
        await pool.query(
          `INSERT INTO clients (
            id, user_id, ghl_contact_id, first_name, last_name, email, phone,
            address, city, state, postal_code, tags, notes,
            last_appointment_date, total_appointments, synced_to_ghl,
            last_synced_at, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = EXCLUDED.updated_at`,
          [
            client.id, client.user_id, client.ghl_contact_id, client.first_name,
            client.last_name, client.email, client.phone, client.address, client.city,
            client.state, client.postal_code, client.tags, client.notes,
            client.last_appointment_date, client.total_appointments || 0,
            client.synced_to_ghl === 1, client.last_synced_at,
            client.created_at || new Date().toISOString(),
            client.updated_at || new Date().toISOString()
          ]
        );
      } catch (error) {
        console.error(`  ❌ Failed to migrate client:`, error.message);
      }
    }

    console.log(`✅ Clients migration complete: ${clients.length} clients`);
  } catch (error) {
    console.error('⚠️  Error migrating clients:', error.message);
  }
}

async function migrateGHLCredentials() {
  console.log('\n📦 Migrating GHL credentials...');

  try {
    const credentials = sqlite.prepare('SELECT * FROM ghl_credentials').all();
    console.log(`Found ${credentials.length} GHL credentials to migrate`);

    for (const cred of credentials) {
      try {
        await pool.query(
          `INSERT INTO ghl_credentials (
            user_id, access_token, refresh_token, location_id, expires_at, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (user_id) DO UPDATE SET
            access_token = EXCLUDED.access_token,
            refresh_token = EXCLUDED.refresh_token,
            expires_at = EXCLUDED.expires_at,
            updated_at = EXCLUDED.updated_at`,
          [
            cred.user_id, cred.access_token, cred.refresh_token, cred.location_id,
            cred.expires_at, cred.created_at || new Date().toISOString(),
            cred.updated_at || new Date().toISOString()
          ]
        );
      } catch (error) {
        console.error(`  ❌ Failed to migrate GHL credentials:`, error.message);
      }
    }

    console.log(`✅ GHL credentials migration complete: ${credentials.length} credentials`);
  } catch (error) {
    console.error('⚠️  Error migrating GHL credentials:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting migration from SQLite to CockroachDB...\n');
  console.log('SQLite Path:', sqliteDbPath);
  console.log('Database URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');

  if (!process.env.DATABASE_URL) {
    console.error('\n❌ ERROR: DATABASE_URL environment variable not set!');
    console.error('Please add to your .env file:');
    console.error('DATABASE_URL=postgresql://username:password@host:port/database');
    process.exit(1);
  }

  try {
    // Test PostgreSQL connection
    await pool.query('SELECT 1');
    console.log('✅ Connected to CockroachDB\n');

    // Initialize PostgreSQL schema
    console.log('📋 Initializing CockroachDB schema...');
    const { initializeDatabase } = require('../config/database-postgres');
    await initializeDatabase();

    // Migrate all tables
    await migrateUsers();
    await migrateTemplates();
    await migrateFaqs();
    await migrateQualificationQuestions();
    await migrateFollowUps();
    await migrateCustomActions();
    await migrateConversations();
    await migrateMessages();
    await migrateAppointments();
    await migrateClients();
    await migrateGHLCredentials();

    console.log('\n✅ ========================================');
    console.log('✅ MIGRATION COMPLETE!');
    console.log('✅ ========================================\n');

    console.log('Next steps:');
    console.log('1. Verify your data in CockroachDB');
    console.log('2. Update DB_TYPE=postgres in your .env file');
    console.log('3. Restart your application');
    console.log('4. Test thoroughly before deploying to production\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    sqlite.close();
    await pool.end();
  }
}

// Run migration
main();
