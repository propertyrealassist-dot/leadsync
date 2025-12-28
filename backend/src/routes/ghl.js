const express = require('express');
const router = express.Router();
const ghlService = require('../services/ghlService');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const { db } = require('../config/database');

// Store state tokens temporarily (in production, use Redis or similar)
const stateTokens = new Map();

/**
 * Initiate GHL OAuth flow for LeadSync
 * GET /api/ghl/auth/start
 */
router.get('/auth/start', authenticateToken, async (req, res) => {
  try {
    // Generate random state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    const userId = req.user?.id || req.query.userId || req.body.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Store state with user ID
    stateTokens.set(state, { userId, timestamp: Date.now() });

    // Clean up old states (older than 10 minutes)
    for (const [key, value] of stateTokens.entries()) {
      if (Date.now() - value.timestamp > 10 * 60 * 1000) {
        stateTokens.delete(key);
      }
    }

    const authUrl = ghlService.getAuthorizationURL(state);

    res.json({
      success: true,
      authUrl,
      message: 'Redirect user to this URL to authorize'
    });
  } catch (error) {
    console.error('Error starting OAuth flow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate authorization'
    });
  }
});

/**
 * OAuth callback handler
 * GET /api/ghl/auth/callback
 */
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code missing'
      });
    }

    // Verify state token
    const stateData = stateTokens.get(state);
    if (!stateData) {
      return res.status(400).json({
        success: false,
        error: 'Invalid state token'
      });
    }

    // Remove used state token
    stateTokens.delete(state);

    // Exchange code for tokens
    const tokenData = await ghlService.exchangeCodeForToken(code);

    // Store credentials
    await ghlService.storeCredentials(stateData.userId, tokenData);

    // Redirect to frontend success page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/settings?ghl_connected=true`);

  } catch (error) {
    console.error('Error in OAuth callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/settings?ghl_error=true`);
  }
});

/**
 * Get GHL connection status
 * GET /api/ghl/status
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || req.body.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    const isConnected = await ghlService.isConnected(userId);

    let locationId = null;
    if (isConnected) {
      locationId = await ghlService.getLocationId(userId);
    }

    res.json({
      success: true,
      connected: isConnected,
      locationId
    });
  } catch (error) {
    console.error('Error checking GHL status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check connection status'
    });
  }
});

/**
 * Connect GHL using Location Access Token (Simple Method - No OAuth)
 * POST /api/ghl/connect
 */
router.post('/connect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || req.body.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { locationId, accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access Token is required'
      });
    }

    // If no locationId provided, try to extract it from the token
    let finalLocationId = locationId;
    let locationName = null;

    // Test the access token and get location info
    try {
      // Try to get locations to verify token and extract locationId
      const axios = require('axios');

      // First, try to get the location associated with this token
      // Location tokens are tied to a specific location, so we can get it from the API
      let testResponse;

      if (finalLocationId) {
        // If locationId provided, test it directly
        testResponse = await ghlService.testAccessToken(accessToken, finalLocationId);
        if (testResponse.success) {
          locationName = testResponse.location?.location?.name || testResponse.location?.name;
        }
      } else {
        // No locationId provided - try to get it from the token
        // Location access tokens include the locationId in their scope
        try {
          const locationsResponse = await axios.get(
            'https://services.leadconnectorhq.com/locations/search',
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Version': '2021-07-28'
              }
            }
          );

          if (locationsResponse.data?.locations && locationsResponse.data.locations.length > 0) {
            finalLocationId = locationsResponse.data.locations[0].id;
            locationName = locationsResponse.data.locations[0].name;
          }
        } catch (searchError) {
          console.log('Could not search locations, trying alternative method...');
        }
      }

      if (!finalLocationId) {
        return res.status(400).json({
          success: false,
          error: 'Could not determine Location ID from token. Please provide both Location ID and Access Token.'
        });
      }

      // Verify the token works with the locationId
      if (!testResponse || !testResponse.success) {
        testResponse = await ghlService.testAccessToken(accessToken, finalLocationId);
        if (!testResponse.success) {
          return res.status(400).json({
            success: false,
            error: 'Invalid access token or location ID'
          });
        }
        locationName = testResponse.location?.location?.name || testResponse.location?.name;
      }

    } catch (error) {
      console.error('Token verification error:', error.response?.data || error.message);
      return res.status(400).json({
        success: false,
        error: 'Failed to verify access token. Please check your credentials.'
      });
    }

    // Store credentials in database
    await db.run(`
      INSERT INTO ghl_credentials
      (user_id, access_token, refresh_token, location_id, expires_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (user_id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        location_id = EXCLUDED.location_id,
        expires_at = EXCLUDED.expires_at,
        updated_at = CURRENT_TIMESTAMP
    `, [
      userId,
      accessToken,
      '', // No refresh token for static access tokens
      finalLocationId,
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year expiry
    ]);

    res.json({
      success: true,
      message: 'GHL account connected successfully',
      locationId: finalLocationId,
      locationName: locationName
    });
  } catch (error) {
    console.error('Error connecting GHL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect account'
    });
  }
});

/**
 * Disconnect GHL
 * POST /api/ghl/disconnect
 */
router.post('/disconnect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || req.body.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    console.log('🔌 Disconnecting GHL for user:', userId);

    // Delete from BOTH tables to ensure complete disconnection
    try {
      await db.run('DELETE FROM ghl_integrations WHERE user_id = ?', [userId]);
      console.log('   ✅ Deleted from ghl_integrations');
    } catch (err) {
      console.log('   ⚠️  ghl_integrations delete:', err.message);
    }

    try {
      await db.run('DELETE FROM ghl_credentials WHERE user_id = ?', [userId]);
      console.log('   ✅ Deleted from ghl_credentials');
    } catch (err) {
      console.log('   ⚠️  ghl_credentials delete:', err.message);
    }

    console.log('✅ GHL completely disconnected for user:', userId);

    res.json({
      success: true,
      message: 'GHL account disconnected'
    });
  } catch (error) {
    console.error('Error disconnecting GHL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect account'
    });
  }
});

/**
 * Get calendars
 * GET /api/ghl/calendars
 */
router.get('/calendars', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || req.body.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    const calendars = await ghlService.getCalendars(userId);

    res.json({
      success: true,
      calendars: calendars.calendars || []
    });
  } catch (error) {
    console.error('Error fetching calendars:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendars'
    });
  }
});

/**
 * Get calendar events
 * GET /api/ghl/calendars/:calendarId/events
 */
router.get('/calendars/:calendarId/events', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || req.body.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    const { calendarId } = req.params;
    const { startTime, endTime } = req.query;

    const events = await ghlService.getCalendarEvents(userId, calendarId, startTime, endTime);

    res.json({
      success: true,
      events: events.events || []
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events'
    });
  }
});

/**
 * Search contacts
 * GET /api/ghl/contacts/search
 */
router.get('/contacts/search', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || req.body.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query required'
      });
    }

    const results = await ghlService.searchContacts(userId, query);

    res.json({
      success: true,
      contacts: results.contacts || []
    });
  } catch (error) {
    console.error('Error searching contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search contacts'
    });
  }
});

module.exports = router;
