const axios = require('axios');
const db = require('../database/db');

/**
 * Send message to GHL contact
 */
async function sendMessage({ contactId, message, conversationId, userId }) {
  try {
    console.log('📤 Sending message to GHL...');
    console.log('Contact ID:', contactId);
    console.log('Message:', message.substring(0, 100) + '...');

    // Get GHL credentials for user
    const credentials = userId ? getGHLCredentials(userId) : null;

    if (!credentials) {
      console.log('⚠️  No GHL credentials found, skipping GHL send');
      console.log('💡 Message would have been sent:', message);
      return {
        success: false,
        skipped: true,
        message: 'No GHL credentials configured'
      };
    }

    // Check if token is expired and refresh if needed
    if (isTokenExpired(credentials.expires_at)) {
      console.log('🔄 Token expired, refreshing...');
      await refreshToken(userId, credentials.refresh_token);
      credentials = getGHLCredentials(userId);
    }

    // Send message via GHL API
    const response = await axios.post(
      `https://rest.gohighlevel.com/v1/conversations/${conversationId}/messages`,
      {
        type: 'SMS',
        message: message,
        contactId: contactId
      },
      {
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Message sent to GHL');

    // Log the outgoing message
    logOutgoingMessage({
      userId,
      contactId,
      conversationId,
      message,
      response: response.data
    });

    return {
      success: true,
      messageId: response.data.id,
      data: response.data
    };

  } catch (error) {
    console.error('❌ Error sending message to GHL:', error.message);

    if (error.response) {
      console.error('GHL API Error:', error.response.status, error.response.data);
    }

    // Log the failed attempt
    logOutgoingMessage({
      userId,
      contactId,
      conversationId,
      message,
      error: error.message
    });

    // Don't throw - we want webhook processing to continue
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send message via GHL webhook (alternative method)
 */
async function sendViaWebhook({ webhookUrl, payload }) {
  try {
    console.log('📤 Sending via webhook:', webhookUrl);

    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ Webhook sent successfully');

    return {
      success: true,
      status: response.status,
      data: response.data
    };

  } catch (error) {
    console.error('❌ Webhook send error:', error.message);

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get GHL credentials for user
 */
function getGHLCredentials(userId) {
  try {
    return db.prepare(`
      SELECT access_token, refresh_token, location_id, expires_at
      FROM ghl_credentials
      WHERE user_id = ?
    `).get(userId);
  } catch (error) {
    console.error('Error getting GHL credentials:', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
function isTokenExpired(expiresAt) {
  if (!expiresAt) return true;
  const expiryTime = new Date(expiresAt).getTime();
  const now = Date.now();
  // Consider expired if less than 5 minutes remaining
  return now >= (expiryTime - 5 * 60 * 1000);
}

/**
 * Refresh GHL access token
 */
async function refreshToken(userId, refreshToken) {
  try {
    console.log('🔄 Refreshing GHL token for user:', userId);

    const response = await axios.post(
      'https://services.leadconnectorhq.com/oauth/token',
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.GHL_CLIENT_ID,
        client_secret: process.env.GHL_CLIENT_SECRET
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token: new_refresh_token, expires_in } = response.data;

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Update credentials in database
    db.prepare(`
      UPDATE ghl_credentials
      SET access_token = ?,
          refresh_token = ?,
          expires_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(access_token, new_refresh_token, expiresAt, userId);

    console.log('✅ Token refreshed successfully');

    return {
      success: true,
      access_token
    };

  } catch (error) {
    console.error('❌ Error refreshing token:', error.message);
    throw error;
  }
}

/**
 * Log outgoing message
 */
function logOutgoingMessage({ userId, contactId, conversationId, message, response, error }) {
  try {
    db.prepare(`
      INSERT INTO webhook_logs (
        user_id, endpoint, method, payload, response_body,
        status_code, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      userId || null,
      'GHL_OUTGOING_MESSAGE',
      'POST',
      JSON.stringify({ contactId, conversationId, message }),
      response ? JSON.stringify(response) : null,
      error ? 500 : 200,
      error || null
    );
  } catch (err) {
    console.error('Error logging outgoing message:', err);
  }
}

/**
 * Send typing indicator to GHL
 */
async function sendTypingIndicator({ conversationId, userId }) {
  try {
    const credentials = getGHLCredentials(userId);
    if (!credentials) return;

    await axios.post(
      `https://rest.gohighlevel.com/v1/conversations/${conversationId}/typing`,
      { typing: true },
      {
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('⌨️  Typing indicator sent');
  } catch (error) {
    console.error('Error sending typing indicator:', error.message);
  }
}

module.exports = {
  sendMessage,
  sendViaWebhook,
  sendTypingIndicator,
  refreshToken
};
