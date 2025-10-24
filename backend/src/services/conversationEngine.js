const db = require('../database/db');
const MockAIService = require('./mockAI');
const ClaudeAIService = require('./claudeAI');
const { v4: uuidv4 } = require('uuid');

class ConversationEngine {
  constructor() {
    this.useMockAI = process.env.USE_MOCK_AI === 'true';
  }

  // Start a new conversation
  startConversation(templateId, contactName, contactPhone) {
    const conversationId = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO conversations (id, template_id, contact_name, contact_phone)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(conversationId, templateId, contactName, contactPhone);

    // Get template to send initial message
    const template = this.getTemplate(templateId);
    
    if (template && template.initial_message) {
      // Replace variables in initial message
      let message = template.initial_message
        .replace('{{contact.first_name}}', contactName || 'there');
      
      this.addMessage(conversationId, 'bot', message);
    }

    return conversationId;
  }

  // Process incoming message
  async processMessage(conversationId, userMessage) {
    // Save user message
    this.addMessage(conversationId, 'user', userMessage);

    // Get conversation details
    const conversation = this.getConversation(conversationId);
    const template = this.getTemplate(conversation.template_id);
    const history = this.getMessages(conversationId);

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
      this.triggerAction(conversationId, 'APPOINTMENT_BOOKED');
    }
    if (aiService.shouldTriggerLost(userMessage)) {
      this.triggerAction(conversationId, 'LEAD_LOST');
    }

    // Save AI response
    this.addMessage(conversationId, 'bot', aiResponse);

    // Update conversation timestamp
    db.prepare('UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(conversationId);

    return aiResponse;
  }

  // Trigger custom action
  triggerAction(conversationId, actionType) {
    const conversation = this.getConversation(conversationId);
    
    // Get action configuration
    const action = db.prepare(`
      SELECT * FROM custom_actions 
      WHERE template_id = ? AND action = ?
    `).get(conversation.template_id, actionType);

    if (!action) return;

    // Get action chains
    const chains = db.prepare(`
      SELECT * FROM action_chains 
      WHERE custom_action_id = ?
      ORDER BY chain_order
    `).all(action.id);

    // Execute each chain
    chains.forEach(chain => {
      const steps = db.prepare(`
        SELECT * FROM chain_steps 
        WHERE chain_id = ?
        ORDER BY step_order
      `).all(chain.id);

      steps.forEach(step => {
        this.executeStep(conversationId, step);
      });
    });
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
  addMessage(conversationId, sender, content) {
    db.prepare(`
      INSERT INTO messages (conversation_id, sender, content)
      VALUES (?, ?, ?)
    `).run(conversationId, sender, content);
  }

  getConversation(conversationId) {
    return db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
  }

  getTemplate(templateId) {
    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId);
    
    if (template) {
      // Attach related data
      template.qualificationQuestions = db.prepare(
        'SELECT * FROM qualification_questions WHERE template_id = ?'
      ).all(templateId);
      
      template.faqs = db.prepare(
        'SELECT * FROM faqs WHERE template_id = ?'
      ).all(templateId);
      
      template.followUps = db.prepare(
        'SELECT * FROM follow_ups WHERE template_id = ?'
      ).all(templateId);
    }
    
    return template;
  }

  getMessages(conversationId) {
    return db.prepare(`
      SELECT * FROM messages 
      WHERE conversation_id = ? 
      ORDER BY timestamp ASC
    `).all(conversationId);
  }

  getAllConversations() {
    return db.prepare(`
      SELECT c.*, t.name as template_name
      FROM conversations c
      LEFT JOIN templates t ON c.template_id = t.id
      ORDER BY c.last_message_at DESC
    `).all();
  }
}

module.exports = ConversationEngine;