/**
 * Add profile_image and banner_image columns to users table
 */
const { db } = require('../config/database');

async function addImageColumns() {
  try {
    console.log('🔧 Adding image columns to users table...');

    // Check if columns already exist
    const tableInfo = await db.all(`PRAGMA table_info(users)`);
    const hasProfileImage = tableInfo.some(col => col.name === 'profile_image');
    const hasBannerImage = tableInfo.some(col => col.name === 'banner_image');

    if (hasProfileImage && hasBannerImage) {
      console.log('✅ Image columns already exist, no migration needed');
      process.exit(0);
    }

    // Add profile_image column if it doesn't exist
    if (!hasProfileImage) {
      await db.run(`
        ALTER TABLE users ADD COLUMN profile_image TEXT
      `);
      console.log('✅ Added profile_image column');
    }

    // Add banner_image column if it doesn't exist
    if (!hasBannerImage) {
      await db.run(`
        ALTER TABLE users ADD COLUMN banner_image TEXT
      `);
      console.log('✅ Added banner_image column');
    }

    console.log('🎉 Image columns migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addImageColumns();
