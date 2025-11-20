const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const aiService = require('../services/aiServiceRouter');
const { db } = require('../config/database');

// Test AI conversation endpoint
router.post('/conversation', authenticateToken, async (req, res) => {
  try {
    const { strategyId, userName, message, conversationHistory } = req.body;

    console.log('🤖 Test AI request received');
    console.log('Strategy ID:', strategyId);
    console.log('User ID from auth:', req.user.id);
    console.log('User Name:', userName);
    console.log('Message:', message);

    // DEBUG: Show ALL strategies in database
    const allStrategies = await db.all('SELECT id, user_id, name FROM templates', []);
    console.log('\n📊 ALL STRATEGIES IN DATABASE:');
    allStrategies.forEach(s => {
      console.log(`   - ${s.name} | ID: ${s.id} | user_id: ${s.user_id}`);
    });

    // DEBUG: Check if this specific strategy ID exists at all (any user)
    const strategyAny = await db.get('SELECT * FROM templates WHERE id = ?', [strategyId]);
    console.log('\n📊 Strategy exists (any user)?', strategyAny ? 'YES' : 'NO');
    if (strategyAny) {
      console.log('   Found with user_id:', strategyAny.user_id);
      console.log('   Expected user_id:', req.user.id);
      console.log('   Match?', strategyAny.user_id === req.user.id ? 'YES ✅' : 'NO ❌');
    }

    // Get strategy with proper user_id check
    const strategy = await db.get('SELECT * FROM templates WHERE id = ? AND user_id = ?', [strategyId, req.user.id]);

    if (!strategy) {
      console.log('\n❌ Strategy not found for this user');
      console.log('   Searched for ID:', strategyId);
      console.log('   For user_id:', req.user.id);
      return res.status(404).json({ error: 'Strategy not found' });
    }

    console.log('✅ Strategy found:', strategy.name);
    console.log('📋 Initial message from DB:', strategy.initial_message);

    // Build system prompt
    const systemPrompt = aiService.buildComprehensiveSystemPrompt(strategy, userName);

    // Format conversation history
    const messages = conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // Add new message
    messages.push({ role: 'user', content: message });

    console.log('📤 Calling AI API with', messages.length, 'messages');

    // Get REAL AI response - pass initial_message and userName for template substitution
    const aiResponse = await aiService.generateResponse(messages, systemPrompt, {
      initialMessage: strategy.initial_message,
      userName: userName
    });

    console.log('✅ AI response generated');

    res.json({
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Test AI error:', error);
    res.status(500).json({
      error: 'AI service error',
      message: error.message
    });
  }
});

module.exports = router;
