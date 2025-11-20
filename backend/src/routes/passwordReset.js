const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../services/emailService');
const { db } = require('../config/database');

/**
 * Password Reset Routes
 * Handles forgot password, token verification, and password reset
 */

/**
 * POST /api/auth/forgot-password
 * Request a password reset
 */
router.post('/forgot-password', async (req, res) => {
  console.log('📧 POST /api/auth/forgot-password');

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    console.log('  Looking for user with email:', email);

    // Find user
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

    // Security best practice: Always return success message even if user doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      console.log('  ⚠️ User not found, but returning success for security');
      return res.json({
        message: 'If an account exists with that email, a password reset link has been sent.'
      });
    }

    console.log('  ✅ User found:', user.id);

    // Generate cryptographically secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetId = uuidv4();
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

    console.log('  🔑 Generated reset token');
    console.log('  ⏰ Expires at:', expiresAt);

    // Save reset token to database
    await db.run(`
      INSERT INTO password_resets (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `, [resetId, user.id, resetToken, expiresAt]);

    console.log('  💾 Reset token saved to database');

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(user.email, resetToken);
      console.log('  ✅ Password reset email sent');
    } catch (emailError) {
      console.error('  ❌ Email sending failed:', emailError.message);
      // Don't reveal email failure to user for security reasons
      // But log it for debugging
    }

    res.json({
      message: 'If an account exists with that email, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

/**
 * GET /api/auth/verify-reset-token/:token
 * Verify if a reset token is valid
 */
router.get('/verify-reset-token/:token', async (req, res) => {
  console.log('🔍 GET /api/auth/verify-reset-token/:token');

  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        valid: false,
        error: 'Token is required'
      });
    }

    console.log('  Verifying token...');

    // Find valid, unused, non-expired reset token
    const reset = await db.get(`
      SELECT pr.*, u.email, u.username
      FROM password_resets pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.token = ?
      AND pr.used = 0
      AND pr.expires_at > datetime('now')
    `, [token]);

    if (!reset) {
      console.log('  ❌ Token invalid, used, or expired');
      return res.status(400).json({
        valid: false,
        error: 'Invalid or expired reset token'
      });
    }

    console.log('  ✅ Token is valid for user:', reset.email);

    res.json({
      valid: true,
      email: reset.email,
      username: reset.username
    });

  } catch (error) {
    console.error('❌ Verify token error:', error);
    res.status(500).json({
      valid: false,
      error: 'Failed to verify token'
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using valid token
 */
router.post('/reset-password', async (req, res) => {
  console.log('🔒 POST /api/auth/reset-password');

  try {
    const { token, newPassword } = req.body;

    // Validate input
    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Token and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long'
      });
    }

    console.log('  Validating reset token...');

    // Find valid reset token
    const reset = await db.get(`
      SELECT * FROM password_resets
      WHERE token = ?
      AND used = 0
      AND expires_at > datetime('now')
    `, [token]);

    if (!reset) {
      console.log('  ❌ Invalid or expired token');
      return res.status(400).json({
        error: 'Invalid or expired reset token'
      });
    }

    console.log('  ✅ Token valid for user:', reset.user_id);
    console.log('  🔐 Hashing new password...');

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log('  💾 Updating user password...');

    // Update user's password
    await db.run(`
      UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [hashedPassword, reset.user_id]);

    console.log('  🔒 Marking token as used...');

    // Mark token as used to prevent reuse
    await db.run(`
      UPDATE password_resets SET used = 1 WHERE id = ?
    `, [reset.id]);

    console.log('  ✅ Password reset successful!');

    res.json({
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      error: 'Failed to reset password'
    });
  }
});

/**
 * GET /api/auth/test-email
 * Test email service configuration (development only)
 */
if (process.env.NODE_ENV === 'development') {
  router.get('/test-email', async (req, res) => {
    console.log('📧 GET /api/auth/test-email');

    try {
      const testEmail = req.query.email || process.env.EMAIL_USER;

      if (!testEmail) {
        return res.status(400).json({
          error: 'Email parameter required or EMAIL_USER must be set'
        });
      }

      // Generate test token
      const testToken = crypto.randomBytes(32).toString('hex');

      // Try sending test email
      await emailService.sendPasswordResetEmail(testEmail, testToken);

      res.json({
        message: 'Test email sent successfully',
        email: testEmail,
        token: testToken,
        resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${testToken}`
      });

    } catch (error) {
      console.error('❌ Test email failed:', error);
      res.status(500).json({
        error: 'Failed to send test email',
        details: error.message
      });
    }
  });
}

module.exports = router;
