const Database = require('better-sqlite3');
const crypto = require('crypto');

const dbPath = process.env.DB_PATH || './data/leadsync.db';
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Get user ID from command line or use default
const userId = process.argv[2] || 'a6083797-2979-4597-a51e-199873e4e619'; // Test user's ID

console.log('📋 Creating sample AI strategy...\n');

const strategyId = crypto.randomUUID();
const tag = 'sales';

// Check if strategy with this tag already exists
const existing = db.prepare(`
  SELECT id, name FROM templates
  WHERE user_id = ? AND tag = ?
`).get(userId, tag);

if (existing) {
  console.log('⚠️  Strategy already exists:');
  console.log('   ID:', existing.id);
  console.log('   Name:', existing.name);
  console.log('   Tag:', tag);
  console.log('\n✅ You can use this strategy for testing');
  process.exit(0);
}

// Create sample strategy
db.prepare(`
  INSERT INTO templates (
    id, user_id, name, tag, bot_temperature, brief,
    resiliancy, booking_readiness, tone, initial_message,
    objective, company_information, message_delay_initial,
    message_delay_standard, cta, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`).run(
  strategyId,
  userId,
  'Sales Assistant',
  tag,
  0.7,
  'An AI assistant that helps qualify leads and schedule appointments for a home services business.',
  3,
  2,
  'Friendly and Professional',
  'Hi! Thanks for reaching out. I\'m here to help you schedule an appointment. What service are you interested in?',
  'Qualify the lead by understanding their needs and schedule an appointment',
  'ABC Home Services - We provide plumbing, electrical, and HVAC services in the greater metro area.',
  30,
  5,
  'Schedule an appointment',
);

console.log('✅ Sample strategy created successfully!\n');
console.log('📋 Strategy Details:');
console.log('   ID:', strategyId);
console.log('   Name: Sales Assistant');
console.log('   Tag:', tag);
console.log('   User ID:', userId);
console.log('\n💡 GHL contacts with the "' + tag + '" tag will use this strategy');
console.log('\n🧪 Test with:');
console.log('   node test-webhook.js <client-id> "I need a plumber"');

db.close();
