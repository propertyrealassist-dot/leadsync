/**
 * Migration Script: Add Profile Columns to Users Table
 *
 * This script adds phone, timezone, language, profile_image, and banner_image
 * columns to the users table in CockroachDB/PostgreSQL
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? {
    rejectUnauthorized: false
  } : false
});

async function addProfileColumns() {
  let client;

  try {
    console.log('🔧 Starting profile columns migration...');
    console.log('📊 Connecting to database...');

    client = await pool.connect();
    console.log('✅ Connected to database');

    // Check which columns exist
    console.log('📋 Checking existing columns...');
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
    `);

    const existingColumns = result.rows.map(row => row.column_name);
    console.log('✅ Existing columns:', existingColumns.join(', '));

    // Add phone column
    if (!existingColumns.includes('phone')) {
      console.log('➕ Adding phone column...');
      await client.query(`ALTER TABLE users ADD COLUMN phone VARCHAR(50)`);
      console.log('✅ Added phone column');
    } else {
      console.log('ℹ️  phone column already exists');
    }

    // Add timezone column
    if (!existingColumns.includes('timezone')) {
      console.log('➕ Adding timezone column...');
      await client.query(`ALTER TABLE users ADD COLUMN timezone VARCHAR(100) DEFAULT 'America/New_York'`);
      console.log('✅ Added timezone column');
    } else {
      console.log('ℹ️  timezone column already exists');
    }

    // Add language column
    if (!existingColumns.includes('language')) {
      console.log('➕ Adding language column...');
      await client.query(`ALTER TABLE users ADD COLUMN language VARCHAR(10) DEFAULT 'en'`);
      console.log('✅ Added language column');
    } else {
      console.log('ℹ️  language column already exists');
    }

    // Add profile_image column
    if (!existingColumns.includes('profile_image')) {
      console.log('➕ Adding profile_image column...');
      await client.query(`ALTER TABLE users ADD COLUMN profile_image TEXT`);
      console.log('✅ Added profile_image column');
    } else {
      console.log('ℹ️  profile_image column already exists');
    }

    // Add banner_image column
    if (!existingColumns.includes('banner_image')) {
      console.log('➕ Adding banner_image column...');
      await client.query(`ALTER TABLE users ADD COLUMN banner_image TEXT`);
      console.log('✅ Added banner_image column');
    } else {
      console.log('ℹ️  banner_image column already exists');
    }

    // Verify all columns were added
    console.log('🔍 Verifying migration...');
    const verifyResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    const finalColumns = verifyResult.rows.map(row => row.column_name);
    console.log('✅ Final columns:', finalColumns.join(', '));

    const requiredColumns = ['phone', 'timezone', 'language', 'profile_image', 'banner_image'];
    const allPresent = requiredColumns.every(col => finalColumns.includes(col));

    if (allPresent) {
      console.log('🎉 Migration completed successfully! All profile columns are present.');
    } else {
      const missing = requiredColumns.filter(col => !finalColumns.includes(col));
      console.error('⚠️  Migration incomplete. Missing columns:', missing.join(', '));
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run migration
addProfileColumns();
