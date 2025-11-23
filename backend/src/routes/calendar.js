const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const calendarService = require('../services/googleCalendarService');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/calendar/auth
 * Start OAuth flow - returns authorization URL
 * PUBLIC ROUTE - No authentication required to start OAuth
 */
router.get('/auth', async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/callback';

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: 'Google Calendar credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file'
      });
    }

    // Get userId from token if provided (optional for this route)
    let userId = null;
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        userId = decoded.userId;
      } catch (error) {
        console.log('No valid token provided for /auth, continuing without userId');
      }
    }

    const authUrl = calendarService.getAuthUrl(clientId, clientSecret, redirectUri);

    // Store userId in state parameter for callback if available
    const stateData = userId ? Buffer.from(JSON.stringify({ userId })).toString('base64') : '';
    const authUrlWithState = stateData ? `${authUrl}&state=${stateData}` : authUrl;

    res.json({
      authUrl: authUrlWithState,
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
 * PUBLIC ROUTE - Google redirects here after OAuth
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    console.log('📅 Calendar OAuth callback received');
    console.log('Code:', code ? 'Present' : 'Missing');
    console.log('State:', state);

    if (!code) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/calendar?error=no_code`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/callback';

    // Exchange code for tokens
    console.log('🔄 Exchanging code for tokens...');
    const tokens = await calendarService.getTokensFromCode(code, clientId, clientSecret, redirectUri);
    console.log('✅ Tokens received:', { hasAccessToken: !!tokens.access_token, hasRefreshToken: !!tokens.refresh_token });

    // Extract userId from state parameter
    let userId = null;
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = stateData.userId;
        console.log('📌 User ID from state:', userId);
      } catch (error) {
        console.log('⚠️ Could not parse state parameter');
      }
    }

    // If no userId from state, try to get first user (fallback for demo)
    if (!userId) {
      console.log('🔍 No userId in state, looking for first user...');
      const firstUser = await db.get('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
      if (firstUser) {
        userId = firstUser.id;
        console.log('📌 Using first user:', userId);
      } else {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/calendar?error=no_user`);
      }
    }

    // Store tokens in database
    console.log('💾 Storing credentials for user:', userId);
    const tokenExpiry = new Date(Date.now() + (tokens.expiry_date || 3600000));

    await db.run(`
      INSERT INTO calendar_connections (user_id, provider, access_token, refresh_token, token_expiry, calendar_id)
      VALUES (?, 'google', ?, ?, ?, 'primary')
      ON CONFLICT (user_id, provider) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expiry = EXCLUDED.token_expiry,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, tokens.access_token, tokens.refresh_token, tokenExpiry.toISOString()]);

    console.log('✅ Calendar connected successfully');

    // Redirect to frontend success page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/calendar?calendar_connected=true`);
  } catch (error) {
    console.error('❌ Error handling OAuth callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/calendar?error=oauth_failed&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * GET /api/calendar/availability
 * Get available time slots
 */
router.get('/availability', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
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
    const connection = await db.get(
      'SELECT * FROM calendar_connections WHERE user_id = ? AND provider = ? ORDER BY created_at DESC LIMIT 1',
      [userId, 'google']
    );

    if (!connection) {
      return res.status(404).json({ error: 'No calendar connected. Please connect your Google Calendar first.' });
    }

    const { access_token, refresh_token, token_expiry, calendar_id } = connection;

    // Check if token is expired and refresh if needed
    const now = new Date();
    if (new Date(token_expiry) <= now) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/calendar/callback';

      const newTokens = await calendarService.refreshAccessToken(refresh_token, clientId, clientSecret, redirectUri);

      // Update tokens in database
      await db.run(
        'UPDATE calendar_connections SET access_token = ?, token_expiry = ? WHERE id = ?',
        [newTokens.access_token, new Date(Date.now() + newTokens.expiry_date), connection.id]
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
    const userId = req.user.id;
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
    const connection = await db.get(
      'SELECT * FROM calendar_connections WHERE user_id = ? AND provider = ? ORDER BY created_at DESC LIMIT 1',
      [userId, 'google']
    );

    if (!connection) {
      return res.status(404).json({ error: 'No calendar connected. Please connect your Google Calendar first.' });
    }

    const { access_token, refresh_token, calendar_id } = connection;

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

    await db.run(appointmentQuery, [
      userId,
      connection.id,
      event.id,
      summary,
      description,
      new Date(startTime).toISOString(),
      new Date(endTime).toISOString(),
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
    const userId = req.user.id;
    const { maxResults = 10, startDate } = req.query;

    // Get user's calendar connection
    const connection = await db.get(
      'SELECT * FROM calendar_connections WHERE user_id = ? AND provider = ? ORDER BY created_at DESC LIMIT 1',
      [userId, 'google']
    );

    if (!connection) {
      return res.status(404).json({ error: 'No calendar connected. Please connect your Google Calendar first.' });
    }

    const { access_token, refresh_token, calendar_id } = connection;

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
    const dbAppointments = await db.all(
      'SELECT * FROM appointments WHERE user_id = ? AND start_time >= ? ORDER BY start_time ASC',
      [userId, timeMin]
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
    const userId = req.user.id;
    const eventId = req.params.id;

    // Get user's calendar connection
    const connection = await db.get(
      'SELECT * FROM calendar_connections WHERE user_id = ? AND provider = ? ORDER BY created_at DESC LIMIT 1',
      [userId, 'google']
    );

    if (!connection) {
      return res.status(404).json({ error: 'No calendar connected. Please connect your Google Calendar first.' });
    }

    const { access_token, refresh_token, calendar_id } = connection;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/calendar/callback';

    calendarService.setCredentials({ access_token, refresh_token }, clientId, clientSecret, redirectUri);

    // Cancel event in Google Calendar
    await calendarService.cancelEvent(eventId, calendar_id || 'primary', true);

    // Update status in database
    await db.run(
      "UPDATE appointments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE event_id = ? AND user_id = ?",
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
    const userId = req.user.id;

    const connection = await db.get(
      'SELECT id, provider, calendar_id, created_at, updated_at FROM calendar_connections WHERE user_id = ? AND provider = ? ORDER BY created_at DESC LIMIT 1',
      [userId, 'google']
    );

    if (!connection) {
      return res.json({
        connected: false,
        message: 'No calendar connected'
      });
    }

    res.json({
      connected: true,
      connection: {
        id: connection.id,
        provider: connection.provider,
        calendarId: connection.calendar_id,
        connectedAt: connection.created_at
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
    const userId = req.user.id;

    await db.run(
      'DELETE FROM calendar_connections WHERE user_id = ? AND provider = ?',
      [userId, 'google']
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
