/**
 * Database Call Converter
 *
 * This script helps convert synchronous SQLite calls to async PostgreSQL-compatible calls
 * across all route and service files.
 *
 * Usage: node src/scripts/convert-db-calls.js
 */

const fs = require('fs');
const path = require('path');

// Files to convert
const filesToConvert = [
  'src/routes/templates.js',
  'src/routes/ai.js',
  'src/routes/test-ai.js',
  'src/routes/analytics.js',
  'src/routes/webhooks.js',
  'src/routes/booking.js',
  'src/routes/leads.js',
  'src/routes/passwordReset.js',
  'src/routes/calendar.js',
  'src/routes/snapshots.js',
  'src/routes/conversations.js',
  'src/routes/appointments.js',
  'src/routes/ghl.js',
  'src/routes/webhook-ghl.js',
  'src/services/ghlSender.js',
  'src/services/webhookProcessor.js',
  'src/services/appointmentAI.js',
  'src/services/ghlService.js',
  'src/services/conversationEngine.js'
];

/**
 * Convert database import statement
 */
function convertImport(content) {
  // Replace: const db = require('../database/db');
  // With: const { db } = require('../config/database');

  content = content.replace(
    /const db = require\(['"]\.\.\/database\/db['"]\);?/g,
    "const { db } = require('../config/database');"
  );

  return content;
}

/**
 * Convert database calls from sync to async
 */
function convertDatabaseCalls(content) {
  // Pattern 1: db.prepare('...').get(...) -> await db.get('...', [...])
  content = content.replace(
    /db\.prepare\(((?:'[^']*'|"[^"]*"|`[^`]*`))\)\.get\(([^)]*)\)/g,
    (match, query, params) => {
      if (params.trim()) {
        return `await db.get(${query}, [${params}])`;
      } else {
        return `await db.get(${query}, [])`;
      }
    }
  );

  // Pattern 2: db.prepare('...').all(...) -> await db.all('...', [...])
  content = content.replace(
    /db\.prepare\(((?:'[^']*'|"[^"]*"|`[^`]*`))\)\.all\(([^)]*)\)/g,
    (match, query, params) => {
      if (params.trim()) {
        return `await db.all(${query}, [${params}])`;
      } else {
        return `await db.all(${query}, [])`;
      }
    }
  );

  // Pattern 3: db.prepare('...').run(...) -> await db.run('...', [...])
  content = content.replace(
    /db\.prepare\(((?:'[^']*'|"[^"]*"|`[^`]*`))\)\.run\(([^)]*)\)/g,
    (match, query, params) => {
      if (params.trim()) {
        return `await db.run(${query}, [${params}])`;
      } else {
        return `await db.run(${query}, [])`;
      }
    }
  );

  return content;
}

/**
 * Ensure route handlers are async
 */
function ensureAsyncHandlers(content) {
  // Pattern: router.get('/path', (req, res) => {
  // -> router.get('/path', async (req, res) => {

  content = content.replace(
    /router\.(get|post|put|patch|delete)\(([^,]+),\s*(?!async)\(req,\s*res(?:,\s*next)?\)\s*=>\s*\{/g,
    (match, method, path) => {
      return `router.${method}(${path}, async (req, res) => {`;
    }
  );

  // Pattern: router.get('/path', middleware, (req, res) => {
  // -> router.get('/path', middleware, async (req, res) => {

  content = content.replace(
    /router\.(get|post|put|patch|delete)\(([^,]+),\s*([^,]+),\s*(?!async)\(req,\s*res(?:,\s*next)?\)\s*=>\s*\{/g,
    (match, method, path, middleware) => {
      return `router.${method}(${path}, ${middleware}, async (req, res) => {`;
    }
  );

  return content;
}

/**
 * Convert a single file
 */
function convertFile(filePath) {
  const fullPath = path.join(__dirname, '../..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  Skipping ${filePath} (file not found)`);
    return;
  }

  console.log(`🔄 Converting ${filePath}...`);

  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;

    // Apply conversions
    content = convertImport(content);
    content = convertDatabaseCalls(content);
    content = ensureAsyncHandlers(content);

    // Check if anything changed
    if (content === originalContent) {
      console.log(`✅ ${filePath} - No changes needed`);
      return;
    }

    // Backup original file
    const backupPath = fullPath + '.backup';
    fs.writeFileSync(backupPath, originalContent);

    // Write converted file
    fs.writeFileSync(fullPath, content);

    console.log(`✅ ${filePath} - Converted successfully (backup created)`);

  } catch (error) {
    console.error(`❌ Error converting ${filePath}:`, error.message);
  }
}

/**
 * Main conversion process
 */
function main() {
  console.log('🚀 Starting database call conversion...\n');

  let converted = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of filesToConvert) {
    try {
      convertFile(file);
      converted++;
    } catch (error) {
      console.error(`❌ Failed to convert ${file}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Conversion Summary:`);
  console.log(`   ✅ Converted: ${converted}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`\n💡 Tip: Review the changes and test thoroughly before deploying.`);
  console.log(`   Backup files have been created with .backup extension.`);
}

// Run the conversion
if (require.main === module) {
  main();
}

module.exports = { convertFile, convertImport, convertDatabaseCalls, ensureAsyncHandlers };
