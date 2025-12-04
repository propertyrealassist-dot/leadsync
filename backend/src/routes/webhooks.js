const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const webhookService = require('../services/webhookService');
const { authenticateToken } = require('../middleware/auth');

// ======= Helper: API Key validation =======
function validateApiKey(req, res) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.LEADSYNC_API_KEY) {
    console.log('🚫 Invalid API Key:', apiKey);
    res.status(401).json({ error: 'Invalid API Key' });
    return false;
  }
  return true;
}

// ======= GHL Calendar Webhook =======
router.post('/ghl/calendar', async (req, res) => {
  if (!validateApiKey(req, res)) return;

  try {
    const { type, location_id, calendar_id, event } = req.body;
    console.log('📅 GHL calendar webhook received:', type);

    const userRecord = await db.get(
      'SELECT user_id FROM ghl_credentials WHERE location_id = ?',
      [location_id]
    );
    if (!userRecord) return res.status(200).json({ success: true, message: 'No user found' });

    const userId = userRecord.user_id;

    switch (type) {
      case 'CalendarEvent.create':
        await handleEventCreate(userId, event, calendar_id);
        break;
      case 'CalendarEvent.update':
        await handleEventUpdate(userId, event);
        break;
      case 'CalendarEvent.delete':
        await handleEventDelete(userId, event.id);
        break;
      default:
        console.log('⚠️ Unhandled calendar webhook type:', type);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing calendar webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======= GHL Contact Webhook =======
router.post('/ghl/contact', async (req, res) => {
  if (!validateApiKey(req, res)) return;

  try {
    const { type, location_id, contact } = req.body;
    console.log('👤 GHL contact webhook received:', type);

    const userRecord = await db.get(
      'SELECT user_id FROM ghl_credentials WHERE location_id = ?',
      [location_id]
    );
    if (!userRecord) return res.status(200).json({ success: true, message: 'No user found' });

    const userId = userRecord.user_id;

    switch (type) {
      case 'Contact.create':
      case 'Contact.update':
        await handleContactSync(userId, contact);
        break;
      case 'Contact.delete':
        await handleContactDelete(userId, contact.id);
        break;
      default:
        console.log('⚠️ Unhandled contact webhook type:', type);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing contact webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======= Generic Incoming Webhook =======
router.post('/incoming/:source/:userId', async (req, res) => {
  if (!validateApiKey(req, res)) return;

  try {
    const { source, userId } = req.params;
    const payload = req.body;

    console.log(`📥 Incoming webhook received: ${source} for user ${userId}`);
    console.log('📋 FULL PAYLOAD:\n', JSON.stringify(payload, null, 2));

    // Extract key data
    const contactId = payload.contact_id || payload.contact?.id || payload.customData?.clientID;
    const contactName = payload.first_name && payload.last_name
      ? `${payload.first_name} ${payload.last_name}`
      : payload.contact?.name || 'Unknown';
    const message = payload.message?.body || payload.text || '';
    const locationId = payload.location?.id || payload.location_id;
    const conversationId = payload.conversation_id || payload.customData?.conversationID || undefined;
    const clientId = payload.customData?.clientID || undefined;
    const tags = payload.tags ? payload.tags.split(',').map(tag => tag.trim()) : [];
    const timestamp = payload.date_created || payload.customData?.Time || new Date().toISOString();

    console.log('📊 EXTRACTED DATA:');
    console.log(`  Message: ${message}`);
    console.log(`  Contact: ${contactName}`);
    console.log(`  Contact ID: ${contactId}`);
    console.log(`  Location ID: ${locationId}`);
    console.log(`  Conversation ID: ${conversationId}`);
    console.log(`  Client ID: ${clientId}`);
    console.log(`  Tags: ${tags}`);
    console.log(`  Timestamp: ${timestamp}`);

    if (!contactId) {
      console.log('❌ No contact ID found in payload');
    }

    // Verify user exists
    const user = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Process webhook
    const result = await webhookService.processIncomingWebhook(payload, source, db, userId);

    res.json({
      success: true,
      message: 'Webhook processed',
      leadId: result.leadId
    });

  } catch (error) {
    console.error('Incoming webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ======= Test Endpoints =======
router.get('/test', async (req, res) => {
  res.json({ success: true, message: 'Webhook endpoint is working', timestamp: new Date().toISOString() });
});

router.post('/test-incoming', authenticateToken, async (req, res) => {
  try {
    const testData = { name: 'Test Lead', email: 'test@example.com', phone: '+1 555-1234', company: 'Test Co', source: 'test' };
    const result = await webhookService.processIncomingWebhook(testData, 'custom', db, req.user.id);
    res.json({ success: true, message: 'Test webhook processed', leadId: result.leadId });
  } catch (error) {
    console.error('Test incoming webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======= Handlers =======
async function handleEventCreate(userId, event, calendarId) {
  const existing = await db.get('SELECT id FROM appointments WHERE ghl_event_id = ?', [event.id]);
  if (existing) return console.log('Event already exists:', event.id);

  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const durationMinutes = Math.round((end - start) / 60000);

  await db.run(
    `INSERT INTO appointments (
      id, user_id, ghl_event_id, ghl_calendar_id, contact_id, contact_name,
      contact_email, contact_phone, title, start_time, end_time, duration_minutes,
      status, location, synced_to_ghl, last_synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(), userId, event.id, calendarId, event.contactId,
      event.contact?.name || 'Unknown', event.contact?.email, event.contact?.phone,
      event.title, event.startTime, event.endTime, durationMinutes,
      event.appointmentStatus || 'scheduled', event.address, 1, new Date().toISOString()
    ]
  );

  console.log('Created appointment from webhook:', event.id);
}

async function handleEventUpdate(userId, event) {
  const existing = await db.get('SELECT id FROM appointments WHERE ghl_event_id = ? AND user_id = ?', [event.id, userId]);
  if (!existing) return console.log('Event not found for update:', event.id);

  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const durationMinutes = Math.round((end - start) / 60000);

  await db.run(
    `UPDATE appointments SET title=?, start_time=?, end_time=?, duration_minutes=?, status=?, location=?, last_synced_at=? WHERE ghl_event_id=? AND user_id=?`,
    [event.title, event.startTime, event.endTime, durationMinutes, event.appointmentStatus || 'scheduled', event.address, new Date().toISOString(), event.id, userId]
  );

  console.log('Updated appointment from webhook:', event.id);
}

async function handleEventDelete(userId, eventId) {
  await db.run(
    `UPDATE appointments SET status='cancelled', last_synced_at=? WHERE ghl_event_id=? AND user_id=?`,
    [new Date().toISOString(), eventId, userId]
  );
  console.log('Cancelled appointment from webhook:', eventId);
}

async function handleContactSync(userId, contact) {
  const existing = await db.get('SELECT id FROM clients WHERE ghl_contact_id=? AND user_id=?', [contact.id, userId]);

  if (existing) {
    await db.run(
      `UPDATE clients SET first_name=?, last_name=?, email=?, phone=?, address=?, city=?, state=?, postal_code=?, last_synced_at=? WHERE ghl_contact_id=? AND user_id=?`,
      [contact.firstName, contact.lastName, contact.email, contact.phone, contact.address1, contact.city, contact.state, contact.postalCode, new Date().toISOString(), contact.id, userId]
    );
  } else {
    await db.run(
      `INSERT INTO clients (id, user_id, ghl_contact_id, first_name, last_name, email, phone, address, city, state, postal_code, synced_to_ghl, last_synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), userId, contact.id, contact.firstName, contact.lastName, contact.email, contact.phone, contact.address1, contact.city, contact.state, contact.postalCode, 1, new Date().toISOString()]
    );
  }

  console.log('Synced contact from webhook:', contact.id);
}

async function handleContactDelete(userId, contactId) {
  await db.run('DELETE FROM clients WHERE ghl_contact_id=? AND user_id=?', [contactId, userId]);
  console.log('Deleted contact from webhook:', contactId);
}

module.exports = router;
