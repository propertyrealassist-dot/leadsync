const { db } = require('../config/database');
const claudeAI = require('./claudeAI');
const ghlService = require('./ghlSender');
const crypto = require('crypto');

/**
 * Process incoming message from GHL webhook
 */
async function processIncomingMessage({ webhookLogId, user, payload, startTime, isTest = false }) {
  try {
    console.log('\n📨 Processing message for user:', user.email);

    // Extract message data from GHL payload
    const messageData = extractMessageData(payload);

    if (!messageData) {
      throw new Error('Invalid webhook payload - could not extract message data');
    }

    console.log('📋 Message data:', messageData);

    // Find matching strategy by tag
    console.log('🏷️  Contact tags:', messageData.tags);
    console.log('🔍 Looking for strategy matching tags...');
    const strategy = await findStrategyByTag(user.id, messageData.tags);

    console.log('📋 Strategy loaded:', {
      found: !!strategy,
      name: strategy?.name,
      hasObjective: !!strategy?.objective,
      hasBrief: !!strategy?.brief,
      hasCTA: !!strategy?.cta,
      temperature: strategy?.bot_temperature
    });

    if (!strategy) {
      console.log('⚠️  No matching strategy found, using default response');

      // Send default response
      const defaultMessage = "Thank you for your message! We've received it and will get back to you soon.";

      if (!isTest) {
        await ghlService.sendMessage({
          contactId: messageData.contactId,
          message: defaultMessage,
          conversationId: messageData.conversationId,
          messageType: messageData.messageType,
          userId: user.id
        });
      }

      // Update webhook log
      if (webhookLogId) {
        await db.run(`
          UPDATE webhook_logs
          SET status_code = ?, response_body = ?, processing_time_ms = ?,
              error_message = ?
          WHERE id = ?
        `, [200,
          JSON.stringify({ message: defaultMessage }),
          Date.now() - startTime,
          'No matching strategy found',
          webhookLogId
        ]);
      }

      return {
        success: true,
        response: defaultMessage,
        strategy: null
      };
    }

    console.log('✅ Found strategy:', strategy.name);

    // Get or create conversation
    let conversation = await getConversation(messageData.conversationId);

    if (!conversation) {
      conversation = await createConversation({
        userId: user.id,
        templateId: strategy.id,
        contactName: messageData.contactName,
        contactPhone: messageData.contactPhone,
        conversationId: messageData.conversationId
      });
    }

    // Store incoming message
    await storeMessage({
      conversationId: conversation.id,
      sender: 'contact',
      content: messageData.message,
      messageType: messageData.messageType
    });

    // Get conversation history
    const conversationHistory = await getConversationHistory(conversation.id);

    // Build AI prompt
    const aiPrompt = await buildAIPrompt(strategy, messageData, conversationHistory);

    console.log('📝 Full prompt length:', aiPrompt.length);
    console.log('📝 Prompt preview (first 300 chars):', aiPrompt.substring(0, 300));
    console.log('🤖 Sending to Groq AI...');

    // Process with Claude AI
    const aiResponse = await claudeAI.processMessage(aiPrompt, {
      temperature: strategy.bot_temperature || 0.7,
      conversationId: conversation.id
    });

    console.log('✅ AI Response:', aiResponse.substring(0, 100) + '...');

    // Store AI response
    await storeMessage({
      conversationId: conversation.id,
      sender: 'bot',
      content: aiResponse,
      messageType: 'SMS'
    });

    // Send response back to GHL
    if (!isTest) {
      await ghlService.sendMessage({
        contactId: messageData.contactId,
        message: aiResponse,
        conversationId: messageData.conversationId,
        messageType: messageData.messageType,
        userId: user.id
      });
    }

    // Update webhook log
    if (webhookLogId) {
      await db.run(`
        UPDATE webhook_logs
        SET status_code = ?, response_body = ?, processing_time_ms = ?,
            matched_template_id = ?, created_conversation_id = ?, user_id = ?
        WHERE id = ?
      `, [200,
        JSON.stringify({ message: aiResponse }),
        Date.now() - startTime,
        strategy.id,
        conversation.id,
        user.id,
        webhookLogId
      ]);
    }

    return {
      success: true,
      response: aiResponse,
      strategy: strategy.name,
      conversationId: conversation.id
    };

  } catch (error) {
    console.error('❌ Processing error:', error);

    // Send fallback message
    const fallbackMessage = "I'm having trouble processing your message right now. Please try again in a moment.";

    if (!isTest && payload.contact?.id) {
      try {
        await ghlService.sendMessage({
          contactId: payload.contact.id,
          message: fallbackMessage,
          conversationId: payload.message?.conversationId,
          messageType: payload.messageType || 'SMS',
          userId: user.id
        });
      } catch (sendError) {
        console.error('❌ Failed to send fallback message:', sendError);
      }
    }

    // Update webhook log with error
    if (webhookLogId) {
      await db.run(`
        UPDATE webhook_logs
        SET status_code = ?, error_message = ?, processing_time_ms = ?, user_id = ?
        WHERE id = ?
      `, [500,
        error.message,
        Date.now() - startTime,
        user.id,
        webhookLogId
      ]);
    }

    throw error;
  }
}

/**
 * Extract message data from GHL webhook payload
 */
function extractMessageData(payload) {
  try {
    console.log('🔍 Extracting message data from payload...');
    console.log('   Payload keys:', Object.keys(payload));

    // Different GHL webhook formats
    const message = payload.message?.body || payload.body || payload.text || '';
    const contactId = payload.contact?.id || payload.contactId || '';
    const conversationId = payload.message?.conversationId || payload.conversationId || '';
    const contactName = payload.contact?.name || payload.contactName || 'Unknown';
    const contactPhone = payload.contact?.phone || payload.phone || '';
    const tags = payload.contact?.tags || payload.tags || [];

    // IMPORTANT: GHL puts messageType directly on payload (not nested in payload.message)
    // messageType can be "SMS", "FB" (Facebook), "WhatsApp", etc.
    const messageType = payload.messageType || payload.message?.type || 'SMS';

    console.log('   Message:', message?.substring(0, 50) + '...');
    console.log('   Contact ID:', contactId);
    console.log('   Conversation ID:', conversationId);
    console.log('   Message Type:', messageType);

    if (!message) {
      console.log('   ❌ No message body found, returning null');
      return null;
    }

    return {
      message,
      contactId,
      conversationId,
      contactName,
      contactPhone,
      tags,
      messageType
    };
  } catch (error) {
    console.error('Error extracting message data:', error);
    return null;
  }
}

/**
 * Find strategy by tag
 */
async function findStrategyByTag(userId, tags) {
  try {
    if (!tags || tags.length === 0) {
      console.log('⚠️  No tags provided, using default strategy (first created)');
      // Return first strategy for user as default
      const defaultStrategy = await db.get(`
        SELECT * FROM templates
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId]);

      if (defaultStrategy) {
        console.log(`✅ Default strategy: "${defaultStrategy.name}" (tag: ${defaultStrategy.tag || 'none'})`);
      }

      return defaultStrategy;
    }

    console.log(`🏷️  Contact has ${tags.length} tag(s): ${tags.join(', ')}`);

    // Try to find strategy matching any of the tags
    for (const tag of tags) {
      console.log(`   Searching for strategy with tag: "${tag}"`);
      const strategy = await db.get(`
        SELECT * FROM templates
        WHERE user_id = ? AND LOWER(tag) = LOWER(?)
      `, [userId, tag]);

      if (strategy) {
        console.log(`   ✅ MATCH FOUND! Strategy: "${strategy.name}" matches tag: "${tag}"`);
        return strategy;
      } else {
        console.log(`   ❌ No strategy found for tag: "${tag}"`);
      }
    }

    // If no match, return first strategy as default
    console.log('⚠️  No tag match found, using default strategy');
    const defaultStrategy = await db.get(`
      SELECT * FROM templates
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    if (defaultStrategy) {
      console.log(`✅ Default strategy: "${defaultStrategy.name}" (tag: ${defaultStrategy.tag || 'none'})`);
    }

    return defaultStrategy;

  } catch (error) {
    console.error('Error finding strategy:', error);
    return null;
  }
}

/**
 * Get existing conversation
 */
async function getConversation(conversationId) {
  try {
    return await db.get(`
      SELECT * FROM conversations
      WHERE id = ?
    `, [conversationId]);
  } catch (error) {
    console.error('Error getting conversation:', error);
    return null;
  }
}

/**
 * Create new conversation
 */
async function createConversation({ userId, templateId, contactName, contactPhone, conversationId }) {
  try {
    const id = conversationId || crypto.randomUUID();

    await db.run(`
      INSERT INTO conversations (
        id, user_id, template_id, contact_name, contact_phone,
        status, started_at, last_message_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [id, userId, templateId, contactName, contactPhone, 'active']);

    return { id, user_id: userId, template_id: templateId };
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

/**
 * Store message in database
 */
async function storeMessage({ conversationId, sender, content, messageType = 'SMS' }) {
  try {
    // Generate valid UUID if missing to prevent crashes
    const finalConversationId = conversationId || crypto.randomUUID();

    await db.run(`
      INSERT INTO messages (conversation_id, sender, content, timestamp)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `, [finalConversationId, sender, content]);

    // Update conversation's last_message_at (only if conversation exists)
    if (conversationId) {
      await db.run(`
        UPDATE conversations
        SET last_message_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [conversationId]);
    }

  } catch (error) {
    console.error('Error storing message:', error);
    throw error;
  }
}

/**
 * Get conversation history
 */
async function getConversationHistory(conversationId, limit = 10) {
  try {
    const rows = await db.all(`
      SELECT sender, content, timestamp
      FROM messages
      WHERE conversation_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `, [conversationId, limit]);

    // Reverse to get chronological order
    return rows ? rows.reverse() : [];
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}

/**
 * Build AI prompt from strategy and message
 */
async function buildAIPrompt(strategy, messageData, conversationHistory) {
  let prompt = `You are an AI assistant for ${strategy.company_information || 'a business'}.\n\n`;

  // Add objective
  if (strategy.objective) {
    prompt += `OBJECTIVE: ${strategy.objective}\n\n`;
  }

  // Add tone
  if (strategy.tone) {
    prompt += `TONE: ${strategy.tone}\n\n`;
  }

  // Add INITIAL MESSAGE (critical for first contact!)
  // Count how many messages are from the customer (not bot)
  const customerMessageCount = conversationHistory.filter(msg => msg.sender === 'contact').length;

  // Show initial message only if this is the customer's first message (0 previous customer messages)
  // This means even if there are bot messages, we still show initial greeting for first customer contact
  if (strategy.initial_message && customerMessageCount === 0) {
    prompt += `\n${'='.repeat(80)}\n`;
    prompt += `CRITICAL - FIRST MESSAGE PROTOCOL:\n`;
    prompt += `${'='.repeat(80)}\n\n`;
    prompt += `This is the contact's FIRST message to you.\n`;
    prompt += `You MUST respond EXACTLY with this initial greeting:\n\n`;
    prompt += `"${strategy.initial_message}"\n\n`;
    prompt += `DO NOT deviate from this message. Copy it EXACTLY.\n`;
    prompt += `After they respond, THEN you can engage naturally.\n`;
    prompt += `${'='.repeat(80)}\n\n`;
  }

  // Load and add QUALIFICATION QUESTIONS from database
  try {
    const questions = await db.all(`
      SELECT text, id
      FROM qualification_questions
      WHERE template_id = ?
      ORDER BY id ASC
    `, [strategy.id]);

    if (questions && questions.length > 0) {
      prompt += `QUALIFICATION QUESTIONS:\n`;
      prompt += `Your primary goal is to ask these questions to qualify the lead:\n\n`;
      questions.forEach((q, idx) => {
        prompt += `${idx + 1}. ${q.text}\n`;
      });
      prompt += `\n`;
      prompt += `QUALIFICATION STRATEGY:\n`;
      prompt += `- Ask ONE question at a time, naturally woven into the conversation\n`;
      prompt += `- Listen to their responses and ask follow-up questions to go deeper\n`;
      prompt += `- Only move to the next qualification question after getting a meaningful answer\n`;
      prompt += `- Keep your responses SHORT and conversational (1-2 sentences max)\n`;
      prompt += `- Don't mention that you're "qualifying" them - keep it natural\n\n`;
    }
  } catch (error) {
    console.error('Error loading qualification questions:', error);
  }

  // Add brief
  if (strategy.brief) {
    prompt += `CONTEXT: ${strategy.brief}\n\n`;
  }

  // Add conversation history
  if (conversationHistory.length > 0) {
    prompt += `CONVERSATION HISTORY:\n`;
    conversationHistory.forEach(msg => {
      prompt += `${msg.sender === 'contact' ? 'Customer' : 'You'}: ${msg.content}\n`;
    });
    prompt += `\n`;
  }

  // Add current message
  prompt += `CURRENT MESSAGE FROM ${messageData.contactName}:\n${messageData.message}\n\n`;

  // Add instructions
  prompt += `RESPONSE GUIDELINES:\n`;
  prompt += `1. ${customerMessageCount === 0 ? 'Use the INITIAL MESSAGE above' : 'Continue the natural conversation flow'}\n`;
  prompt += `2. Keep responses SHORT (1-2 sentences max) and conversational\n`;
  prompt += `3. Match the TONE specified above\n`;
  prompt += `4. Focus on asking the QUALIFICATION QUESTIONS one at a time\n`;
  prompt += `5. Build rapport and trust naturally\n`;

  if (strategy.cta) {
    prompt += `6. When qualified, guide towards: ${strategy.cta}\n`;
  }

  prompt += `\nYOUR RESPONSE (respond naturally and conversationally):`;

  return prompt;
}

module.exports = {
  processIncomingMessage,
  extractMessageData,
  findStrategyByTag,
  buildAIPrompt
};
