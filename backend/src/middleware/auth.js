const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

// JWT Secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d'; // Extended to 30 days

/**
 * Middleware to verify JWT token
 * Usage: Add this middleware to protected routes
 */
const authenticateToken = async (req, res, next) => {
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

    // Verify token (synchronous)
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ JWT decoded successfully:', { userId: decoded.userId || decoded.id, email: decoded.email });
    } catch (err) {
      console.error('❌ JWT verification failed:', err.message);
      console.error('Token preview:', token.substring(0, 20) + '...');
      console.error('JWT_SECRET exists:', !!JWT_SECRET);
      console.error('JWT_SECRET length:', JWT_SECRET?.length);
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token.',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }

    // Handle both userId and id for backward compatibility
    const userId = decoded.userId || decoded.id;

    if (!userId) {
      console.error('No userId found in token:', decoded);
      return res.status(403).json({
        success: false,
        error: 'Invalid token format.'
      });
    }

    try {
      // Get user from database
      const user = await db.get(`
        SELECT id, email, first_name, last_name, company_name,
               client_id, api_key, account_status, plan_type,
               phone, timezone, language, profile_image, banner_image
        FROM users
        WHERE id = ?
      `, [userId]);

      if (!user) {
        console.error('User not found for id:', userId);
        return res.status(401).json({
          success: false,
          error: 'User not found or account is inactive. Please login again.'
        });
      }

      // Get user's organizations (if table exists)
      let organizations = [];
      try {
        organizations = await db.all(`
          SELECT o.id, o.name, om.role
          FROM organizations o
          INNER JOIN organization_members om ON o.id = om.organization_id
          WHERE om.user_id = ? AND om.status = 'active'
          ORDER BY om.joined_at DESC
        `, [userId]);
      } catch (orgError) {
        // Organizations table might not exist yet, that's okay
        console.log('ℹ️ Organizations not available:', orgError.message);
      }

      console.log('Auth successful for user:', user.email);

      // Get organization ID from header or use first available
      const requestedOrgId = req.headers['x-organization-id'];
      console.log('🏢 Requested organization from header:', requestedOrgId);
      console.log('👥 User has', organizations.length, 'organizations');
      let currentOrganizationId = null;

      if (requestedOrgId && organizations.some(org => org.id === requestedOrgId)) {
        // Use the requested organization if user is a member
        currentOrganizationId = requestedOrgId;
        console.log('✅ Using requested organization:', currentOrganizationId);
      } else if (organizations.length > 0) {
        // Default to first organization
        currentOrganizationId = organizations[0].id;
        console.log('⚠️  Using default (first) organization:', currentOrganizationId);
      } else {
        console.log('❌ No organizations available for user');
      }

      // Attach user and organizations to request object
      req.user = user;
      req.user.id = user.id; // Ensure id is always available
      req.user.organizations = organizations;
      req.user.currentOrganizationId = currentOrganizationId;
      next();
    } catch (dbError) {
      console.error('Database error in auth middleware:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Authentication failed.'
      });
    }
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
const authenticateApiKey = async (req, res, next) => {
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
    const user = await db.get(`
      SELECT id, email, first_name, last_name, company_name,
             client_id, api_key, account_status, plan_type
      FROM users
      WHERE api_key = ? AND account_status = 'active'
    `, [apiKey]);

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
const authenticateClientId = async (req, res, next) => {
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
    const user = await db.get(`
      SELECT id, email, first_name, last_name, company_name,
             client_id, api_key, account_status, plan_type
      FROM users
      WHERE client_id = ? AND account_status = 'active'
    `, [clientId]);

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
