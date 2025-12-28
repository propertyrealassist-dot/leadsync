const { Client } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const connectionString = process.env.DATABASE_URL;

async function createUser() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    const email = 'test@example.com';
    const password = 'password123'; // This should be hashed with bcrypt in production
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = require('crypto').randomUUID();

    await client.query(`
      INSERT INTO users (id, email, password, name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
    `, [userId, email, hashedPassword, 'Test User']);

    console.log('✅ User created successfully!');
    console.log('📋 Login credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('🌐 You can now log in at: http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createUser();
