const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

/**
 * GHL Webhook Handler for Calendar Events
 * POST /api/webhooks/ghl/calendar
 */
router.post('/ghl/calendar', async (req, res) => {
  try {
    const { type, location_id, calendar_id, event } = req.body;

    console.log('Received GHL webhook:', type);

    // Find user by location ID
    const userStmt = db.prepare('SELECT user_id FROM ghl_credentials WHERE location_id = ?');
    const userRecord = userStmt.get(location_id);

    if (!userRecord) {
      console.log('No user found for location:', location_id);
      return res.status(200).json({ success: true, message: 'No user found' });
    }

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
        console.log('Unhandled webhook type:', type);
    }

    // Log webhook
    const logStmt = db.prepare(`
      INSERT INTO sync_logs (user_id, sync_type, entity_type, entity_id, direction, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    logStmt.run(userId, 'webhook', 'calendar_event', event?.id || 'unknown', 'inbound', 'success');

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(200).json({ success: true, error: error.message });
  }
});

/**
 * GHL Webhook Handler for Contacts
 * POST /api/webhooks/ghl/contact
 */
router.post('/ghl/contact', async (req, res) => {
  try {
    const { type, location_id, contact } = req.body;

    console.log('Received GHL contact webhook:', type);

    // Find user by location ID
    const userStmt = db.prepare('SELECT user_id FROM ghl_credentials WHERE location_id = ?');
    const userRecord = userStmt.get(location_id);

    if (!userRecord) {
      return res.status(200).json({ success: true, message: 'No user found' });
    }

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
        console.log('Unhandled contact webhook type:', type);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing contact webhook:', error);
    res.status(200).json({ success: true, error: error.message });
  }
});

/**
 * Handle calendar event creation from GHL
 */
async function handleEventCreate(userId, event, calendarId) {
  try {
    // Check if event already exists
    const checkStmt = db.prepare('SELECT id FROM appointments WHERE ghl_event_id = ?');
    const existing = checkStmt.get(event.id);

    if (existing) {
      console.log('Event already exists:', event.id);
      return;
    }

    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const durationMinutes = Math.round((end - start) / (1000 * 60));

    // Insert new appointment
    const stmt = db.prepare(`
      INSERT INTO appointments (
        id, user_id, ghl_event_id, ghl_calendar_id, contact_id,
        contact_name, contact_email, contact_phone, title,
        start_time, end_time, duration_minutes, status, location,
        synced_to_ghl, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      uuidv4(),
      userId,
      event.id,
      calendarId,
      event.contactId,
      event.contact?.name || 'Unknown',
      event.contact?.email,
      event.contact?.phone,
      event.title,
      event.startTime,
      event.endTime,
      durationMinutes,
      event.appointmentStatus || 'scheduled',
      event.address,
      1,
      new Date().toISOString()
    );

    console.log('Created appointment from webhook:', event.id);
  } catch (error) {
    console.error('Error handling event create:', error);
    throw error;
  }
}

/**
 * Handle calendar event update from GHL
 */
async function handleEventUpdate(userId, event) {
  try {
    // Check if event exists
    const checkStmt = db.prepare('SELECT id FROM appointments WHERE ghl_event_id = ? AND user_id = ?');
    const existing = checkStmt.get(event.id, userId);

    if (!existing) {
      console.log('Event not found for update:', event.id);
      return;
    }

    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const durationMinutes = Math.round((end - start) / (1000 * 60));

    // Update appointment
    const stmt = db.prepare(`
      UPDATE appointments
      SET title = ?, start_time = ?, end_time = ?, duration_minutes = ?,
          status = ?, location = ?, last_synced_at = ?
      WHERE ghl_event_id = ? AND user_id = ?
    `);

    stmt.run(
      event.title,
      event.startTime,
      event.endTime,
      durationMinutes,
      event.appointmentStatus || 'scheduled',
      event.address,
      new Date().toISOString(),
      event.id,
      userId
    );

    console.log('Updated appointment from webhook:', event.id);
  } catch (error) {
    console.error('Error handling event update:', error);
    throw error;
  }
}

/**
 * Handle calendar event deletion from GHL
 */
async function handleEventDelete(userId, eventId) {
  try {
    const stmt = db.prepare(`
      UPDATE appointments
      SET status = 'cancelled', last_synced_at = ?
      WHERE ghl_event_id = ? AND user_id = ?
    `);

    stmt.run(new Date().toISOString(), eventId, userId);

    console.log('Cancelled appointment from webhook:', eventId);
  } catch (error) {
    console.error('Error handling event delete:', error);
    throw error;
  }
}

/**
 * Handle contact sync from GHL
 */
async function handleContactSync(userId, contact) {
  try {
    // Check if contact exists
    const checkStmt = db.prepare('SELECT id FROM clients WHERE ghl_contact_id = ? AND user_id = ?');
    const existing = checkStmt.get(contact.id, userId);

    if (existing) {
      // Update existing contact
      const updateStmt = db.prepare(`
        UPDATE clients
        SET first_name = ?, last_name = ?, email = ?, phone = ?,
            address = ?, city = ?, state = ?, postal_code = ?,
            last_synced_at = ?
        WHERE ghl_contact_id = ? AND user_id = ?
      `);

      updateStmt.run(
        contact.firstName,
        contact.lastName,
        contact.email,
        contact.phone,
        contact.address1,
        contact.city,
        contact.state,
        contact.postalCode,
        new Date().toISOString(),
        contact.id,
        userId
      );
    } else {
      // Create new contact
      const insertStmt = db.prepare(`
        INSERT INTO clients (
          id, user_id, ghl_contact_id, first_name, last_name,
          email, phone, address, city, state, postal_code,
          synced_to_ghl, last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        uuidv4(),
        userId,
        contact.id,
        contact.firstName,
        contact.lastName,
        contact.email,
        contact.phone,
        contact.address1,
        contact.city,
        contact.state,
        contact.postalCode,
        1,
        new Date().toISOString()
      );
    }

    console.log('Synced contact from webhook:', contact.id);
  } catch (error) {
    console.error('Error handling contact sync:', error);
    throw error;
  }
}

/**
 * Handle contact deletion from GHL
 */
async function handleContactDelete(userId, contactId) {
  try {
    const stmt = db.prepare('DELETE FROM clients WHERE ghl_contact_id = ? AND user_id = ?');
    stmt.run(contactId, userId);

    console.log('Deleted contact from webhook:', contactId);
  } catch (error) {
    console.error('Error handling contact delete:', error);
    throw error;
  }
}

/**
 * Test webhook endpoint (for testing webhook configuration)
 * GET /api/webhooks/test
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
