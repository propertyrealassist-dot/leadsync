const express = require('express');
const router = express.Router();
const groqService = require('../services/groqService');
const { db } = require('../config/database');

// ============================================
// AI CHAT ENDPOINT FOR MAKE.COM
// ============================================
router.post('/chat', async (req, res) => {
  try {
    const {
      contactId,
      contactName,
      phone,
      email,
      message,
      conversationId,
      strategyId,
      strategyTag,
      messageDirection
    } = req.body;

    console.log('📨 Received message from Make.com:', {
      contactId,
      contactName,
      message: message?.slice(0, 50) + '...',
      strategyTag
    });

    // Validation
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Don't process outbound messages (messages we sent)
    if (messageDirection === 'outbound') {
      console.log('⏭️  Skipping outbound message');
      return res.json({
        success: true,
        skip: true,
        response: null
      });
    }

    // Find strategy by ID or tag
    let strategy;
    if (strategyId) {
      strategy = await db.get('SELECT * FROM templates WHERE id = ?', [strategyId]);
    } else if (strategyTag) {
      strategy = await db.get('SELECT * FROM templates WHERE tag = ?', [strategyTag]);
    }

    // If no strategy found, use default
    if (!strategy) {
      console.log('⚠️  No strategy found, using default');
      strategy = {
        name: 'Default AI Agent',
        tone: 'Friendly and Professional',
        brief: 'You are a helpful AI assistant. Be friendly, professional, and concise.',
        objective: 'Help the customer and answer their questions',
        companyInformation: 'We are here to help you.',
        step1_role: 'You are a helpful AI assistant.',
        step2_objectives: '- Answer questions\n- Be helpful',
        step3_conversation_flow: '1. Greet\n2. Help\n3. Close',
        step4_guidelines: '- Be friendly\n- Keep it concise',
        step5_handling: '- Handle objections professionally'
      };
    }

    console.log('🎯 Using strategy:', strategy.name);

    // Build system prompt from strategy
    const systemPrompt = groqService.buildComprehensiveSystemPrompt(strategy, contactName || 'User');

    // Build conversation history
    // TODO: Fetch previous messages from database if needed
    const messages = [
      {
        role: 'user',
        content: message
      }
    ];

    // Generate AI response
    console.log('🤖 Generating AI response...');
    const aiResponse = await groqService.generateResponse(messages, systemPrompt, {
      initialMessage: strategy.initial_message,
      userName: contactName || 'User'
    });

    console.log('✅ AI response generated:', aiResponse.slice(0, 100) + '...');

    // Return response
    res.json({
      success: true,
      response: aiResponse,
      contactId,
      conversationId,
      strategyUsed: strategy.name
    });

  } catch (error) {
    console.error('❌ AI chat error:', error);

    // Return friendly error message
    res.status(500).json({
      success: false,
      error: error.message,
      response: "I'm sorry, I'm having trouble processing your message right now. Please try again in a moment."
    });
  }
});

// ============================================
// HEALTH CHECK
// ============================================
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    status: 'AI service is running',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// TEST ENDPOINT
// ============================================
router.post('/test', async (req, res) => {
  try {
    const { message } = req.body;

    const testStrategy = {
      name: 'Test Agent',
      tone: 'Friendly',
      brief: 'You are a test AI assistant.',
      objective: 'Test responses',
      companyInformation: 'Test company',
      step1_role: 'You are a test AI assistant.',
      step2_objectives: '- Answer questions\n- Be helpful',
      step3_conversation_flow: '1. Greet\n2. Help',
      step4_guidelines: '- Be friendly',
      step5_handling: '- Handle objections'
    };

    const systemPrompt = groqService.buildComprehensiveSystemPrompt(testStrategy, 'Test User');

    const messages = [
      {
        role: 'user',
        content: message || 'Hello, how are you?'
      }
    ];

    const response = await groqService.generateResponse(messages, systemPrompt);

    res.json({
      success: true,
      response,
      test: true
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
