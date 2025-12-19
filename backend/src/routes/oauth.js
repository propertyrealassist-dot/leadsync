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
  // CRITICAL: This endpoint MUST be public (no auth) because GHL calls it
  console.log('\n🔵🔵🔵 OAUTH REDIRECT HIT - NO AUTH REQUIRED! 🔵🔵🔵');
  console.log('🔵🔵🔵 This proves the endpoint is PUBLIC and accessible');

  try {
    console.log('\n🔐 ========================================');
    console.log('🔐 GHL OAuth Redirect received');
    console.log('🔐 ========================================');
    console.log('Query params:', JSON.stringify(req.query, null, 2));
    console.log('Headers:', JSON.stringify({
      host: req.headers.host,
      origin: req.headers.origin,
      referer: req.headers.referer
    }, null, 2));

    const { code, state, locationId, companyId } = req.query;

    if (!code) {
      console.error('❌ No authorization code provided');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/integrations?ghl_error=true&message=no_code`);
    }

    console.log('✅ Authorization code received:', code.substring(0, 10) + '...');
    console.log('📍 Location ID from query:', locationId);
    console.log('🏢 Company ID from query:', companyId);

    // Exchange authorization code for access token
    console.log('\n📤 Starting token exchange...');
    const tokenData = await ghlService.exchangeCodeForToken(code);
    console.log('✅ Token exchange completed successfully');

    // Merge locationId/companyId from query params if not in tokenData
    if (!tokenData.locationId && locationId) {
      tokenData.locationId = locationId;
      console.log('📍 Added locationId from query params:', locationId);
    }
    if (!tokenData.companyId && companyId) {
      tokenData.companyId = companyId;
      console.log('🏢 Added companyId from query params:', companyId);
    }

    console.log('\n📋 Final token data:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      locationId: tokenData.locationId,
      companyId: tokenData.companyId,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope
    });

    // Extract user ID from state parameter
    let userId = null;

    console.log('\n👤 Determining user ID...');
    console.log('State parameter:', state);

    if (state) {
      try {
        // Decode base64 state parameter
        const decodedState = Buffer.from(state, 'base64').toString('utf-8');
        console.log('Decoded state:', decodedState);

        const stateData = JSON.parse(decodedState);
        userId = stateData.userId;

        if (userId) {
          console.log('✅ User ID extracted from state:', userId);

          // Verify user exists in database
          const userExists = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
          if (!userExists) {
            console.error('❌ User ID from state does not exist in database:', userId);
            userId = null;
          } else {
            console.log('✅ User verified in database');
          }
        }
      } catch (e) {
        console.error('⚠️  Failed to parse state parameter:', e.message);
        console.error('Stack:', e.stack);
      }
    } else {
      console.log('⚠️  No state parameter provided in OAuth callback');
    }

    // If no userId from state, use fallback methods
    if (!userId) {
      console.log('🔍 No valid user ID from state, using fallback methods...');

      // Try admin user first
      const adminUser = await db.get('SELECT id FROM users WHERE email = ? LIMIT 1', ['admin@leadsync.com']);

      if (adminUser) {
        userId = adminUser.id;
        console.log('✅ Using admin user as fallback:', userId);
      } else {
        // Get the first user (last resort fallback)
        const firstUser = await db.get('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
        if (firstUser) {
          userId = firstUser.id;
          console.log('✅ Using first user as fallback:', userId);
        } else {
          console.error('❌ No users found in database');
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          return res.redirect(`${frontendUrl}/integrations?ghl_error=true&message=no_user`);
        }
      }
    }

    // Store GHL credentials in database
    console.log('\n💾 Storing credentials for user:', userId);
    await ghlService.storeCredentials(userId, tokenData);
    console.log('✅ Credentials stored successfully');

    // Redirect to frontend integrations page with success message
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const finalLocationId = tokenData.locationId || tokenData.companyId || 'unknown';
    const redirectUrl = `${frontendUrl}/integrations?connected=true&location_id=${finalLocationId}`;

    console.log('\n🔄 ========================================');
    console.log('🔄 Redirecting to frontend...');
    console.log('🔄 ========================================');
    console.log('URL:', redirectUrl);
    console.log('✅ OAuth flow completed successfully!\n');

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
 * Test endpoint to verify OAuth route is working and PUBLIC (no auth required)
 * GET /api/oauth/test
 */
router.get('/test', (req, res) => {
  console.log('🧪 OAuth test endpoint hit - this is PUBLIC');
  res.json({
    success: true,
    message: 'OAuth routes are PUBLIC and working!',
    note: 'If you can see this, the OAuth endpoint is accessible without authentication',
    redirectUri: process.env.GHL_REDIRECT_URI || 'Not configured',
    timestamp: new Date().toISOString(),
    queryParams: req.query
  });
});

/**
 * Public endpoint specifically for testing redirect without OAuth code
 * GET /api/oauth/redirect?test=true
 */
router.get('/redirect-test', (req, res) => {
  console.log('🧪 OAuth redirect test endpoint hit - this is PUBLIC');
  res.json({
    success: true,
    message: 'OAuth redirect endpoint is PUBLIC and accessible!',
    note: 'GHL can successfully call this endpoint',
    endpoint: '/api/oauth/redirect',
    timestamp: new Date().toISOString(),
    queryParams: req.query
  });
});

/**
 * MIGRATION ENDPOINT: Migrate credentials from ghl_credentials to ghl_integrations
 * GET /api/oauth/migrate-credentials
 *
 * This is a one-time migration to ensure marketplace webhooks can find credentials
 */
router.get('/migrate-credentials', async (req, res) => {
  try {
    console.log('\n🔄 ========================================');
    console.log('🔄 MIGRATING GHL CREDENTIALS');
    console.log('🔄 ========================================\n');

    // Get all credentials from ghl_credentials
    const oldCreds = await db.all(`
      SELECT user_id, location_id, access_token, refresh_token, expires_at
      FROM ghl_credentials
    `);

    if (!oldCreds || oldCreds.length === 0) {
      console.log('❌ No credentials found in ghl_credentials table');
      return res.json({
        success: false,
        message: 'No credentials found to migrate',
        migratedCount: 0
      });
    }

    console.log(`✅ Found ${oldCreds.length} credential(s) to migrate\n`);

    let migratedCount = 0;
    let updatedCount = 0;

    // Migrate each credential
    for (const cred of oldCreds) {
      console.log('📤 Processing credentials for user:', cred.user_id);
      console.log('   Location ID:', cred.location_id);

      // Check if already exists in ghl_integrations
      const existing = await db.get(`
        SELECT id FROM ghl_integrations
        WHERE user_id = ? AND location_id = ?
      `, [cred.user_id, cred.location_id]);

      if (existing) {
        console.log('   ⏭️  Already exists, updating...');

        await db.run(`
          UPDATE ghl_integrations
          SET access_token = ?,
              refresh_token = ?,
              expires_at = ?,
              is_active = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND location_id = ?
        `, [cred.access_token, cred.refresh_token, cred.expires_at, true, cred.user_id, cred.location_id]);

        updatedCount++;
        console.log('   ✅ Updated\n');
      } else {
        console.log('   ➕ Creating new integration...');

        await db.run(`
          INSERT INTO ghl_integrations (
            user_id, location_id, access_token, refresh_token, expires_at, is_active
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [cred.user_id, cred.location_id, cred.access_token, cred.refresh_token, cred.expires_at, true]);

        migratedCount++;
        console.log('   ✅ Created\n');
      }
    }

    console.log('✅ Migration complete!');
    console.log(`   New integrations created: ${migratedCount}`);
    console.log(`   Existing integrations updated: ${updatedCount}\n`);

    // Verify
    const integrations = await db.all(`
      SELECT user_id, location_id, is_active FROM ghl_integrations
    `);

    console.log('📊 Current integrations:');
    integrations.forEach(int => {
      console.log(`   - User: ${int.user_id}, Location: ${int.location_id}, Active: ${int.is_active}`);
    });

    res.json({
      success: true,
      message: 'Migration completed successfully',
      migratedCount,
      updatedCount,
      totalIntegrations: integrations.length,
      integrations: integrations.map(i => ({
        userId: i.user_id,
        locationId: i.location_id,
        isActive: i.is_active
      }))
    });

  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
