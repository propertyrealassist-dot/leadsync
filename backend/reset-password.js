const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// CockroachDB connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://leadsync_user:TRFPPeWPbT_gKfGDATrJoA@leadsync-cluster-16344.jxf.gcp-us-east1.cockroachlabs.cloud:26257/leadsync?sslmode=verify-full'
});

async function resetPassword() {
  try {
    const email = 'test@example.com';
    const newPassword = 'password123';

    console.log('🔧 Resetting password for:', email);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email',
      [hashedPassword, email]
    );

    if (result.rows.length > 0) {
      console.log('✅ Password reset successful!');
      console.log('📧 Email:', result.rows[0].email);
      console.log('🔑 New Password: password123');
      console.log('\nYou can now log in with:');
      console.log('   Email: test@example.com');
      console.log('   Password: password123');
    } else {
      console.log('❌ User not found');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    await pool.end();
    process.exit(1);
  }
}

resetPassword();
