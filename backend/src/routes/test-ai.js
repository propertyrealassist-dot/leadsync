const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const aiService = require('../services/aiServiceRouter');
const { db } = require('../config/database');

// Get all test conversations for authenticated user
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.currentOrganizationId;
    console.log('📋 Fetching test conversations for user:', req.user.id, 'organization:', orgId);

    // Strict organization filtering - only show data for current organization
    const conversations = orgId
      ? await db.all(
          `SELECT c.*, t.name as strategy_name
           FROM conversations c
           LEFT JOIN templates t ON c.template_id = t.id
           WHERE c.organization_id = ?
           ORDER BY c.last_message_at DESC`,
          [orgId]
        )
      : await db.all(
          `SELECT c.*, t.name as strategy_name
           FROM conversations c
           LEFT JOIN templates t ON c.template_id = t.id
           WHERE c.user_id = ? AND c.organization_id IS NULL
           ORDER BY c.last_message_at DESC`,
          [req.user.id]
        );

    console.log(`✅ Found ${conversations.length} conversations for org ${orgId || 'personal'}`);

    // Get message counts for each conversation
    const conversationsWithCounts = await Promise.all(
      conversations.map(async (conv) => {
        const messageCount = await db.get(
          'SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?',
          [conv.id]
        );

        const lastMessage = await db.get(
          'SELECT content, timestamp FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT 1',
          [conv.id]
        );

        return {
          ...conv,
          message_count: messageCount.count,
          last_message_preview: lastMessage ? lastMessage.content.substring(0, 50) + '...' : '',
          last_message_timestamp: lastMessage ? lastMessage.timestamp : conv.last_message_at
        };
      })
    );

    res.json(conversationsWithCounts);
  } catch (error) {
    console.error('❌ Error fetching test conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get specific conversation with messages (organization-filtered)
router.get('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const orgId = req.user.currentOrganizationId;
    console.log('📋 Fetching conversation:', conversationId, 'for user:', req.user.id, 'organization:', orgId);

    // Strict organization filtering
    const conversation = orgId
      ? await db.get('SELECT * FROM conversations WHERE id = ? AND organization_id = ?', [conversationId, orgId])
      : await db.get('SELECT * FROM conversations WHERE id = ? AND user_id = ? AND organization_id IS NULL', [conversationId, req.user.id]);

    if (!conversation) {
      console.log('❌ Conversation not found or access denied');
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get all messages for this conversation
    const messages = await db.all(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC',
      [conversationId]
    );

    console.log(`✅ Found conversation with ${messages.length} messages`);

    res.json({
      ...conversation,
      messages
    });
  } catch (error) {
    console.error('❌ Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Create new test conversation
router.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const { strategyId, contactName } = req.body;
    const orgId = req.user.currentOrganizationId;
    console.log('🆕 Creating new test conversation for user:', req.user.id, 'organization:', orgId);

    // Verify user owns this strategy with organization filtering
    const strategy = orgId
      ? await db.get('SELECT * FROM templates WHERE id = ? AND organization_id = ?', [strategyId, orgId])
      : await db.get('SELECT * FROM templates WHERE id = ? AND user_id = ? AND organization_id IS NULL', [strategyId, req.user.id]);

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    // Load qualification questions and FAQs
    const qualificationQuestions = await db.all(
      'SELECT * FROM qualification_questions WHERE template_id = ? ORDER BY id',
      [strategyId]
    );

    const faqs = await db.all(
      'SELECT * FROM faqs WHERE template_id = ? ORDER BY id',
      [strategyId]
    );

    // Attach to strategy object
    strategy.qualificationQuestions = qualificationQuestions;
    strategy.faqs = faqs;

    // Create conversation ID (proper UUID for CockroachDB)
    const { v4: uuidv4 } = require('uuid');
    const conversationId = uuidv4();

    // Insert conversation with organization_id
    await db.run(
      `INSERT INTO conversations (id, user_id, template_id, contact_name, status, organization_id, started_at, last_message_at)
       VALUES (?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [conversationId, req.user.id, strategyId, contactName || 'Test User', orgId]
    );

    // Get initial AI message
    const systemPrompt = aiService.buildComprehensiveSystemPrompt(strategy, contactName || 'Test User');
    const aiResponse = await aiService.generateResponse(
      [{ role: 'user', content: '__INIT__' }],
      systemPrompt,
      { initialMessage: strategy.initial_message, userName: contactName || 'Test User' }
    );

    // Save initial AI message
    await db.run(
      'INSERT INTO messages (conversation_id, sender, content, timestamp) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [conversationId, 'assistant', aiResponse]
    );

    // Update last_message_at
    await db.run(
      'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
      [conversationId]
    );

    console.log('✅ Test conversation created:', conversationId);

    res.json({
      id: conversationId,
      strategyId,
      initialMessage: aiResponse,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error creating test conversation:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({
      error: 'Failed to create conversation',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete test conversation (organization-filtered)
router.delete('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const orgId = req.user.currentOrganizationId;
    console.log('🗑️ Deleting conversation:', conversationId, 'for user:', req.user.id, 'organization:', orgId);

    // Strict organization filtering
    const conversation = orgId
      ? await db.get('SELECT * FROM conversations WHERE id = ? AND organization_id = ?', [conversationId, orgId])
      : await db.get('SELECT * FROM conversations WHERE id = ? AND user_id = ? AND organization_id IS NULL', [conversationId, req.user.id]);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Delete conversation (messages cascade automatically)
    await db.run('DELETE FROM conversations WHERE id = ?', [conversationId]);

    console.log('✅ Conversation deleted');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Test AI conversation endpoint (legacy - for sending messages)
router.post('/conversation', authenticateToken, async (req, res) => {
  try {
    const { strategyId, userName, message, conversationHistory, conversationId } = req.body;
    const orgId = req.user.currentOrganizationId;

    console.log('🤖 Test AI request received');
    console.log('Strategy ID:', strategyId);
    console.log('User ID from auth:', req.user.id);
    console.log('Organization ID:', orgId);
    console.log('User Name:', userName);
    console.log('Message:', message);
    console.log('Conversation ID:', conversationId);

    // Get strategy with strict organization filtering
    const strategy = orgId
      ? await db.get('SELECT * FROM templates WHERE id = ? AND organization_id = ?', [strategyId, orgId])
      : await db.get('SELECT * FROM templates WHERE id = ? AND user_id = ? AND organization_id IS NULL', [strategyId, req.user.id]);

    if (!strategy) {
      console.log('\n❌ Strategy not found for this user');
      console.log('   Searched for ID:', strategyId);
      console.log('   For user_id:', req.user.id);
      return res.status(404).json({ error: 'Strategy not found' });
    }

    console.log('✅ Strategy found:', strategy.name);
    console.log('📋 Initial message from DB:', strategy.initial_message);

    // Load qualification questions from database
    const qualificationQuestions = await db.all(
      'SELECT * FROM qualification_questions WHERE template_id = ? ORDER BY id',
      [strategyId]
    );
    console.log('📊 Loaded', qualificationQuestions.length, 'qualification questions from DB');

    // Load FAQs from database
    const faqs = await db.all(
      'SELECT * FROM faqs WHERE template_id = ? ORDER BY id',
      [strategyId]
    );
    console.log('📊 Loaded', faqs.length, 'FAQs from DB');

    // Attach to strategy object for prompt building
    strategy.qualificationQuestions = qualificationQuestions;
    strategy.faqs = faqs;

    // Build system prompt
    const systemPrompt = aiService.buildComprehensiveSystemPrompt(strategy, userName);

    console.log('\n📋 SYSTEM PROMPT LENGTH:', systemPrompt.length);
    console.log('📋 SYSTEM PROMPT CONTENT:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(systemPrompt);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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

    // Save messages to database if conversationId provided
    if (conversationId) {
      try {
        // Verify conversation exists and belongs to this organization/user
        const conversation = orgId
          ? await db.get('SELECT * FROM conversations WHERE id = ? AND organization_id = ?', [conversationId, orgId])
          : await db.get('SELECT * FROM conversations WHERE id = ? AND user_id = ? AND organization_id IS NULL', [conversationId, req.user.id]);

        if (conversation) {
          // Save user message (skip if it's __INIT__)
          if (message !== '__INIT__') {
            await db.run(
              'INSERT INTO messages (conversation_id, sender, content, timestamp) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
              [conversationId, 'user', message]
            );
          }

          // Save AI response
          await db.run(
            'INSERT INTO messages (conversation_id, sender, content, timestamp) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
            [conversationId, 'assistant', aiResponse]
          );

          // Update last_message_at
          await db.run(
            'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
            [conversationId]
          );

          console.log('💾 Messages saved to database for conversation:', conversationId);
        } else {
          console.log('⚠️  Conversation not found or access denied - not saving messages');
        }
      } catch (dbError) {
        console.error('❌ Error saving messages to database:', dbError);
        // Don't fail the request, just log the error
      }
    }

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
