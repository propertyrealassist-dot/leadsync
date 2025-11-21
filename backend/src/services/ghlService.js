const axios = require('axios');
const { db } = require('../config/database');

class GHLService {
  constructor() {
    this.baseURL = 'https://services.leadconnectorhq.com';
    this.authURL = 'https://marketplace.gohighlevel.com/oauth/chooselocation';
  }

  /**
   * Generate OAuth URL for GHL authorization
   */
  getAuthorizationURL(state) {
    const clientId = process.env.GHL_CLIENT_ID;
    const redirectUri = process.env.GHL_REDIRECT_URI;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'calendars.readonly calendars.write contacts.readonly contacts.write opportunities.readonly opportunities.write',
      state: state
    });

    return `${this.authURL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code) {
    try {
      const response = await axios.post(`${this.baseURL}/oauth/token`, {
        client_id: process.env.GHL_CLIENT_ID,
        client_secret: process.env.GHL_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.GHL_REDIRECT_URI
      });

      return response.data;
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post(`${this.baseURL}/oauth/token`, {
        client_id: process.env.GHL_CLIENT_ID,
        client_secret: process.env.GHL_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      return response.data;
    } catch (error) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Store GHL credentials in database
   */
  async storeCredentials(userId, tokenData) {
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

    await db.run(`
      INSERT INTO ghl_credentials
      (user_id, access_token, refresh_token, location_id, expires_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (user_id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        location_id = EXCLUDED.location_id,
        expires_at = EXCLUDED.expires_at,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, tokenData.access_token, tokenData.refresh_token, tokenData.locationId, expiresAt]);

    return { success: true };
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(userId) {
    const credentials = await db.get('SELECT * FROM ghl_credentials WHERE user_id = ?', [userId]);

    if (!credentials) {
      throw new Error('No GHL credentials found for user');
    }

    // Check if token is expired or about to expire (5 min buffer)
    const expiresAt = new Date(credentials.expires_at);
    const now = new Date();
    const buffer = 5 * 60 * 1000; // 5 minutes

    if (expiresAt.getTime() - now.getTime() < buffer) {
      // Refresh token
      const tokenData = await this.refreshAccessToken(credentials.refresh_token);
      await this.storeCredentials(userId, tokenData);
      return tokenData.access_token;
    }

    return credentials.access_token;
  }

  /**
   * Get location ID for user
   */
  async getLocationId(userId) {
    const result = await db.get('SELECT location_id FROM ghl_credentials WHERE user_id = ?', [userId]);
    return result?.location_id;
  }

  /**
   * Make authenticated API request to GHL
   */
  async makeRequest(userId, method, endpoint, data = null) {
    const accessToken = await this.getValidAccessToken(userId);
    const locationId = await this.getLocationId(userId);

    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('GHL API Error:', error.response?.data || error.message);
      throw new Error(`GHL API request failed: ${error.message}`);
    }
  }

  // ========== Calendar Operations ==========

  /**
   * Get all calendars for location
   */
  async getCalendars(userId) {
    const locationId = await this.getLocationId(userId);
    return await this.makeRequest(userId, 'GET', `/calendars/?locationId=${locationId}`);
  }

  /**
   * Get calendar by ID
   */
  async getCalendar(userId, calendarId) {
    return await this.makeRequest(userId, 'GET', `/calendars/${calendarId}`);
  }

  /**
   * Get calendar events
   */
  async getCalendarEvents(userId, calendarId, startTime, endTime) {
    const params = new URLSearchParams({
      calendarId,
      startTime: startTime || new Date().toISOString(),
      endTime: endTime || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    return await this.makeRequest(userId, 'GET', `/calendars/events?${params.toString()}`);
  }

  /**
   * Create calendar appointment
   */
  async createAppointment(userId, appointmentData) {
    const locationId = await this.getLocationId(userId);

    const payload = {
      calendarId: appointmentData.calendarId,
      locationId: locationId,
      contactId: appointmentData.contactId,
      startTime: appointmentData.startTime,
      endTime: appointmentData.endTime,
      title: appointmentData.title,
      appointmentStatus: appointmentData.status || 'confirmed',
      address: appointmentData.address,
      notes: appointmentData.notes
    };

    return await this.makeRequest(userId, 'POST', '/calendars/events', payload);
  }

  /**
   * Update calendar appointment
   */
  async updateAppointment(userId, eventId, appointmentData) {
    return await this.makeRequest(userId, 'PUT', `/calendars/events/${eventId}`, appointmentData);
  }

  /**
   * Delete calendar appointment
   */
  async deleteAppointment(userId, eventId) {
    return await this.makeRequest(userId, 'DELETE', `/calendars/events/${eventId}`);
  }

  // ========== Contact Operations ==========

  /**
   * Search contacts
   */
  async searchContacts(userId, query) {
    const locationId = await this.getLocationId(userId);
    const params = new URLSearchParams({
      locationId,
      query
    });

    return await this.makeRequest(userId, 'GET', `/contacts/search?${params.toString()}`);
  }

  /**
   * Get contact by ID
   */
  async getContact(userId, contactId) {
    return await this.makeRequest(userId, 'GET', `/contacts/${contactId}`);
  }

  /**
   * Create contact
   */
  async createContact(userId, contactData) {
    const locationId = await this.getLocationId(userId);

    const payload = {
      locationId,
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      email: contactData.email,
      phone: contactData.phone,
      address1: contactData.address,
      city: contactData.city,
      state: contactData.state,
      postalCode: contactData.postalCode,
      tags: contactData.tags || []
    };

    return await this.makeRequest(userId, 'POST', '/contacts', payload);
  }

  /**
   * Update contact
   */
  async updateContact(userId, contactId, contactData) {
    return await this.makeRequest(userId, 'PUT', `/contacts/${contactId}`, contactData);
  }

  /**
   * Get or create contact by phone/email
   */
  async getOrCreateContact(userId, contactInfo) {
    // Try to find existing contact
    const searchQuery = contactInfo.email || contactInfo.phone;
    const searchResults = await this.searchContacts(userId, searchQuery);

    if (searchResults.contacts && searchResults.contacts.length > 0) {
      return searchResults.contacts[0];
    }

    // Create new contact if not found
    return await this.createContact(userId, contactInfo);
  }

  // ========== Opportunity Operations ==========

  /**
   * Create opportunity
   */
  async createOpportunity(userId, opportunityData) {
    const locationId = await this.getLocationId(userId);

    const payload = {
      locationId,
      pipelineId: opportunityData.pipelineId,
      contactId: opportunityData.contactId,
      name: opportunityData.name,
      monetaryValue: opportunityData.value,
      status: opportunityData.status || 'open'
    };

    return await this.makeRequest(userId, 'POST', '/opportunities', payload);
  }

  /**
   * Check if user has GHL connected
   */
  async isConnected(userId) {
    const result = await db.get('SELECT COUNT(*) as count FROM ghl_credentials WHERE user_id = ?', [userId]);
    return result.count > 0;
  }
}

module.exports = new GHLService();
