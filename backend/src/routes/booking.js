const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const emailService = require('../services/emailService');
const db = require('../database/db');

// Get available time slots (PUBLIC - no auth required)
router.get('/availability/:templateId', async (req, res) => {
  try {
    const { date } = req.query;
    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.templateId);

    if (!template) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    // Parse availability settings
    let availability = {
      businessHours: { start: '09:00', end: '17:00' },
      timezone: 'America/New_York'
    };

    if (template.availability_settings) {
      try {
        availability = JSON.parse(template.availability_settings);
      } catch (e) {
        console.error('Failed to parse availability settings:', e);
      }
    }

    // Get existing appointments for this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedSlots = db.prepare(`
      SELECT start_time, end_time FROM appointments
      WHERE template_id = ?
      AND start_time >= ?
      AND start_time <= ?
      AND status != 'cancelled'
    `).all(req.params.templateId, startOfDay.toISOString(), endOfDay.toISOString());

    // Generate available slots (30min intervals)
    const slots = [];
    const [startHour, startMin] = availability.businessHours.start.split(':');
    const [endHour, endMin] = availability.businessHours.end.split(':');

    let currentTime = new Date(date);
    currentTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);

    const endTime = new Date(date);
    endTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + 30 * 60000); // 30 min

      // Check if slot is available
      const isBooked = bookedSlots.some(booking => {
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);
        return currentTime < bookingEnd && slotEnd > bookingStart;
      });

      if (!isBooked && currentTime > new Date()) { // Only future slots
        slots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString(),
          display: currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })
        });
      }

      currentTime = slotEnd;
    }

    res.json({ slots, timezone: availability.timezone });

  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Book appointment (PUBLIC - no auth required)
router.post('/book/:templateId', async (req, res) => {
  try {
    const { name, email, phone, startTime, notes } = req.body;

    if (!name || !email || !startTime) {
      return res.status(400).json({ error: 'Name, email, and time are required' });
    }

    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.templateId);
    if (!template) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    // Check if slot is still available
    const start = new Date(startTime);
    const end = new Date(start.getTime() + 30 * 60000); // 30 min default

    const existingBooking = db.prepare(`
      SELECT id FROM appointments
      WHERE template_id = ?
      AND start_time < ?
      AND end_time > ?
      AND status != 'cancelled'
    `).get(req.params.templateId, end.toISOString(), start.toISOString());

    if (existingBooking) {
      return res.status(409).json({ error: 'This time slot is no longer available' });
    }

    // Create appointment
    const appointmentId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO appointments (
        id, user_id, template_id, attendee_name, attendee_email,
        attendee_phone, start_time, end_time, status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      appointmentId,
      template.user_id,
      template.id,
      name,
      email,
      phone || null,
      start.toISOString(),
      end.toISOString(),
      'scheduled',
      notes || null,
      now
    );

    // Create lead
    const leadId = uuidv4();
    db.prepare(`
      INSERT INTO leads (
        id, user_id, template_id, name, email, phone,
        source, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      leadId,
      template.user_id,
      template.id,
      name,
      email,
      phone || null,
      'booking_widget',
      'contacted',
      now,
      now
    );

    // Send confirmation email to attendee
    try {
      await emailService.sendAppointmentConfirmation({
        attendee_email: email,
        attendee_name: name,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        notes: notes
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the booking if email fails
    }

    // Send notification to user
    try {
      const user = db.prepare('SELECT email, name FROM users WHERE id = ?').get(template.user_id);
      if (user && user.email) {
        await emailService.sendLeadNotification(user.email, {
          name,
          email,
          phone,
          source: 'Booking Widget'
        });
      }
    } catch (emailError) {
      console.error('Failed to send lead notification:', emailError);
      // Don't fail the booking if email fails
    }

    res.json({
      success: true,
      message: 'Appointment booked successfully',
      appointmentId,
      confirmation: 'Check your email for details'
    });

  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// Get booking widget info (PUBLIC - for displaying strategy info)
router.get('/widget/:templateId', async (req, res) => {
  try {
    const template = db.prepare(`
      SELECT id, name, description, industry
      FROM templates
      WHERE id = ?
    `).get(req.params.templateId);

    if (!template) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    res.json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('Get widget info error:', error);
    res.status(500).json({ error: 'Failed to fetch widget info' });
  }
});

module.exports = router;
