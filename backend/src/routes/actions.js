const express = require('express');
const router = express.Router();
const ConversationEngine = require('../services/conversationEngine');

const engine = new ConversationEngine();

// Manually trigger an action (for testing)
router.post('/trigger', (req, res) => {
  try {
    const { conversationId, actionType } = req.body;
    
    if (!conversationId || !actionType) {
      return res.status(400).json({ error: 'conversationId and actionType required' });
    }

    engine.triggerAction(conversationId, actionType);
    
    res.json({ 
      message: `Action ${actionType} triggered successfully`,
      conversationId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;