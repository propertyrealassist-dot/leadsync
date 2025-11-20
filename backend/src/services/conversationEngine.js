const { db } = require('../config/database');
const MockAIService = require('./mockAI');
const ClaudeAIService = require('./claudeAI');
const { v4: uuidv4 } = require('uuid');

class ConversationEngine {
  constructor() {
    this.useMockAI = process.env.USE_MOCK_AI === 'true';
  }

  // Start a new conversation
  async startConversation(templateId, contactName, contactPhone) {
    const conversationId = uuidv4();

    await db.run(`
      INSERT INTO conversations (id, template_id, contact_name, contact_phone)
      VALUES (?, ?, ?, ?)
    `, [conversationId, templateId, contactName, contactPhone]);

    // Get template to send initial message
    const template = await this.getTemplate(templateId);

    if (template && template.initial_message) {
      // Replace variables in initial message
      let message = template.initial_message
        .replace('{{contact.first_name}}', contactName || 'there');

      await this.addMessage(conversationId, 'bot', message);
    }

    return conversationId;
  }

  // Process incoming message
  async processMessage(conversationId, userMessage) {
    // Save user message
    await this.addMessage(conversationId, 'user', userMessage);

    // Get conversation details
    const conversation = await this.getConversation(conversationId);
    const template = await this.getTemplate(conversation.template_id);
    const history = await this.getMessages(conversationId);

    // Generate AI response
    let aiResponse;
    let aiService;

    if (this.useMockAI) {
      console.log('Using Mock AI');
      aiService = new MockAIService(template);
      aiResponse = await aiService.generateResponse(userMessage, history);
    } else {
      console.log('Using Claude AI');
      aiService = new ClaudeAIService(template);
      aiResponse = await aiService.generateResponse(userMessage, history);
    }

    // Check for action triggers
    if (aiService.shouldTriggerBooking(userMessage)) {
      await this.triggerAction(conversationId, 'APPOINTMENT_BOOKED');
    }
    if (aiService.shouldTriggerLost(userMessage)) {
      await this.triggerAction(conversationId, 'LEAD_LOST');
    }

    // Save AI response
    await this.addMessage(conversationId, 'bot', aiResponse);

    // Update conversation timestamp
    await db.run('UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?', [conversationId]);

    return aiResponse;
  }

  // Trigger custom action
  async triggerAction(conversationId, actionType) {
    const conversation = await this.getConversation(conversationId);
    
    // Get action configuration
    const action = await db.get(`
      SELECT * FROM custom_actions 
      WHERE template_id = ? AND action = ?
    `, [conversation.template_id, actionType]);

    if (!action) return;

    // Get action chains
    const chains = await db.all(`
      SELECT * FROM action_chains 
      WHERE custom_action_id = ?
      ORDER BY chain_order
    `, [action.id]);

    // Execute each chain
    for (const chain of chains) {
      const steps = await db.all(`
        SELECT * FROM chain_steps
        WHERE chain_id = ?
        ORDER BY step_order
      `, [chain.id]);

      for (const step of steps) {
        this.executeStep(conversationId, step);
      }
    }
  }

  // Execute workflow step
  executeStep(conversationId, step) {
    const params = step.parameters ? JSON.parse(step.parameters) : {};

    switch (step.function) {
      case 'HANDLE_BOOKING':
        console.log(`📅 Booking confirmed for conversation ${conversationId}`);
        db.prepare('UPDATE conversations SET status = ? WHERE id = ?')
          .run('booked', conversationId);
        break;

      case 'TURN_OFF_AI':
        console.log(`🤖 AI turned off for conversation ${conversationId}`);
        db.prepare('UPDATE conversations SET status = ? WHERE id = ?')
          .run('completed', conversationId);
        break;

      case 'TURN_OFF_FOLLOW_UPS':
        console.log(`📧 Follow-ups disabled for conversation ${conversationId}`);
        db.prepare('DELETE FROM scheduled_messages WHERE conversation_id = ?')
          .run(conversationId);
        break;

      case 'ADD_TAGS':
        console.log(`🏷️ Tags added: ${params.tags?.join(', ')}`);
        break;

      default:
        console.log(`⚠️ Unknown function: ${step.function}`);
    }
  }

  // Helper methods
  async addMessage(conversationId, sender, content) {
    await db.run(`
      INSERT INTO messages (conversation_id, sender, content)
      VALUES (?, ?, ?)
    `, [conversationId, sender, content]);
  }

  async getConversation(conversationId) {
    return await db.get('SELECT * FROM conversations WHERE id = ?', [conversationId]);
  }

  async getTemplate(templateId) {
    const template = await db.get('SELECT * FROM templates WHERE id = ?', [templateId]);

    if (template) {
      // Attach related data
      template.qualificationQuestions = await db.all(
        'SELECT * FROM qualification_questions WHERE template_id = ?', [templateId]
      );

      template.faqs = await db.all(
        'SELECT * FROM faqs WHERE template_id = ?', [templateId]
      );

      template.followUps = await db.all(
        'SELECT * FROM follow_ups WHERE template_id = ?', [templateId]
      );
    }

    return template;
  }

  async getMessages(conversationId) {
    return await db.all(`
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY timestamp ASC
    `, [conversationId]);
  }

  async getAllConversations() {
    return await db.all(`
      SELECT c.*, t.name as template_name
      FROM conversations c
      LEFT JOIN templates t ON c.template_id = t.id
      ORDER BY c.last_message_at DESC
    `, []);
  }
}

module.exports = ConversationEngine;