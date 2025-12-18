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
    const strategy = findStrategyByTag(user.id, messageData.tags);

    if (!strategy) {
      console.log('⚠️  No matching strategy found, using default response');

      // Send default response
      const defaultMessage = "Thank you for your message! We've received it and will get back to you soon.";

      if (!isTest) {
        await ghlService.sendMessage({
          contactId: messageData.contactId,
          message: defaultMessage,
          conversationId: messageData.conversationId
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
    let conversation = getConversation(messageData.conversationId);

    if (!conversation) {
      conversation = createConversation({
        userId: user.id,
        templateId: strategy.id,
        contactName: messageData.contactName,
        contactPhone: messageData.contactPhone,
        conversationId: messageData.conversationId
      });
    }

    // Store incoming message
    storeMessage({
      conversationId: conversation.id,
      sender: 'contact',
      content: messageData.message,
      messageType: messageData.messageType
    });

    // Get conversation history
    const conversationHistory = getConversationHistory(conversation.id);

    // Build AI prompt
    const aiPrompt = buildAIPrompt(strategy, messageData, conversationHistory);

    console.log('🤖 Sending to Claude AI...');

    // Process with Claude AI
    const aiResponse = await claudeAI.processMessage(aiPrompt, {
      temperature: strategy.bot_temperature || 0.7,
      conversationId: conversation.id
    });

    console.log('✅ AI Response:', aiResponse.substring(0, 100) + '...');

    // Store AI response
    storeMessage({
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
        conversationId: messageData.conversationId
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
          conversationId: payload.message?.conversationId
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
    // Different GHL webhook formats
    const message = payload.message?.body || payload.body || payload.text || '';
    const contactId = payload.contact?.id || payload.contactId || '';
    const conversationId = payload.message?.conversationId || payload.conversationId || '';
    const contactName = payload.contact?.name || payload.contactName || 'Unknown';
    const contactPhone = payload.contact?.phone || payload.phone || '';
    const tags = payload.contact?.tags || payload.tags || [];
    const messageType = payload.message?.type || payload.type || 'SMS';

    if (!message) {
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
      console.log('No tags provided, looking for default strategy');
      // Return first strategy for user as default
      return await db.get(`
        SELECT * FROM templates
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId]);
    }

    // Try to find strategy matching any of the tags
    for (const tag of tags) {
      const strategy = await db.get(`
        SELECT * FROM templates
        WHERE user_id = ? AND LOWER(tag) = LOWER(?)
      `, [userId, tag]);

      if (strategy) {
        return strategy;
      }
    }

    // If no match, return first strategy as default
    return await db.get(`
      SELECT * FROM templates
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

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
    await db.run(`
      INSERT INTO messages (conversation_id, sender, content, timestamp)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `, [conversationId, sender, content]);

    // Update conversation's last_message_at
    await db.run(`
      UPDATE conversations
      SET last_message_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [conversationId]);

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
function buildAIPrompt(strategy, messageData, conversationHistory) {
  let prompt = `You are an AI assistant for ${strategy.company_information || 'a business'}.\n\n`;

  // Add objective
  if (strategy.objective) {
    prompt += `OBJECTIVE: ${strategy.objective}\n\n`;
  }

  // Add tone
  if (strategy.tone) {
    prompt += `TONE: ${strategy.tone}\n\n`;
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
  prompt += `Please respond appropriately based on the context and conversation history. `;
  prompt += `Keep your response concise and natural. `;

  if (strategy.cta) {
    prompt += `When appropriate, guide the conversation towards: ${strategy.cta}\n`;
  }

  return prompt;
}

module.exports = {
  processIncomingMessage,
  extractMessageData,
  findStrategyByTag,
  buildAIPrompt
};
