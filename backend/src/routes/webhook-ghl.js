const express = require('express');
const { db } = require('../config/database');
const { authenticateClientId } = require('../middleware/auth');
const webhookProcessor = require('../services/webhookProcessor');

const router = express.Router();

// ==========================================
// POST /api/webhook/ghl
// Main GHL webhook receiver
// ==========================================
router.post('/ghl', async (req, res) => {
  const startTime = Date.now();
  let webhookLogId = null;

  try {
    console.log('🔔 GHL Webhook received');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // Get Client ID from multiple possible sources
    const clientId = req.headers['x-client-id'] ||
                     req.query.client_id ||
                     req.body.client_id ||
                     req.body.customData?.client_id ||
                     req.body.customData?.clientID;

    // Get Location ID for marketplace webhooks
    const locationId = req.body.locationId || req.body.location?.id;

    // Log incoming webhook
    const logResult = await db.run(`
      INSERT INTO webhook_logs (
        client_id, endpoint, method, payload, headers,
        status_code, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [clientId || locationId || 'unknown',
      '/api/webhook/ghl',
      'POST',
      JSON.stringify(req.body),
      JSON.stringify(req.headers),
      null // Will update after processing
    ]);

    webhookLogId = logResult.lastInsertRowid;

    let user = null;

    // Try to authenticate by Client ID first
    if (clientId) {
      console.log('🔐 Authenticating by Client ID:', clientId);
      user = await db.get(`
        SELECT id, email, client_id, api_key, account_status
        FROM users
        WHERE client_id = ? AND account_status = 'active'
      `, [clientId]);
    }

    // If no user found by clientId, try locationId (marketplace webhooks)
    if (!user && locationId) {
      console.log('🔐 Authenticating by Location ID:', locationId);

      // Find user who has GHL integration with this location
      const integration = await db.get(`
        SELECT user_id FROM ghl_integrations
        WHERE location_id = ? AND is_active = ?
        LIMIT 1
      `, [locationId, true]);

      if (integration) {
        user = await db.get(`
          SELECT id, email, client_id, api_key, account_status
          FROM users
          WHERE id = ? AND account_status = 'active'
        `, [integration.user_id]);
      }
    }

    if (!user) {
      console.log('❌ Authentication failed. ClientID:', clientId, 'LocationID:', locationId);

      await db.run(`
        UPDATE webhook_logs
        SET status_code = ?, error_message = ?, processing_time_ms = ?
        WHERE id = ?
      `, [401, 'Invalid Client ID or Location ID', Date.now() - startTime, webhookLogId]);

      return res.status(401).json({
        success: false,
        error: 'Authentication failed. User not found for this Client ID or Location ID.'
      });
    }

    console.log('✅ User authenticated:', user.email);

    // Return 200 OK immediately to GHL
    res.status(200).json({
      success: true,
      message: 'Webhook received and processing'
    });

    // Process webhook asynchronously
    setImmediate(async () => {
      try {
        await webhookProcessor.processIncomingMessage({
          webhookLogId,
          user,
          payload: req.body,
          startTime
        });
      } catch (error) {
        console.error('❌ Async processing error:', error);

        await db.run(`
          UPDATE webhook_logs
          SET error_message = ?, processing_time_ms = ?
          WHERE id = ?
        `, [error.message, Date.now() - startTime, webhookLogId]);
      }
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);

    if (webhookLogId) {
      await db.run(`
        UPDATE webhook_logs
        SET status_code = ?, error_message = ?, processing_time_ms = ?
        WHERE id = ?
      `, [500, error.message, Date.now() - startTime, webhookLogId]);
    }

    // If response not sent yet
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Webhook processing failed',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// ==========================================
// POST /api/webhook/test
// Test endpoint for simulating GHL webhooks
// ==========================================
router.post('/test', async (req, res) => {
  try {
    console.log('🧪 Test webhook received');

    const { clientId, message, contactName, contactPhone, tag } = req.body;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        error: 'clientId is required for testing'
      });
    }

    // Simulate GHL webhook payload
    const simulatedPayload = {
      type: 'InboundMessage',
      message: {
        body: message || 'Test message',
        direction: 'inbound',
        type: 'SMS',
        contactId: 'test-contact-' + Date.now(),
        conversationId: 'test-conv-' + Date.now(),
        messageType: 'SMS'
      },
      contact: {
        id: 'test-contact-' + Date.now(),
        name: contactName || 'Test Contact',
        phone: contactPhone || '+1234567890',
        email: 'test@example.com',
        tags: tag ? [tag] : ['test-tag']
      },
      location: {
        id: 'test-location'
      },
      client_id: clientId,
      customData: {
        client_id: clientId
      }
    };

    console.log('Simulated payload:', JSON.stringify(simulatedPayload, null, 2));

    // Process through the same webhook processor
    const result = await webhookProcessor.processIncomingMessage({
      webhookLogId: null,
      user: await db.get(`
        SELECT id, email, client_id, api_key, account_status
        FROM users
        WHERE client_id = ?
      `, [clientId]),
      payload: simulatedPayload,
      startTime: Date.now(),
      isTest: true
    });

    res.json({
      success: true,
      message: 'Test webhook processed',
      result: result,
      simulatedPayload: simulatedPayload
    });

  } catch (error) {
    console.error('❌ Test webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ==========================================
// GET /api/webhook/logs
// Get webhook logs for debugging
// ==========================================
router.get('/logs', async (req, res) => {
  try {
    const { clientId, limit = 50 } = req.query;

    let query = 'SELECT * FROM webhook_logs';
    let params = [];

    if (clientId) {
      query += ' WHERE client_id = ?';
      params.push(clientId);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const logs = await db.all(query, params);

    // Parse JSON fields
    logs.forEach(log => {
      try {
        log.payload = JSON.parse(log.payload);
        log.headers = JSON.parse(log.headers);
        if (log.response_body) {
          log.response_body = JSON.parse(log.response_body);
        }
      } catch (e) {
        // Keep as string if parse fails
      }
    });

    res.json({
      success: true,
      count: logs.length,
      logs: logs
    });

  } catch (error) {
    console.error('❌ Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
