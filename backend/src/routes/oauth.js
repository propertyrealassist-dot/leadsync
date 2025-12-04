const express = require('express');
const router = express.Router();
const ghlService = require('../services/ghlService');
const { db } = require('../config/database');

/**
 * GHL OAuth Redirect Handler
 * GET /api/oauth/redirect
 *
 * This is the callback URL configured in your GHL marketplace app:
 * https://api.realassistagents.com/api/oauth/redirect
 */
router.get('/redirect', async (req, res) => {
  try {
    console.log('🔐 GHL OAuth Redirect received');
    console.log('Query params:', req.query);

    const { code, state } = req.query;

    if (!code) {
      console.error('❌ No authorization code provided');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/settings?ghl_error=true&message=no_code`);
    }

    // Exchange authorization code for access token
    console.log('📤 Exchanging code for access token...');
    const tokenData = await ghlService.exchangeCodeForToken(code);
    console.log('✅ Token exchange successful');
    console.log('Token data:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      locationId: tokenData.locationId,
      expiresIn: tokenData.expires_in
    });

    // Extract user ID from state parameter (if provided)
    // In the marketplace flow, we might not have state, so we'll need to handle this
    let userId = null;

    if (state) {
      try {
        // State might be a JWT or encoded user info
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = stateData.userId;
      } catch (e) {
        console.log('Could not parse state parameter, will use first user');
      }
    }

    // If no userId from state, use the first user
    // NOTE: In production, you should implement proper state management with user sessions
    if (!userId) {
      // Try admin user first
      const adminUser = await db.get('SELECT id FROM users WHERE email = ? LIMIT 1', ['admin@leadsync.com']);

      if (adminUser) {
        userId = adminUser.id;
        console.log('📌 Using admin user:', userId);
      } else {
        // Get the first user (fallback)
        const firstUser = await db.get('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
        if (firstUser) {
          userId = firstUser.id;
          console.log('📌 Using first user:', userId);
        } else {
          console.error('❌ No users found in database');
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          return res.redirect(`${frontendUrl}/integrations?ghl_error=true&message=no_user`);
        }
      }
    }

    // Store GHL credentials in database
    console.log('💾 Storing credentials for user:', userId);
    await ghlService.storeCredentials(userId, tokenData);
    console.log('✅ Credentials stored successfully');

    // Redirect to frontend integrations page with success message
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/integrations?ghl_connected=true&location_id=${tokenData.locationId || 'unknown'}`;

    console.log('🔄 Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ Error in GHL OAuth callback:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/integrations?ghl_error=true&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Test endpoint to verify OAuth route is working
 * GET /api/oauth/test
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'OAuth redirect endpoint is working',
    redirectUri: process.env.GHL_REDIRECT_URI || 'Not configured',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
