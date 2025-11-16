const express = require('express');
const router = express.Router();
const db = require('../database/db');
const calendarService = require('../services/googleCalendarService');

// Middleware to verify authentication
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  // Verify JWT token (assuming you have JWT verification set up)
  try {
    // Add your JWT verification logic here
    // For now, we'll extract userId from the token payload
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

/**
 * GET /api/calendar/auth
 * Start OAuth flow - returns authorization URL
 */
router.get('/auth', authenticateToken, (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/calendar/callback';

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: 'Google Calendar credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file'
      });
    }

    const authUrl = calendarService.getAuthUrl(clientId, clientSecret, redirectUri);

    // Store userId in session or state parameter for callback
    res.json({
      authUrl,
      message: 'Redirect user to this URL to authorize Google Calendar access'
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * GET /api/calendar/callback
 * Handle OAuth callback - exchange code for tokens
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code not provided' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/calendar/callback';

    // Exchange code for tokens
    const tokens = await calendarService.getTokensFromCode(code, clientId, clientSecret, redirectUri);

    // In a real app, extract userId from state parameter
    // For now, you'll need to implement session management
    const userId = state || req.session?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User session not found. Please start authorization flow again.' });
    }

    // Store tokens in database
    const query = `
      INSERT INTO calendar_connections (user_id, provider, access_token, refresh_token, token_expiry, calendar_id)
      VALUES (?, 'google', ?, ?, ?, 'primary')
      ON DUPLICATE KEY UPDATE
        access_token = VALUES(access_token),
        refresh_token = VALUES(refresh_token),
        token_expiry = VALUES(token_expiry),
        updated_at = CURRENT_TIMESTAMP
    `;

    const tokenExpiry = new Date(Date.now() + tokens.expiry_date);

    await db.query(query, [userId, tokens.access_token, tokens.refresh_token, tokenExpiry]);

    // Redirect to success page or return success message
    res.redirect('/dashboard?calendar_connected=true');
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.status(500).json({ error: 'Failed to complete authorization' });
  }
});

/**
 * GET /api/calendar/availability
 * Get available time slots
 */
router.get('/availability', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      startDate,
      endDate,
      duration = 30,
      workingHoursStart = 9,
      workingHoursEnd = 17
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    // Get user's calendar connection
    const connection = await db.query(
      'SELECT * FROM calendar_connections WHERE user_id = ? AND provider = "google" ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (!connection || connection.length === 0) {
      return res.status(404).json({ error: 'No calendar connected. Please connect your Google Calendar first.' });
    }

    const { access_token, refresh_token, token_expiry, calendar_id } = connection[0];

    // Check if token is expired and refresh if needed
    const now = new Date();
    if (new Date(token_expiry) <= now) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/calendar/callback';

      const newTokens = await calendarService.refreshAccessToken(refresh_token, clientId, clientSecret, redirectUri);

      // Update tokens in database
      await db.query(
        'UPDATE calendar_connections SET access_token = ?, token_expiry = ? WHERE id = ?',
        [newTokens.access_token, new Date(Date.now() + newTokens.expiry_date), connection[0].id]
      );

      calendarService.setCredentials(newTokens, clientId, clientSecret, redirectUri);
    } else {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/calendar/callback';

      calendarService.setCredentials({ access_token, refresh_token }, clientId, clientSecret, redirectUri);
    }

    // Get available slots
    const timeMin = new Date(startDate).toISOString();
    const timeMax = new Date(endDate).toISOString();
    const workingHours = { start: parseInt(workingHoursStart), end: parseInt(workingHoursEnd) };

    const availableSlots = await calendarService.getAvailableSlots(
      calendar_id || 'primary',
      timeMin,
      timeMax,
      parseInt(duration),
      workingHours
    );

    res.json({
      availableSlots,
      count: availableSlots.length,
      duration: parseInt(duration),
      workingHours
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Failed to fetch availability', details: error.message });
  }
});

/**
 * POST /api/calendar/book
 * Book an appointment
 */
router.post('/book', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      startTime,
      endTime,
      summary,
      description,
      attendeeEmail,
      attendeeName,
      timeZone = 'America/New_York',
      includeVideoConference = true
    } = req.body;

    if (!startTime || !endTime || !summary || !attendeeEmail) {
      return res.status(400).json({
        error: 'startTime, endTime, summary, and attendeeEmail are required'
      });
    }

    // Get user's calendar connection
    const connection = await db.query(
      'SELECT * FROM calendar_connections WHERE user_id = ? AND provider = "google" ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (!connection || connection.length === 0) {
      return res.status(404).json({ error: 'No calendar connected. Please connect your Google Calendar first.' });
    }

    const { access_token, refresh_token, calendar_id } = connection[0];

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/calendar/callback';

    calendarService.setCredentials({ access_token, refresh_token }, clientId, clientSecret, redirectUri);

    // Create event details
    const eventDetails = {
      summary,
      description: description || `Appointment with ${attendeeName || attendeeEmail}`,
      startTime,
      endTime,
      timeZone,
      attendees: [{ email: attendeeEmail, displayName: attendeeName }],
      includeVideoConference
    };

    // Create event in Google Calendar
    const event = await calendarService.createEvent(eventDetails, calendar_id || 'primary');

    // Store appointment in database
    const appointmentQuery = `
      INSERT INTO appointments (
        user_id,
        calendar_connection_id,
        event_id,
        summary,
        description,
        start_time,
        end_time,
        attendee_email,
        attendee_name,
        status,
        meeting_link
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
    `;

    const meetingLink = event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri;

    await db.query(appointmentQuery, [
      userId,
      connection[0].id,
      event.id,
      summary,
      description,
      new Date(startTime),
      new Date(endTime),
      attendeeEmail,
      attendeeName || null,
      meetingLink
    ]);

    res.json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: {
        id: event.id,
        summary: event.summary,
        startTime: event.start.dateTime,
        endTime: event.end.dateTime,
        attendees: event.attendees,
        meetingLink,
        htmlLink: event.htmlLink
      }
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ error: 'Failed to book appointment', details: error.message });
  }
});

/**
 * GET /api/calendar/events
 * List appointments
 */
router.get('/events', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { maxResults = 10, startDate } = req.query;

    // Get user's calendar connection
    const connection = await db.query(
      'SELECT * FROM calendar_connections WHERE user_id = ? AND provider = "google" ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (!connection || connection.length === 0) {
      return res.status(404).json({ error: 'No calendar connected. Please connect your Google Calendar first.' });
    }

    const { access_token, refresh_token, calendar_id } = connection[0];

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/calendar/callback';

    calendarService.setCredentials({ access_token, refresh_token }, clientId, clientSecret, redirectUri);

    // Get events from Google Calendar
    const timeMin = startDate ? new Date(startDate).toISOString() : new Date().toISOString();
    const events = await calendarService.listEvents(
      calendar_id || 'primary',
      parseInt(maxResults),
      timeMin
    );

    // Also get from database for additional metadata
    const dbAppointments = await db.query(
      'SELECT * FROM appointments WHERE user_id = ? AND start_time >= ? ORDER BY start_time ASC',
      [userId, new Date(timeMin)]
    );

    res.json({
      events,
      appointments: dbAppointments,
      count: events.length
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events', details: error.message });
  }
});

/**
 * DELETE /api/calendar/events/:id
 * Cancel an appointment
 */
router.delete('/events/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const eventId = req.params.id;

    // Get user's calendar connection
    const connection = await db.query(
      'SELECT * FROM calendar_connections WHERE user_id = ? AND provider = "google" ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (!connection || connection.length === 0) {
      return res.status(404).json({ error: 'No calendar connected. Please connect your Google Calendar first.' });
    }

    const { access_token, refresh_token, calendar_id } = connection[0];

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/calendar/callback';

    calendarService.setCredentials({ access_token, refresh_token }, clientId, clientSecret, redirectUri);

    // Cancel event in Google Calendar
    await calendarService.cancelEvent(eventId, calendar_id || 'primary', true);

    // Update status in database
    await db.query(
      'UPDATE appointments SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );

    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ error: 'Failed to cancel appointment', details: error.message });
  }
});

/**
 * GET /api/calendar/connection/status
 * Check calendar connection status
 */
router.get('/connection/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    const connection = await db.query(
      'SELECT id, provider, calendar_id, created_at, updated_at FROM calendar_connections WHERE user_id = ? AND provider = "google" ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (!connection || connection.length === 0) {
      return res.json({
        connected: false,
        message: 'No calendar connected'
      });
    }

    res.json({
      connected: true,
      connection: {
        id: connection[0].id,
        provider: connection[0].provider,
        calendarId: connection[0].calendar_id,
        connectedAt: connection[0].created_at
      }
    });
  } catch (error) {
    console.error('Error checking connection status:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
});

/**
 * DELETE /api/calendar/connection
 * Disconnect calendar
 */
router.delete('/connection', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    await db.query(
      'DELETE FROM calendar_connections WHERE user_id = ? AND provider = "google"',
      [userId]
    );

    res.json({
      success: true,
      message: 'Calendar disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect calendar' });
  }
});

module.exports = router;
