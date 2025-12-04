const { db } = require('./src/config/database');

async function checkUsers() {
  try {
    console.log('🔍 Checking all users in database...\n');

    const users = await db.all('SELECT id, email, created_at FROM users');

    if (users.length === 0) {
      console.log('❌ No users found in database');
    } else {
      console.log(`✅ Found ${users.length} user(s):\n`);
      users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Created: ${user.created_at}\n`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking users:', error);
    process.exit(1);
  }
}

checkUsers();
