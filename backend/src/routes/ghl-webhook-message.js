// backend/src/routes/ghl-webhook-message.js
// Handles inbound messages from GHL and sends AI responses
// ✅ UPDATED: Now reads from GHL's standard data structure (like AppointWise!)

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const claudeAI = require('../services/claudeAI');
const axios = require('axios');

// Message webhook endpoint
router.post('/message', async (req, res) => {
  try {
    console.log('\n==============================================');
    console.log('📥 INBOUND GHL MESSAGE WEBHOOK');
    console.log('==============================================');
    console.log('📋 FULL PAYLOAD:');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('📋 HEADERS:');
    console.log(JSON.stringify(req.headers, null, 2));
    console.log('==============================================\n');

    // Immediately respond 200 to GHL (best practice)
    res.status(200).json({
      success: true,
      message: 'Webhook received, processing...'
    });

    // Process async (don't block the response)
    processMessage(req.body, req.headers).catch(err => {
      console.error('❌ Error processing message:', err);
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    if (!res.headersSent) {
      res.status(200).json({ success: false, error: error.message });
    }
  }
});

// Process message asynchronously
async function processMessage(data, headers) {
  try {
    console.log('🔍 EXTRACTING DATA FROM GHL PAYLOAD...\n');

    // =========================================
    // ✅ READ FROM GHL'S STANDARD DATA
    // GHL automatically sends all this data!
    // =========================================

    // Message data (sent by GHL automatically)
    const messageBody = data.text || data.body || data.messageBody || data.message?.body;
    const messageType = data.type || data.messageType || data.message?.type || 'SMS';
    const messageDirection = data.direction || data.messageDirection || data.message?.direction || 'inbound';

    // Contact data (sent by GHL automatically)
    // ⚠️ CRITICAL: Check underscore versions FIRST (contact_id, not contactId)
    const contactId = data.contact_id || data.contactId || data.contact?.id;
    const contactName = (data.first_name && data.last_name)
                       ? `${data.first_name} ${data.last_name}`
                       : data.full_name || data.contactName || data.contact?.name ||
                         `${data.contact?.firstName || ''} ${data.contact?.lastName || ''}`.trim() ||
                         'Unknown';
    const contactPhone = data.phone || data.contactPhone || data.contact?.phone;
    const contactEmail = data.email || data.contactEmail || data.contact?.email;
    const contactTags = data.tags || data.contact?.tags || [];

    // Conversation data (sent by GHL automatically)
    // ⚠️ CRITICAL: Check underscore versions FIRST
    const conversationId = data.conversation_id || data.conversationId || data.conversation?.id;
    const locationId = data.location_id || data.locationId || data.location?.id;

    // =========================================
    // ✅ READ FROM CUSTOM DATA (Only 2 fields!)
    // =========================================
    const customData = data.customData || {};
    const clientId = customData.clientID || headers['x-client-id'];
    const timestamp = customData.time || new Date().toISOString();

    console.log('📊 EXTRACTED DATA:');
    console.log('  Message:', messageBody);
    console.log('  Contact:', contactName, `(${contactPhone})`);
    console.log('  Contact ID:', contactId);
    console.log('  Location ID:', locationId);
    console.log('  Conversation ID:', conversationId);
    console.log('  Client ID:', clientId);
    console.log('  Tags:', contactTags);
    console.log('  Timestamp:', timestamp);
    console.log('');

    // Validate required fields
    if (!messageBody) {
      console.error('❌ No message body found in payload');
      return;
    }

    if (!contactId) {
      console.error('❌ No contact ID found in payload');
      return;
    }

    if (!clientId) {
      console.error('❌ No client ID found - check custom data or headers');
      return;
    }

    // =========================================
    // AUTHENTICATE CLIENT
    // =========================================
    console.log('🔐 Authenticating client...');

    const apiKey = headers['x-api-key'];

    const client = await db.get(
      `SELECT * FROM users WHERE client_id = ? AND account_status = 'active' LIMIT 1`,
      [clientId]
    );

    if (!client) {
      console.error('❌ Invalid client ID:', clientId);
      return;
    }

    console.log('✅ Client authenticated:', client.email);

    // =========================================
    // FIND AI STRATEGY
    // =========================================
    console.log('🎯 Finding AI strategy...');

    // Try to find strategy by tag first (most specific)
    let strategy = null;
    if (!strategy && contactTags.length > 0) {
      for (const tag of contactTags) {
        strategy = await db.get(
          `SELECT * FROM templates
           WHERE user_id = ?
           AND LOWER(tag) = LOWER(?)
           LIMIT 1`,
          [client.id, tag]
        );
        if (strategy) break;
      }
    }

    // If still no strategy, use first strategy
    if (!strategy) {
      strategy = await db.get(
        `SELECT * FROM templates
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [client.id]
      );
    }

    if (!strategy) {
      console.error('❌ No AI strategy found for client');

      // Send default response
      await sendMessageToGHL({
        locationId,
        contactId,
        conversationId,
        message: "Thank you for your message! We've received it and will get back to you soon.",
        client
      });

      return;
    }

    console.log('✅ Using strategy:', strategy.name);

    // =========================================
    // GET CONVERSATION HISTORY
    // =========================================
    console.log('📜 Loading conversation history...');

    const history = await db.all(
      `SELECT * FROM conversation_messages
       WHERE ghl_conversation_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [conversationId]
    );

    const conversationHistory = history.reverse().map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.message_body
    }));

    console.log(`  Found ${conversationHistory.length} previous messages`);

    // =========================================
    // STORE INBOUND MESSAGE
    // =========================================
    await db.run(
      `INSERT INTO conversation_messages (
        ghl_conversation_id,
        ghl_contact_id,
        ghl_location_id,
        message_body,
        message_type,
        direction,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [conversationId, contactId, locationId, messageBody, messageType, 'inbound']
    );

    // =========================================
    // GENERATE AI RESPONSE
    // =========================================
    console.log('🤖 Generating AI response...');

    const aiPrompt = buildAIPrompt({
      strategy,
      message: messageBody,
      conversationHistory,
      contactName,
      contactInfo: {
        phone: contactPhone,
        email: contactEmail,
        tags: contactTags
      }
    });

    console.log('📤 Calling Claude AI...');
    console.log('   Prompt length:', aiPrompt.length);
    console.log('   Temperature:', strategy.bot_temperature || 0.7);

    let aiResponse;
    try {
      aiResponse = await claudeAI.processMessage(aiPrompt, {
        temperature: strategy.bot_temperature || 0.7,
        conversationId: conversationId
      });
      console.log('✅ AI response generated:', aiResponse.substring(0, 100) + '...');
    } catch (error) {
      console.error('❌ CRITICAL ERROR generating AI response:', error);
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
      throw error; // Re-throw to see the full error
    }

    // =========================================
    // CHECK FOR BOOKING INTENT
    // =========================================
    const hasBookingIntent = detectBookingIntent(messageBody, aiResponse);

    if (hasBookingIntent) {
      console.log('📅 Booking intent detected!');
    }

    // =========================================
    // SEND RESPONSE TO GHL
    // =========================================
    console.log('📤 Sending response to GHL...');
    console.log('   Location ID:', locationId);
    console.log('   Contact ID:', contactId);
    console.log('   Conversation ID:', conversationId);
    console.log('   Message length:', aiResponse.length);

    try {
      await sendMessageToGHL({
        locationId,
        contactId,
        conversationId,
        message: aiResponse,
        client
      });
      console.log('✅ Response sent to GHL');
    } catch (error) {
      console.error('❌ CRITICAL ERROR sending message to GHL:', error);
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
      throw error; // Re-throw to see the full error
    }

    // =========================================
    // STORE OUTBOUND MESSAGE
    // =========================================
    await db.run(
      `INSERT INTO conversation_messages (
        ghl_conversation_id,
        ghl_contact_id,
        ghl_location_id,
        message_body,
        message_type,
        direction,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [conversationId, contactId, locationId, aiResponse, 'SMS', 'outbound']
    );

    // =========================================
    // UPDATE CONTACT IF BOOKING INTENT
    // =========================================
    if (hasBookingIntent) {
      await updateContactBookingStatus(contactId, locationId, client);
    }

    console.log('✅ MESSAGE PROCESSING COMPLETE\n');

  } catch (error) {
    console.error('❌ Error in processMessage:', error);
    throw error;
  }
}

// Build AI prompt with context
function buildAIPrompt({ strategy, message, conversationHistory, contactName, contactInfo }) {
  let prompt = strategy.system_prompt || strategy.prompt || '';

  // Add contact context
  prompt += `\n\nContact Information:`;
  prompt += `\nName: ${contactName}`;
  if (contactInfo.phone) prompt += `\nPhone: ${contactInfo.phone}`;
  if (contactInfo.email) prompt += `\nEmail: ${contactInfo.email}`;
  if (contactInfo.tags && contactInfo.tags.length > 0) {
    prompt += `\nTags: ${contactInfo.tags.join(', ')}`;
  }

  // Add conversation history
  if (conversationHistory.length > 0) {
    prompt += `\n\nConversation History:`;
    conversationHistory.forEach((msg, i) => {
      prompt += `\n${i + 1}. ${msg.role === 'user' ? contactName : 'AI'}: ${msg.content}`;
    });
  }

  // Add current message
  prompt += `\n\nCurrent Message from ${contactName}: ${message}`;
  prompt += `\n\nRespond naturally and helpfully:`;

  return prompt;
}

// Detect booking intent in messages
function detectBookingIntent(userMessage, aiResponse) {
  const bookingKeywords = [
    'book', 'schedule', 'appointment', 'calendar',
    'available', 'free time', 'meeting', 'call',
    'when can', 'what time', 'availability',
    'reserve', 'confirm', 'reschedule'
  ];

  const combined = (userMessage + ' ' + aiResponse).toLowerCase();

  return bookingKeywords.some(keyword => combined.includes(keyword));
}

// Update contact's booking status in GHL
async function updateContactBookingStatus(contactId, locationId, client) {
  try {
    // Get GHL credentials for this user
    const credentials = await db.get(
      `SELECT * FROM ghl_credentials
       WHERE user_id = ?
       LIMIT 1`,
      [client.id]
    );

    if (!credentials || !credentials.access_token) {
      console.log('⚠️  No GHL credentials found for booking status update');
      return;
    }

    await axios.put(
      `https://services.leadconnectorhq.com/contacts/${contactId}`,
      {
        customFields: [{
          key: 'leadsync_booking_intent',
          field_value: 'interested'
        }]
      },
      {
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Updated contact booking status');
  } catch (error) {
    console.error('❌ Error updating contact:', error.response?.data || error.message);
  }
}

// Send message back to GHL
async function sendMessageToGHL({ locationId, contactId, conversationId, message, client }) {
  try {
    console.log('🔍 Looking for GHL credentials...');
    console.log('   User ID:', client.id);
    console.log('   Location ID:', locationId);

    // Get GHL credentials from the correct table
    const credentials = await db.get(
      `SELECT * FROM ghl_credentials
       WHERE user_id = ?
       LIMIT 1`,
      [client.id]
    );

    console.log('📊 Credentials query result:', credentials ? 'Found' : 'NOT FOUND');

    if (!credentials) {
      console.error('❌ No GHL credentials found for user_id:', client.id);
      console.error('   User needs to connect their GHL account first!');

      // Check what tables exist for debugging
      try {
        const tables = await db.all(
          `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%ghl%'`
        );
        console.error('   GHL-related tables:', tables.map(t => t.name).join(', ') || 'NONE');
      } catch (e) {
        console.error('   Could not query tables:', e.message);
      }

      return;
    }

    if (!credentials.access_token) {
      console.error('❌ Credentials found but no access_token present');
      return;
    }

    const accessToken = credentials.access_token;
    console.log('✅ Access token found, length:', accessToken.length);

    // Send the message
    console.log('📡 Sending to GHL API...');
    const response = await axios.post(
      `https://services.leadconnectorhq.com/conversations/messages`,
      {
        type: 'SMS',
        contactId: contactId,
        message: message
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('📨 Message sent to GHL successfully!');
    console.log('   Response status:', response.status);
    console.log('   Response data:', JSON.stringify(response.data, null, 2));
    return response.data;

  } catch (error) {
    console.error('❌ Error sending message to GHL:');
    console.error('   Status:', error.response?.status);
    console.error('   Status text:', error.response?.statusText);
    console.error('   Response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    throw error;
  }
}

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'GHL message webhook endpoint is running',
    endpoint: '/api/webhook/ghl/message',
    instructions: 'Send POST request with GHL webhook payload'
  });
});

module.exports = router;
