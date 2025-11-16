const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const emailService = require('./emailService');

class WebhookService {
  /**
   * Send webhook event to external URL
   */
  async sendWebhook(url, event, data, retries = 3) {
    try {
      const payload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        source: 'leadsync'
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-LeadSync-Event': event,
          'X-LeadSync-Signature': this.generateSignature(payload)
        },
        timeout: 10000
      });

      console.log(`✓ Webhook sent to ${url}: ${event}`);
      return { success: true, response: response.data };

    } catch (error) {
      console.error(`✗ Webhook failed for ${url}:`, error.message);

      if (retries > 0) {
        console.log(`🔄 Retrying... (${retries} attempts left)`);
        await this.delay(2000);
        return this.sendWebhook(url, event, data, retries - 1);
      }

      throw error;
    }
  }

  /**
   * Trigger webhook for various events
   */
  async triggerEvent(eventType, data, userId) {
    try {
      // Get user's webhook URLs from database
      const webhooks = await this.getUserWebhooks(userId, eventType);

      if (webhooks.length === 0) {
        console.log(`No webhooks configured for ${eventType}`);
        return;
      }

      // Send to all registered webhooks
      const promises = webhooks.map(webhook =>
        this.sendWebhook(webhook.url, eventType, data)
      );

      const results = await Promise.allSettled(promises);

      // Log results
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      console.log(`📊 Webhook results: ${succeeded} succeeded, ${failed} failed`);

    } catch (error) {
      console.error('Error triggering webhook event:', error);
    }
  }

  async getUserWebhooks(userId, eventType) {
    // Fetch from database - webhooks registered by user
    // Filter by event type if specified
    // In production, this would query the webhooks table

    // Example return:
    // return [
    //   { url: 'https://example.com/webhook', events: ['appointment.created'] }
    // ];

    return [];
  }

  generateSignature(payload) {
    // Generate HMAC signature for security
    const secret = process.env.WEBHOOK_SECRET || 'leadsync-webhook-secret';

    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verify webhook signature from incoming requests
   */
  verifySignature(payload, signature) {
    const expectedSignature = this.generateSignature(payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Event types supported
   */
  static EVENTS = {
    APPOINTMENT_CREATED: 'appointment.created',
    APPOINTMENT_UPDATED: 'appointment.updated',
    APPOINTMENT_CANCELLED: 'appointment.cancelled',
    APPOINTMENT_CONFIRMED: 'appointment.confirmed',
    APPOINTMENT_RESCHEDULED: 'appointment.rescheduled',
    LEAD_CREATED: 'lead.created',
    LEAD_QUALIFIED: 'lead.qualified',
    LEAD_COMPLETED: 'lead.completed',
    LEAD_FAILED: 'lead.failed',
    CONVERSATION_STARTED: 'conversation.started',
    CONVERSATION_ENDED: 'conversation.ended',
    MESSAGE_RECEIVED: 'message.received',
    MESSAGE_SENT: 'message.sent'
  };

  /**
   * Queue webhook for async processing
   * In production, use Bull or Agenda for job queuing
   */
  async queueWebhook(url, event, data) {
    console.log(`📋 Queueing webhook: ${event} to ${url}`);
    // In production: await queue.add('webhook', { url, event, data });

    // For now, just send immediately
    return this.sendWebhook(url, event, data);
  }

  /**
   * Get webhook delivery logs for debugging
   */
  async getWebhookLogs(userId, limit = 50) {
    // Fetch webhook delivery logs from database
    // Return recent webhook attempts with status
    return [];
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(url) {
    try {
      const testPayload = {
        event: 'webhook.test',
        data: {
          message: 'This is a test webhook from LeadSync',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        source: 'leadsync'
      };

      const result = await this.sendWebhook(url, 'webhook.test', testPayload, 1);
      return { success: true, message: 'Webhook test successful', result };

    } catch (error) {
      return { success: false, message: 'Webhook test failed', error: error.message };
    }
  }

  // ========== INCOMING WEBHOOK PROCESSING ==========

  /**
   * Process incoming webhook for lead capture
   */
  async processIncomingWebhook(webhookData, source, db, userId) {
    try {
      console.log('📥 Processing incoming webhook from:', source);

      // Extract lead data based on source
      let leadData = this.extractLeadData(webhookData, source);

      if (!leadData.name && !leadData.email) {
        throw new Error('Webhook must contain name or email');
      }

      // Create lead
      const leadId = await this.createLead(db, userId, leadData);

      // Log activity
      this.logLeadActivity(db, leadId, 'webhook_received', `Lead captured from ${source}`);

      // Send notification
      await this.notifyUserAboutLead(db, userId, leadData);

      console.log('✅ Incoming webhook processed successfully');
      return { leadId, status: 'success' };

    } catch (error) {
      console.error('❌ Incoming webhook processing error:', error);
      throw error;
    }
  }

  /**
   * Extract lead data from different sources
   */
  extractLeadData(data, source) {
    switch (source) {
      case 'gohighlevel':
        return {
          name: `${data.contact?.firstName || ''} ${data.contact?.lastName || ''}`.trim(),
          email: data.contact?.email,
          phone: data.contact?.phone,
          company: data.contact?.companyName,
          source: 'gohighlevel',
          custom_fields: {
            ghl_contact_id: data.contact?.id,
            ghl_location_id: data.locationId
          }
        };

      case 'zapier':
        return {
          name: data.name || data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          email: data.email,
          phone: data.phone || data.phone_number,
          company: data.company || data.organization,
          source: 'zapier',
          custom_fields: data.custom_fields || {}
        };

      case 'typeform':
        return {
          name: data.answers?.find(a => a.field.type === 'name')?.text || 'Unknown',
          email: data.answers?.find(a => a.field.type === 'email')?.email,
          phone: data.answers?.find(a => a.field.type === 'phone_number')?.phone_number,
          source: 'typeform',
          custom_fields: {
            form_id: data.form_response?.form_id,
            response_id: data.form_response?.token
          }
        };

      case 'calendly':
        return {
          name: data.name || data.invitee?.name,
          email: data.email || data.invitee?.email,
          phone: data.invitee?.phone_number,
          source: 'calendly',
          custom_fields: {
            event_type: data.event_type?.name,
            scheduled_time: data.scheduled_event?.start_time
          }
        };

      case 'custom':
      default:
        return {
          name: data.name || data.full_name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          source: source || 'custom',
          custom_fields: data.custom_fields || {}
        };
    }
  }

  /**
   * Create lead in database
   */
  async createLead(db, userId, leadData) {
    const leadId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO leads (
        id, user_id, name, email, phone, company,
        source, custom_fields, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      leadId,
      userId,
      leadData.name || 'Unknown',
      leadData.email || null,
      leadData.phone || null,
      leadData.company || null,
      leadData.source || 'webhook',
      leadData.custom_fields ? JSON.stringify(leadData.custom_fields) : null,
      'new',
      now,
      now
    );

    return leadId;
  }

  /**
   * Log lead activity
   */
  logLeadActivity(db, leadId, activityType, description) {
    const activityId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO lead_activities (id, lead_id, activity_type, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(activityId, leadId, activityType, description, now);
  }

  /**
   * Notify user about new lead
   */
  async notifyUserAboutLead(db, userId, leadData) {
    try {
      const user = db.prepare('SELECT email, name FROM users WHERE id = ?').get(userId);

      if (user && user.email) {
        await emailService.sendLeadNotification(user.email, leadData);
      }
    } catch (error) {
      console.error('Failed to send lead notification:', error);
      // Don't throw - notification failure shouldn't break webhook
    }
  }

  /**
   * Generate webhook URL for incoming webhooks
   */
  generateIncomingWebhookUrl(userId, source) {
    return `${process.env.API_URL || 'http://localhost:3001'}/api/webhooks/incoming/${source}/${userId}`;
  }
}

module.exports = new WebhookService();
