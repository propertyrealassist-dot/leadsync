const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../database/db');
const { authenticateToken, generateToken } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Generate unique API key (32 characters, alphanumeric)
 */
function generateApiKey(prefix = 'ak_live') {
  const randomBytes = crypto.randomBytes(24);
  const key = randomBytes.toString('base64')
    .replace(/\+/g, '')
    .replace(/\//g, '')
    .replace(/=/g, '')
    .substring(0, 32);
  return `${prefix}_${key}`;
}

/**
 * Generate UUID v4 for Client ID
 */
function generateClientId() {
  return crypto.randomUUID();
}

/**
 * Generate unique user ID
 */
function generateUserId() {
  return crypto.randomUUID();
}

/**
 * Hash API key using SHA-256
 */
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// ==========================================
// POST /api/auth/register
// Register new user
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, companyName } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long.'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format.'
      });
    }

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists.'
      });
    }

    // Generate credentials
    const userId = generateUserId();
    const clientId = generateClientId();
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    db.prepare(`
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, company_name,
        client_id, api_key, api_key_hash, account_status, email_verified,
        plan_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      userId,
      email.toLowerCase(),
      passwordHash,
      firstName || null,
      lastName || null,
      companyName || null,
      clientId,
      apiKey,
      apiKeyHash,
      'active',
      0, // email not verified initially
      'free' // default plan
    );

    // Generate JWT token
    const token = generateToken(userId);

    // Get created user (without sensitive data)
    const user = db.prepare(`
      SELECT id, email, first_name, last_name, company_name,
             client_id, api_key, account_status, plan_type,
             email_verified, created_at
      FROM users
      WHERE id = ?
    `).get(userId);

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          companyName: user.company_name,
          clientId: user.client_id,
          apiKey: user.api_key, // Return on registration only
          accountStatus: user.account_status,
          planType: user.plan_type,
          emailVerified: user.email_verified,
          createdAt: user.created_at
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    // Return detailed error in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json({
      success: false,
      error: isDevelopment ? error.message : 'Registration failed. Please try again.',
      details: isDevelopment ? {
        code: error.code,
        message: error.message,
        hint: error.code === 'SQLITE_ERROR' ? 'Database table may not exist. Run migration first.' : null
      } : undefined
    });
  }
});

// ==========================================
// POST /api/auth/login
// Login user
// ==========================================
router.post('/login', async (req, res) => {
  try {
    // Log incoming request for debugging
    console.log('Login request received');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Body type:', typeof req.body);

    // Check if body exists and is an object
    if (!req.body || typeof req.body !== 'object') {
      console.error('Invalid request body:', req.body);
      return res.status(400).json({
        success: false,
        error: 'Invalid request format. Expected JSON.'
      });
    }

    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      console.log('Missing credentials:', { hasEmail: !!email, hasPassword: !!password });
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    console.log('Attempting login for:', email);

    // Find user
    const user = db.prepare(`
      SELECT id, email, password_hash, first_name, last_name, company_name,
             client_id, api_key, account_status, plan_type, email_verified
      FROM users
      WHERE email = ?
    `).get(email.toLowerCase());

    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    console.log('User found:', user.id);

    // Check account status
    if (user.account_status !== 'active') {
      console.log('Account not active:', user.account_status);
      return res.status(403).json({
        success: false,
        error: 'Account is suspended or deleted.'
      });
    }

    // Verify password
    console.log('Verifying password...');
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    console.log('Password verified, updating last login...');

    // Update last login time
    db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(user.id);

    // Generate JWT token
    console.log('Generating JWT token...');
    const token = generateToken(user.id);

    console.log('Login successful for:', email);

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          companyName: user.company_name,
          clientId: user.client_id,
          apiKey: user.api_key,
          accountStatus: user.account_status,
          planType: user.plan_type,
          emailVerified: user.email_verified
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    // Return detailed error in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json({
      success: false,
      error: isDevelopment ? error.message : 'Login failed. Please try again.',
      details: isDevelopment ? {
        code: error.code,
        message: error.message
      } : undefined
    });
  }
});

// ==========================================
// GET /api/auth/me
// Get current user info (protected route)
// ==========================================
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = req.user; // Set by authenticateToken middleware

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          companyName: user.company_name,
          clientId: user.client_id,
          apiKey: user.api_key,
          accountStatus: user.account_status,
          planType: user.plan_type
        }
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user information.'
    });
  }
});

// ==========================================
// POST /api/auth/regenerate-api-key
// Regenerate API key for current user (protected route)
// ==========================================
router.post('/regenerate-api-key', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    // Generate new API key
    const newApiKey = generateApiKey();
    const newApiKeyHash = hashApiKey(newApiKey);

    // Update user's API key
    db.prepare(`
      UPDATE users
      SET api_key = ?, api_key_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newApiKey, newApiKeyHash, userId);

    res.json({
      success: true,
      message: 'API key regenerated successfully.',
      data: {
        apiKey: newApiKey
      }
    });

  } catch (error) {
    console.error('Regenerate API key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate API key.'
    });
  }
});

// ==========================================
// POST /api/auth/change-password
// Change user password (protected route)
// ==========================================
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long.'
      });
    }

    // Get user's current password hash
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect.'
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newPasswordHash, userId);

    res.json({
      success: true,
      message: 'Password changed successfully.'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password.'
    });
  }
});

module.exports = router;
