const { db } = require('../config/database');
const claudeAI = require('./claudeAI');
const calendarAI = require('./calendarAI');
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

    // CRITICAL: Get conversation history BEFORE storing the current message
    // This way we can detect if this is truly the first customer message
    const conversationHistory = await getConversationHistory(conversation.id);
    const customerMessageCount = conversationHistory.filter(msg => msg.sender === 'contact').length;

    console.log('🔍 Message count check:');
    console.log('   Total messages in history:', conversationHistory.length);
    console.log('   Customer messages:', customerMessageCount);
    console.log('   Is first message?', customerMessageCount === 0);

    // Now store the incoming message (after we've checked if it's the first one)
    await storeMessage({
      conversationId: messageData.conversationId,
      contactId: messageData.contactId,
      locationId: messageData.locationId,
      sender: 'contact',
      content: messageData.message,
      messageType: messageData.messageType
    });

    // Check if this is the first customer message
    let aiResponse;

    if (strategy.initial_message && customerMessageCount === 0) {
      // NUCLEAR OPTION: For first message, use initial_message directly (don't trust AI to copy it)
      console.log('🚨 FIRST CUSTOMER MESSAGE DETECTED!');
      console.log('✅ Using configured initial_message directly (bypassing AI)');
      aiResponse = strategy.initial_message;
      console.log('📤 Initial message:', aiResponse);
    } else {
      // Build AI prompt for subsequent messages
      // NOTE: conversationHistory doesn't include the current message yet (we checked count before storing)
      const aiPrompt = await buildAIPrompt(strategy, messageData, conversationHistory);

      console.log('📝 Full prompt length:', aiPrompt.length);
      console.log('📝 Prompt preview (first 300 chars):', aiPrompt.substring(0, 300));

      // Detect if this is a booking-related conversation
      const bookingKeywords = [
        'book', 'schedule', 'appointment', 'calendar', 'available',
        'free time', 'meeting', 'call', 'when can', 'what time',
        'availability', 'slot', 'time', 'meet'
      ];

      const isBookingRelated = bookingKeywords.some(keyword =>
        messageData.message.toLowerCase().includes(keyword) ||
        conversationHistory.some(msg => msg.content.toLowerCase().includes(keyword))
      );

      if (isBookingRelated) {
        console.log('🗓️  Booking-related conversation detected - using Calendar AI');

        // Use Calendar AI with booking capabilities
        aiResponse = await calendarAI.processMessageWithCalendar(aiPrompt, {
          userId: user.id,
          contactId: messageData.contactId,
          contactName: messageData.contactName,
          contactPhone: messageData.contactPhone,
          contactEmail: messageData.contactEmail,
          temperature: strategy.bot_temperature || 0.7,
          conversationHistory: conversationHistory
        });

        console.log('✅ Calendar AI Response:', aiResponse.substring(0, 100) + '...');
      } else {
        console.log('🤖 Using regular AI...');

        // Process with regular Claude AI
        aiResponse = await claudeAI.processMessage(aiPrompt, {
          temperature: strategy.bot_temperature || 0.7,
          conversationId: conversation.id
        });

        console.log('✅ AI Response:', aiResponse.substring(0, 100) + '...');
      }
    }

    // Store AI response
    await storeMessage({
      conversationId: messageData.conversationId,
      contactId: messageData.contactId,
      locationId: messageData.locationId,
      sender: 'bot',
      content: aiResponse,
      messageType: messageData.messageType
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
    const locationId = payload.locationId || payload.location?.id || '';

    // IMPORTANT: GHL puts messageType directly on payload (not nested in payload.message)
    // messageType can be "SMS", "FB" (Facebook), "WhatsApp", etc.
    const messageType = payload.messageType || payload.message?.type || 'SMS';

    console.log('   Message:', message?.substring(0, 50) + '...');
    console.log('   Contact ID:', contactId);
    console.log('   Conversation ID:', conversationId);
    console.log('   Message Type:', messageType);
    console.log('   Location ID:', locationId);

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
      messageType,
      locationId
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
 * Uses Postgres conversation_messages table schema
 */
async function storeMessage({ conversationId, contactId, locationId, sender, content, messageType = 'SMS' }) {
  try {
    console.log('💾 Storing message in database...');
    console.log('   Conversation ID:', conversationId);
    console.log('   Contact ID:', contactId);
    console.log('   Location ID:', locationId);
    console.log('   Direction:', sender === 'contact' ? 'inbound' : 'outbound');

    // Map sender to direction (contact = inbound, bot = outbound)
    const direction = sender === 'contact' ? 'inbound' : 'outbound';

    await db.run(`
      INSERT INTO conversation_messages (
        ghl_conversation_id,
        ghl_contact_id,
        ghl_location_id,
        message_body,
        message_type,
        direction,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [conversationId, contactId, locationId, content, messageType, direction]);

    console.log('✅ Message stored successfully');

  } catch (error) {
    console.error('❌ Error storing message:', error);
    console.error('   Error details:', error.message);
    console.error('   Stack:', error.stack);
    throw error;
  }
}

/**
 * Get conversation history
 * Uses Postgres conversation_messages table schema
 */
async function getConversationHistory(conversationId, limit = 10) {
  try {
    const rows = await db.all(`
      SELECT
        direction,
        message_body as content,
        created_at as timestamp,
        CASE WHEN direction = 'inbound' THEN 'contact' ELSE 'bot' END as sender
      FROM conversation_messages
      WHERE ghl_conversation_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [conversationId, limit]);

    console.log('📜 Loaded conversation history:', rows?.length || 0, 'messages');

    // Reverse to get chronological order
    return rows ? rows.reverse() : [];
  } catch (error) {
    console.error('❌ Error getting conversation history:', error);
    console.error('   Error details:', error.message);
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
  let questions = [];
  let questionsAsked = 0;
  let allQuestionsAsked = false;

  try {
    questions = await db.all(`
      SELECT text, id
      FROM qualification_questions
      WHERE template_id = ?
      ORDER BY id ASC
    `, [strategy.id]);

    if (questions && questions.length > 0) {
      // CRITICAL: Track which questions have been asked using FUZZY MATCHING
      // AI paraphrases questions, so we can't use exact string matching

      // Helper: Check if a message contains the essence of a question
      const isQuestionAsked = (botMessage, questionText) => {
        // Extract key words from the question (ignore filler words)
        const fillerWords = ['what', 'is', 'your', 'the', 'do', 'you', 'how', 'many', 'are', 'can', 'a', 'an', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by'];
        const questionWords = questionText.toLowerCase()
          .replace(/[?.,!]/g, '') // Remove punctuation
          .split(/\s+/)
          .filter(word => word.length > 3 && !fillerWords.includes(word));

        // Check if bot message contains at least 2 key words from the question
        const botMessageLower = botMessage.toLowerCase();
        const matchCount = questionWords.filter(word => botMessageLower.includes(word)).length;

        return matchCount >= 2;
      };

      const botMessages = conversationHistory.filter(msg => msg.sender === 'bot').map(m => m.content);

      // Track which specific questions have been asked
      const questionsAskedFlags = questions.map((question, index) => {
        const wasAsked = botMessages.some(msg => isQuestionAsked(msg, question.text));
        console.log(`   Q${index + 1} asked? ${wasAsked ? '✅' : '❌'} - "${question.text}"`);
        return wasAsked;
      });

      questionsAsked = questionsAskedFlags.filter(Boolean).length;
      allQuestionsAsked = questionsAsked >= questions.length;

      console.log('📊 Qualification Progress:');
      console.log('   Total questions:', questions.length);
      console.log('   Questions asked:', questionsAsked);
      console.log('   Questions remaining:', questions.length - questionsAsked);
      console.log('   All questions asked?', allQuestionsAsked);
      console.log('   Should send CTA?', allQuestionsAsked);

      if (allQuestionsAsked) {
        // ALL QUESTIONS ASKED - SWITCH TO CTA MODE
        prompt += `\n${'='.repeat(80)}\n`;
        prompt += `🎯 ALL QUALIFICATION QUESTIONS COMPLETED!\n`;
        prompt += `${'='.repeat(80)}\n\n`;
        prompt += `The prospect has answered all ${questions.length} qualification questions.\n\n`;
        prompt += `✅ NEXT STEP: CALL-TO-ACTION (CTA)\n\n`;

        if (strategy.cta) {
          prompt += `YOUR CTA:\n${strategy.cta}\n\n`;
        } else {
          prompt += `Ask if they would like to book a discovery call to discuss how you can help them.\n\n`;
        }

        prompt += `CRITICAL INSTRUCTIONS:\n`;
        prompt += `- DO NOT ask any more qualification questions\n`;
        prompt += `- DO NOT repeat questions that have already been asked\n`;
        prompt += `- MOVE TO CLOSING and guide them towards booking an appointment\n`;
        prompt += `- Use the CTA naturally in the conversation\n`;
        prompt += `- Keep it conversational and helpful (1-2 sentences max)\n`;
        prompt += `${'='.repeat(80)}\n\n`;
      } else {
        // STILL IN QUALIFICATION MODE
        prompt += `\n${'='.repeat(80)}\n`;
        prompt += `📋 QUALIFICATION QUESTIONS (${questionsAsked}/${questions.length} asked)\n`;
        prompt += `${'='.repeat(80)}\n\n`;
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
        prompt += `- Don't mention that you're "qualifying" them - keep it natural\n`;
        prompt += `- DO NOT repeat questions that have already been asked\n`;
        prompt += `${'='.repeat(80)}\n\n`;
      }
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

  if (allQuestionsAsked) {
    prompt += `4. ALL QUESTIONS ASKED - Focus on the CTA above and guide to booking\n`;
    prompt += `5. DO NOT ask any more qualification questions\n`;
  } else {
    prompt += `4. Focus on asking the QUALIFICATION QUESTIONS one at a time (${questionsAsked}/${questions.length} asked)\n`;
    prompt += `5. DO NOT repeat questions already asked\n`;
  }

  prompt += `6. Build rapport and trust naturally\n`;

  // Add calendar capabilities reminder
  prompt += `\n${'='.repeat(80)}\n`;
  prompt += `📅 CALENDAR CAPABILITIES\n`;
  prompt += `${'='.repeat(80)}\n`;
  prompt += `You have access to the calendar and can:\n`;
  prompt += `1. VIEW AVAILABILITY - Check what time slots are available for booking\n`;
  prompt += `2. BOOK APPOINTMENTS - Schedule the lead into a confirmed time slot\n\n`;
  prompt += `When to use these:\n`;
  prompt += `- If they ask "when are you available?" or "what times do you have?" → VIEW calendar\n`;
  prompt += `- If they confirm a specific date/time → BOOK the appointment\n`;
  prompt += `- Always check availability before suggesting times\n`;
  prompt += `- Always confirm the time with them before booking\n`;
  prompt += `${'='.repeat(80)}\n\n`;

  prompt += `\nYOUR RESPONSE (respond naturally and conversationally):`;

  return prompt;
}

module.exports = {
  processIncomingMessage,
  extractMessageData,
  findStrategyByTag,
  buildAIPrompt
};
