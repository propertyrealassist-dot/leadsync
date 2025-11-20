const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const ghlService = require('../services/ghlService');

/**
 * Get all appointments for user
 * GET /api/appointments
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId || 'default_user';
    const { status, startDate, endDate } = req.query;

    let query = 'SELECT * FROM appointments WHERE user_id = ?';
    const params = [userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (startDate) {
      query += ' AND start_time >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND start_time <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY start_time ASC';

    const stmt = db.prepare(query);
    const appointments = stmt.all(...params);

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointments'
    });
  }
});

/**
 * Get single appointment
 * GET /api/appointments/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId || 'default_user';

    const stmt = db.prepare('SELECT * FROM appointments WHERE id = ? AND user_id = ?');
    const appointment = stmt.get(id, userId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointment'
    });
  }
});

/**
 * Create new appointment
 * POST /api/appointments
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.body.userId || 'default_user';
    const {
      contactName,
      contactEmail,
      contactPhone,
      title,
      description,
      startTime,
      endTime,
      appointmentType,
      location,
      notes,
      syncToGHL,
      calendarId
    } = req.body;

    // Validate required fields
    if (!contactName || !title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const appointmentId = uuidv4();
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = Math.round((end - start) / (1000 * 60));

    let ghlEventId = null;
    let ghlContactId = null;
    let syncedToGHL = false;

    // Sync to GHL if requested and connected
    if (syncToGHL && calendarId) {
      try {
        const isConnected = await ghlService.isConnected(userId);

        if (isConnected) {
          // Get or create contact in GHL
          if (contactPhone || contactEmail) {
            const contact = await ghlService.getOrCreateContact(userId, {
              firstName: contactName.split(' ')[0],
              lastName: contactName.split(' ').slice(1).join(' '),
              email: contactEmail,
              phone: contactPhone
            });
            ghlContactId = contact.id;
          }

          // Create appointment in GHL
          const ghlAppointment = await ghlService.createAppointment(userId, {
            calendarId,
            contactId: ghlContactId,
            startTime: startTime,
            endTime: endTime,
            title,
            address: location,
            notes: notes || description
          });

          ghlEventId = ghlAppointment.id;
          syncedToGHL = true;

          // Log sync
          const logStmt = db.prepare(`
            INSERT INTO sync_logs (user_id, sync_type, entity_type, entity_id, direction, status)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          logStmt.run(userId, 'appointment_create', 'appointment', appointmentId, 'outbound', 'success');
        }
      } catch (syncError) {
        console.error('Error syncing to GHL:', syncError);
        // Continue with local creation even if GHL sync fails
      }
    }

    // Insert appointment into database
    const stmt = db.prepare(`
      INSERT INTO appointments (
        id, user_id, ghl_event_id, ghl_calendar_id, contact_id,
        contact_name, contact_email, contact_phone, title, description,
        start_time, end_time, duration_minutes, status, appointment_type,
        location, notes, synced_to_ghl, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      appointmentId,
      userId,
      ghlEventId,
      calendarId,
      ghlContactId,
      contactName,
      contactEmail,
      contactPhone,
      title,
      description,
      startTime,
      endTime,
      durationMinutes,
      'scheduled',
      appointmentType,
      location,
      notes,
      syncedToGHL ? 1 : 0,
      syncedToGHL ? new Date().toISOString() : null
    );

    // Create reminder if needed
    const settingsStmt = db.prepare('SELECT * FROM calendar_settings WHERE user_id = ?');
    const settings = settingsStmt.get(userId);

    if (settings && (settings.reminder_sms_enabled || settings.reminder_email_enabled)) {
      const reminderTime = new Date(start.getTime() - (settings.reminder_hours_before * 60 * 60 * 1000));

      const reminderStmt = db.prepare(`
        INSERT INTO appointment_reminders (appointment_id, reminder_type, send_at)
        VALUES (?, ?, ?)
      `);

      if (settings.reminder_sms_enabled && contactPhone) {
        reminderStmt.run(appointmentId, 'sms', reminderTime.toISOString());
      }

      if (settings.reminder_email_enabled && contactEmail) {
        reminderStmt.run(appointmentId, 'email', reminderTime.toISOString());
      }
    }

    // Get created appointment
    const getStmt = db.prepare('SELECT * FROM appointments WHERE id = ?');
    const appointment = getStmt.get(appointmentId);

    res.status(201).json({
      success: true,
      appointment,
      syncedToGHL
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create appointment'
    });
  }
});

/**
 * Get appointment statistics
 * GET /api/appointments/stats
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const userId = req.query.userId || 'default_user';

    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM appointments WHERE user_id = ?');
    const total = totalStmt.get(userId).count;

    const todayStmt = db.prepare(`
      SELECT COUNT(*) as count FROM appointments
      WHERE user_id = ? AND DATE(start_time) = DATE('now')
    `);
    const today = todayStmt.get(userId).count;

    const upcomingStmt = db.prepare(`
      SELECT COUNT(*) as count FROM appointments
      WHERE user_id = ? AND start_time > datetime('now') AND status != 'cancelled'
    `);
    const upcoming = upcomingStmt.get(userId).count;

    res.json({
      success: true,
      stats: { total, today, upcoming }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

/**
 * Update appointment
 * PUT /api/appointments/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId || 'default_user';

    // Check if appointment exists
    const checkStmt = db.prepare('SELECT * FROM appointments WHERE id = ? AND user_id = ?');
    const existing = checkStmt.get(id, userId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    const {
      contactName,
      contactEmail,
      contactPhone,
      title,
      description,
      startTime,
      endTime,
      status,
      appointmentType,
      location,
      notes
    } = req.body;

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (contactName !== undefined) { updates.push('contact_name = ?'); params.push(contactName); }
    if (contactEmail !== undefined) { updates.push('contact_email = ?'); params.push(contactEmail); }
    if (contactPhone !== undefined) { updates.push('contact_phone = ?'); params.push(contactPhone); }
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (startTime !== undefined) { updates.push('start_time = ?'); params.push(startTime); }
    if (endTime !== undefined) { updates.push('end_time = ?'); params.push(endTime); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (appointmentType !== undefined) { updates.push('appointment_type = ?'); params.push(appointmentType); }
    if (location !== undefined) { updates.push('location = ?'); params.push(location); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const durationMinutes = Math.round((end - start) / (1000 * 60));
      updates.push('duration_minutes = ?');
      params.push(durationMinutes);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(id, userId);

    const updateStmt = db.prepare(`
      UPDATE appointments
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `);

    updateStmt.run(...params);

    // Sync to GHL if connected
    if (existing.ghl_event_id) {
      try {
        const isConnected = await ghlService.isConnected(userId);
        if (isConnected) {
          await ghlService.updateAppointment(userId, existing.ghl_event_id, {
            startTime,
            endTime,
            title,
            notes: notes || description,
            appointmentStatus: status
          });

          // Update sync timestamp
          const syncStmt = db.prepare('UPDATE appointments SET last_synced_at = ? WHERE id = ?');
          syncStmt.run(new Date().toISOString(), id);
        }
      } catch (syncError) {
        console.error('Error syncing update to GHL:', syncError);
      }
    }

    // Get updated appointment
    const getStmt = db.prepare('SELECT * FROM appointments WHERE id = ?');
    const appointment = getStmt.get(id);

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update appointment'
    });
  }
});

/**
 * Delete appointment
 * DELETE /api/appointments/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId || 'default_user';

    // Get appointment before deleting
    const getStmt = db.prepare('SELECT * FROM appointments WHERE id = ? AND user_id = ?');
    const appointment = getStmt.get(id, userId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Delete from GHL if synced
    if (appointment.ghl_event_id) {
      try {
        const isConnected = await ghlService.isConnected(userId);
        if (isConnected) {
          await ghlService.deleteAppointment(userId, appointment.ghl_event_id);
        }
      } catch (syncError) {
        console.error('Error deleting from GHL:', syncError);
      }
    }

    // Delete from local database
    const deleteStmt = db.prepare('DELETE FROM appointments WHERE id = ? AND user_id = ?');
    deleteStmt.run(id, userId);

    res.json({
      success: true,
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete appointment'
    });
  }
});

/**
 * Get upcoming appointments (next 7 days)
 * GET /api/appointments/upcoming
 */
router.get('/filter/upcoming', async (req, res) => {
  try {
    const userId = req.query.userId || 'default_user';
    const now = new Date().toISOString();
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      SELECT * FROM appointments
      WHERE user_id = ?
        AND start_time >= ?
        AND start_time <= ?
        AND status NOT IN ('cancelled', 'completed')
      ORDER BY start_time ASC
    `);

    const appointments = stmt.all(userId, now, sevenDaysLater);

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming appointments'
    });
  }
});

/**
 * Sync appointments from GHL
 * POST /api/appointments/sync
 */
router.post('/sync', async (req, res) => {
  try {
    const userId = req.body.userId || 'default_user';
    const { calendarId } = req.body;

    if (!calendarId) {
      return res.status(400).json({
        success: false,
        error: 'Calendar ID required'
      });
    }

    const isConnected = await ghlService.isConnected(userId);
    if (!isConnected) {
      return res.status(400).json({
        success: false,
        error: 'GHL not connected'
      });
    }

    // Get events from GHL
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const eventsData = await ghlService.getCalendarEvents(userId, calendarId, startTime, endTime);
    const events = eventsData.events || [];

    let syncedCount = 0;
    let updatedCount = 0;

    for (const event of events) {
      // Check if appointment already exists
      const checkStmt = db.prepare('SELECT * FROM appointments WHERE ghl_event_id = ? AND user_id = ?');
      const existing = checkStmt.get(event.id, userId);

      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      const durationMinutes = Math.round((end - start) / (1000 * 60));

      if (existing) {
        // Update existing appointment
        const updateStmt = db.prepare(`
          UPDATE appointments
          SET title = ?, start_time = ?, end_time = ?, duration_minutes = ?,
              status = ?, location = ?, last_synced_at = ?
          WHERE ghl_event_id = ? AND user_id = ?
        `);

        updateStmt.run(
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

        updatedCount++;
      } else {
        // Create new appointment
        const insertStmt = db.prepare(`
          INSERT INTO appointments (
            id, user_id, ghl_event_id, ghl_calendar_id, contact_id,
            contact_name, contact_email, contact_phone, title,
            start_time, end_time, duration_minutes, status, location,
            synced_to_ghl, last_synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertStmt.run(
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

        syncedCount++;
      }
    }

    res.json({
      success: true,
      synced: syncedCount,
      updated: updatedCount,
      total: events.length
    });
  } catch (error) {
    console.error('Error syncing appointments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync appointments'
    });
  }
});

module.exports = router;
