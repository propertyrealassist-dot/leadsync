const jwt = require('jsonwebtoken');
const db = require('../database/db');

// JWT Secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Middleware to verify JWT token
 * Usage: Add this middleware to protected routes
 */
const authenticateToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    // Verify token
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          error: 'Invalid or expired token.'
        });
      }

      // Get user from database
      const user = db.prepare(`
        SELECT id, email, first_name, last_name, company_name,
               client_id, api_key, account_status, plan_type
        FROM users
        WHERE id = ? AND account_status = 'active'
      `).get(decoded.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found or account is inactive.'
        });
      }

      // Attach user to request object
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed.'
    });
  }
};

/**
 * Middleware to verify API key (for webhook endpoints)
 */
const authenticateApiKey = (req, res, next) => {
  try {
    // Get API key from header or query param
    const apiKey = req.headers['x-api-key'] || req.query.api_key;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required.'
      });
    }

    // Find user by API key
    const user = db.prepare(`
      SELECT id, email, first_name, last_name, company_name,
             client_id, api_key, account_status, plan_type
      FROM users
      WHERE api_key = ? AND account_status = 'active'
    `).get(apiKey);

    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'Invalid API key.'
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('API key auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed.'
    });
  }
};

/**
 * Middleware to verify Client ID (for webhook identification)
 */
const authenticateClientId = (req, res, next) => {
  try {
    // Get client ID from header, query param, or request body
    const clientId = req.headers['x-client-id'] ||
                     req.query.client_id ||
                     req.body.client_id;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        error: 'Client ID required.'
      });
    }

    // Find user by client ID
    const user = db.prepare(`
      SELECT id, email, first_name, last_name, company_name,
             client_id, api_key, account_status, plan_type
      FROM users
      WHERE client_id = ? AND account_status = 'active'
    `).get(clientId);

    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'Invalid Client ID.'
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Client ID auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed.'
    });
  }
};

/**
 * Generate JWT token for user
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

module.exports = {
  authenticateToken,
  authenticateApiKey,
  authenticateClientId,
  generateToken,
  JWT_SECRET
};
