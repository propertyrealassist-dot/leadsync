const axios = require('axios');
const crypto = require('crypto');

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
}

module.exports = new WebhookService();
