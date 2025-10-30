const express = require('express');
const router = express.Router();
const calendarService = require('../services/calendarService');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/calendar/slots
 * Get available time slots
 */
router.get('/slots', authenticateToken, async (req, res) => {
  try {
    const { calendarId, startDate, endDate, timezone } = req.query;

    if (!calendarId || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required parameters: calendarId, startDate, endDate'
      });
    }

    const slots = await calendarService.getAvailableSlots(
      calendarId,
      startDate,
      endDate,
      timezone
    );

    res.json({ slots });

  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

/**
 * POST /api/calendar/book
 * Book an appointment
 */
router.post('/book', authenticateToken, async (req, res) => {
  try {
    const { calendarId, startTime, duration, contactId, notes } = req.body;

    if (!calendarId || !startTime || !duration || !contactId) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    const appointment = await calendarService.bookAppointment({
      calendarId,
      startTime,
      duration,
      contactId,
      notes,
      userId: req.user.userId
    });

    res.json({
      success: true,
      appointment
    });

  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({
      error: error.message || 'Failed to book appointment'
    });
  }
});

/**
 * GET /api/calendar/settings
 * Get calendar settings for a user
 */
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const { calendarId } = req.query;

    if (!calendarId) {
      return res.status(400).json({ error: 'Calendar ID required' });
    }

    const settings = await calendarService.getCalendarSettings(calendarId);

    res.json({ settings });

  } catch (error) {
    console.error('Error fetching calendar settings:', error);
    res.status(500).json({ error: 'Failed to fetch calendar settings' });
  }
});

module.exports = router;
