const bcrypt = require('bcryptjs');
const { db, generateUUID, generateApiKey, hashApiKey } = require('./src/config/database');

async function createTestUser() {
  try {
    const email = 'test@example.com';
    const password = 'password123';
    const firstName = 'Test';
    const lastName = 'User';

    console.log('👤 Creating test user...\n');

    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);

    if (existingUser) {
      console.log('⚠️  User already exists. Updating password instead...');

      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update the password
      await db.run(
        'UPDATE users SET password_hash = ? WHERE email = ?',
        [hashedPassword, email]
      );

      console.log('✅ Password updated successfully!');
    } else {
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate UUID and API key
      const userId = generateUUID();
      const clientId = `cl_${generateUUID().substring(0, 16)}`;
      const apiKey = generateApiKey('ak_live');
      const apiKeyHash = hashApiKey(apiKey);

      // Get current datetime
      const now = new Date().toISOString();

      // Create the user
      await db.run(
        `INSERT INTO users (
          id, email, password_hash, first_name, last_name,
          client_id, api_key, api_key_hash,
          account_status, email_verified, plan_type, subscription_status,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, email, hashedPassword, firstName, lastName,
          clientId, apiKey, apiKeyHash,
          'active', 1, 'professional', 'active',
          now
        ]
      );

      console.log('✅ User created successfully!');
    }

    console.log('\n📋 Login credentials:');
    console.log('   Email: test@example.com');
    console.log('   Password: password123');
    console.log('\n🌐 You can now log in at: http://localhost:3000/login');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();
