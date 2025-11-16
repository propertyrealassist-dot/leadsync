const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

class CalendarService {
  constructor() {
    this.oauth2Client = null;
    this.calendar = null;
  }

  /**
   * Initialize OAuth2 client with credentials
   */
  initializeOAuthClient(clientId, clientSecret, redirectUri) {
    this.oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      redirectUri
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    return this.oauth2Client;
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthUrl(clientId, clientSecret, redirectUri) {
    const oauth2Client = this.initializeOAuthClient(clientId, clientSecret, redirectUri);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      prompt: 'consent'
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code, clientId, clientSecret, redirectUri) {
    const oauth2Client = this.initializeOAuthClient(clientId, clientSecret, redirectUri);

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    return tokens;
  }

  /**
   * Set credentials for an already authenticated user
   */
  setCredentials(tokens, clientId, clientSecret, redirectUri) {
    this.initializeOAuthClient(clientId, clientSecret, redirectUri);
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken(refreshToken, clientId, clientSecret, redirectUri) {
    const oauth2Client = this.initializeOAuthClient(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  }

  /**
   * Get available time slots for a given date range
   */
  async getAvailableSlots(calendarId = 'primary', timeMin, timeMax, duration = 30, workingHours = { start: 9, end: 17 }) {
    try {
      // Get busy times from calendar
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin,
          timeMax: timeMax,
          items: [{ id: calendarId }]
        }
      });

      const busySlots = response.data.calendars[calendarId]?.busy || [];

      // Generate all possible slots
      const allSlots = this.generateTimeSlots(timeMin, timeMax, duration, workingHours);

      // Filter out busy slots
      const availableSlots = allSlots.filter(slot => {
        return !this.isSlotBusy(slot, busySlots);
      });

      return availableSlots;
    } catch (error) {
      throw new Error(`Failed to get available slots: ${error.message}`);
    }
  }

  /**
   * Generate time slots for a date range
   */
  generateTimeSlots(timeMin, timeMax, duration, workingHours) {
    const slots = [];
    const start = new Date(timeMin);
    const end = new Date(timeMax);

    let currentDate = new Date(start);

    while (currentDate < end) {
      // Skip weekends
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Generate slots for working hours
        for (let hour = workingHours.start; hour < workingHours.end; hour++) {
          for (let minute = 0; minute < 60; minute += duration) {
            const slotStart = new Date(currentDate);
            slotStart.setHours(hour, minute, 0, 0);

            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + duration);

            // Only add if slot is within time range
            if (slotStart >= start && slotEnd <= end) {
              slots.push({
                start: slotStart.toISOString(),
                end: slotEnd.toISOString()
              });
            }
          }
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
    }

    return slots;
  }

  /**
   * Check if a slot overlaps with busy times
   */
  isSlotBusy(slot, busySlots) {
    const slotStart = new Date(slot.start);
    const slotEnd = new Date(slot.end);

    return busySlots.some(busy => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);

      // Check for any overlap
      return slotStart < busyEnd && slotEnd > busyStart;
    });
  }

  /**
   * Create a calendar event (book appointment)
   */
  async createEvent(eventDetails, calendarId = 'primary') {
    try {
      const event = {
        summary: eventDetails.summary,
        description: eventDetails.description,
        start: {
          dateTime: eventDetails.startTime,
          timeZone: eventDetails.timeZone || 'America/New_York'
        },
        end: {
          dateTime: eventDetails.endTime,
          timeZone: eventDetails.timeZone || 'America/New_York'
        },
        attendees: eventDetails.attendees || [],
        conferenceData: eventDetails.includeVideoConference ? {
          createRequest: {
            requestId: `leadsync-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        } : undefined,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 }
          ]
        }
      };

      const response = await this.calendar.events.insert({
        calendarId: calendarId,
        conferenceDataVersion: eventDetails.includeVideoConference ? 1 : 0,
        sendUpdates: 'all',
        requestBody: event
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to create event: ${error.message}`);
    }
  }

  /**
   * List upcoming events
   */
  async listEvents(calendarId = 'primary', maxResults = 10, timeMin = new Date().toISOString()) {
    try {
      const response = await this.calendar.events.list({
        calendarId: calendarId,
        timeMin: timeMin,
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error) {
      throw new Error(`Failed to list events: ${error.message}`);
    }
  }

  /**
   * Get a specific event
   */
  async getEvent(eventId, calendarId = 'primary') {
    try {
      const response = await this.calendar.events.get({
        calendarId: calendarId,
        eventId: eventId
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to get event: ${error.message}`);
    }
  }

  /**
   * Update an event
   */
  async updateEvent(eventId, updates, calendarId = 'primary') {
    try {
      const response = await this.calendar.events.patch({
        calendarId: calendarId,
        eventId: eventId,
        requestBody: updates,
        sendUpdates: 'all'
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to update event: ${error.message}`);
    }
  }

  /**
   * Cancel/delete an event
   */
  async cancelEvent(eventId, calendarId = 'primary', sendUpdates = true) {
    try {
      await this.calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId,
        sendUpdates: sendUpdates ? 'all' : 'none'
      });

      return { success: true, message: 'Event cancelled successfully' };
    } catch (error) {
      throw new Error(`Failed to cancel event: ${error.message}`);
    }
  }

  /**
   * Get user's calendar list
   */
  async getCalendarList() {
    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items || [];
    } catch (error) {
      throw new Error(`Failed to get calendar list: ${error.message}`);
    }
  }
}

module.exports = new CalendarService();
