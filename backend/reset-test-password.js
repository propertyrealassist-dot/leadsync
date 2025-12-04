const bcrypt = require('bcryptjs');
const { db } = require('./src/config/database');

async function resetPassword() {
  try {
    const email = 'test@example.com';
    const newPassword = 'password123';

    console.log('🔧 Resetting password for:', email);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    const result = await db.run(
      'UPDATE users SET password_hash = ? WHERE email = ? RETURNING id, email',
      [hashedPassword, email]
    );

    if (result.changes > 0) {
      console.log('✅ Password reset successful!');
      console.log('📧 Email:', email);
      console.log('🔑 New Password: password123');
      console.log('\nYou can now log in with:');
      console.log('   Email: test@example.com');
      console.log('   Password: password123');
    } else {
      console.log('❌ User not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  }
}

resetPassword();
