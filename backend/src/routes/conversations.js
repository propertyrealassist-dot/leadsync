const express = require('express');
const router = express.Router();
const ConversationEngine = require('../services/conversationEngine');

const engine = new ConversationEngine();

// Get all conversations
router.get('/', async (req, res) => {
  try {
    const conversations = engine.getAllConversations();
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single conversation with messages
router.get('/:id', async (req, res) => {
  try {
    const conversation = engine.getConversation(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = engine.getMessages(req.params.id);
    
    res.json({
      ...conversation,
      messages
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start new conversation
router.post('/start', async (req, res) => {
  try {
    const { templateId, contactName, contactPhone } = req.body;

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID required' });
    }

    const conversationId = engine.startConversation(templateId, contactName, contactPhone);
    const messages = engine.getMessages(conversationId);

    // Get the first AI message (welcome message)
    const welcomeMessage = messages && messages.length > 0 ? messages[messages.length - 1].content : 'Hello! How can I help you today?';

    res.status(201).json({
      conversationId,
      message: welcomeMessage,
      messages
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
router.post('/:id/message', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const response = await engine.processMessage(req.params.id, message);
    const messages = engine.getMessages(req.params.id);

    res.json({
      aiResponse: response,
      response,
      messages
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;