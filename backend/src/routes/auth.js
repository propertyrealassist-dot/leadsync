const express = require('express');
const bcrypt = require('bcryptjs');
const { db, generateApiKey, generateUUID, hashApiKey } = require('../config/database');
const { authenticateToken, generateToken } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Generate UUID v4 for Client ID
 */
function generateClientId() {
  return generateUUID();
}

/**
 * Generate unique user ID
 */
function generateUserId() {
  return generateUUID();
}

// ==========================================
// POST /api/auth/register
// Register new user
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, companyName, name } = req.body;

    console.log('Registration request:', { email, name, firstName, lastName, companyName });

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
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists.'
      });
    }

    // Parse name if provided (from frontend "name" field)
    let parsedFirstName = firstName;
    let parsedLastName = lastName;

    if (name && !firstName && !lastName) {
      const nameParts = name.trim().split(' ');
      parsedFirstName = nameParts[0] || null;
      parsedLastName = nameParts.slice(1).join(' ') || null;
      console.log('Parsed name:', { parsedFirstName, parsedLastName });
    }

    // Generate credentials
    const userId = generateUserId();
    const clientId = generateClientId();
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    await db.run(`
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, company_name,
        client_id, api_key, api_key_hash, account_status, email_verified,
        plan_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      userId,
      email.toLowerCase(),
      passwordHash,
      parsedFirstName || null,
      parsedLastName || null,
      companyName || null,
      clientId,
      apiKey,
      apiKeyHash,
      'active',
      0, // email not verified initially
      'free' // default plan
    ]);

    console.log('User created with:', {
      userId,
      email: email.toLowerCase(),
      firstName: parsedFirstName,
      lastName: parsedLastName
    });

    // Generate JWT token
    const token = generateToken(userId);

    // Get created user (without sensitive data)
    const user = await db.get(`
      SELECT id, email, first_name, last_name, company_name,
             client_id, api_key, account_status, plan_type,
             email_verified, created_at
      FROM users
      WHERE id = ?
    `, [userId]);

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
    const user = await db.get(`
      SELECT id, email, password_hash, first_name, last_name, company_name,
             client_id, api_key, account_status, plan_type, email_verified
      FROM users
      WHERE email = ?
    `, [email.toLowerCase()]);

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
    await db.run('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

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
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = req.user; // Set by authenticateToken middleware

    // Format name from firstName and lastName
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';

    console.log('GET /api/auth/me - User data:', {
      id: user.id,
      email: user.email,
      name: name,
      firstName: user.first_name,
      lastName: user.last_name,
      companyName: user.company_name
    });

    res.json({
      id: user.id,
      email: user.email,
      name: name,
      firstName: user.first_name,
      lastName: user.last_name,
      companyName: user.company_name,
      company: user.company_name, // Also include as 'company' for backwards compatibility
      clientId: user.client_id,
      apiKey: user.api_key,
      accountStatus: user.account_status,
      planType: user.plan_type,
      subscriptionPlan: user.plan_type || 'free', // Add subscription plan field
      phone: user.phone || '',
      timezone: user.timezone || 'America/New_York',
      language: user.language || 'en'
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
router.post('/regenerate-api-key', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Generate new API key
    const newApiKey = generateApiKey();
    const newApiKeyHash = hashApiKey(newApiKey);

    // Update user's API key
    await db.run(`
      UPDATE users
      SET api_key = ?, api_key_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newApiKey, newApiKeyHash, userId]);

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
// PUT /api/auth/update-profile
// Update user profile (protected route)
// ==========================================
router.put('/update-profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, company, timezone, language } = req.body;
    const userId = req.user.id;

    // Split name into first and last name
    const nameParts = (name || '').trim().split(' ');
    const firstName = nameParts[0] || null;
    const lastName = nameParts.slice(1).join(' ') || null;

    // Update user profile
    await db.run(`
      UPDATE users
      SET first_name = ?,
          last_name = ?,
          email = ?,
          company_name = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [firstName, lastName, email.toLowerCase(), company || null, userId]);

    // Get updated user
    const user = await db.get(`
      SELECT id, email, first_name, last_name, company_name, client_id, plan_type
      FROM users
      WHERE id = ?
    `, [userId]);

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' '),
          firstName: user.first_name,
          lastName: user.last_name,
          companyName: user.company_name,
          clientId: user.client_id,
          planType: user.plan_type
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile.'
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
    const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [userId]);

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
    await db.run(`
      UPDATE users
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newPasswordHash, userId]);

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
