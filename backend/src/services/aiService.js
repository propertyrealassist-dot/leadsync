const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

class AIService {
  /**
   * Build comprehensive system prompt from strategy template
   */
  buildComprehensiveSystemPrompt(strategy, userName = 'User') {
    let systemPrompt = `You are a professional AI sales assistant conducting a structured lead qualification conversation.

# YOUR ROLE
${strategy.step1_role || strategy.brief || 'You are a helpful sales assistant.'}

# YOUR OBJECTIVES
${strategy.step2_objectives || strategy.goal || 'Qualify leads and book appointments.'}

# CONVERSATION FLOW - FOLLOW THIS STRUCTURE
${strategy.step3_conversation_flow || 'Have a natural conversation while gathering information.'}

# GUIDELINES & BEST PRACTICES
${strategy.step4_guidelines || 'Be professional, friendly, and helpful.'}

# HANDLING OBJECTIONS & SPECIAL CASES
${strategy.step5_handling || 'Address concerns professionally and offer solutions.'}

---

# IMPORTANT INSTRUCTIONS

## Conversation Structure:
1. **FIRST MESSAGE ONLY**: Start with the initial greeting
2. **ASK QUESTIONS IN ORDER**: Go through qualification questions one at a time
3. **LISTEN**: Wait for the user's answer before asking the next question
4. **DON'T RUSH**: Don't ask multiple questions at once
5. **BE NATURAL**: Acknowledge their answers before moving to the next question

## Initial Greeting:`;

    // Add initial message
    try {
      if (strategy.conversationSteps) {
        const steps = JSON.parse(strategy.conversationSteps);
        if (steps.initialMessage) {
          systemPrompt += `\n"${steps.initialMessage}"`;
        }
      }
    } catch (e) {
      console.error('Error parsing conversation steps:', e);
    }

    // Add qualification questions
    systemPrompt += `\n\n## Qualification Questions (Ask ONE at a time, in order):`;
    try {
      if (strategy.conversationSteps) {
        const steps = JSON.parse(strategy.conversationSteps);
        if (steps.questions && steps.questions.length > 0) {
          steps.questions.forEach((q, i) => {
            systemPrompt += `\n${i + 1}. ${q.text || q.question}`;
          });
          systemPrompt += `\n\nAfter asking all questions, summarize what you learned and offer to book an appointment.`;
        }
      }
    } catch (e) {
      console.error('Error parsing conversation steps:', e);
    }

    // Add knowledge base / FAQs
    try {
      if (strategy.knowledgeBase) {
        const kb = JSON.parse(strategy.knowledgeBase);
        if (kb.faqs && kb.faqs.length > 0) {
          systemPrompt += `\n\n## Knowledge Base - Use this to answer questions:`;
          kb.faqs.forEach((faq) => {
            systemPrompt += `\n\nQ: ${faq.question}\nA: ${faq.answer}`;
          });
        }
      }
    } catch (e) {
      console.error('Error parsing knowledge base:', e);
    }

    // Add response style
    systemPrompt += `\n\n## Your Communication Style:`;
    try {
      if (strategy.responseStyle) {
        const style = JSON.parse(strategy.responseStyle);
        systemPrompt += `\n- Personality: ${style.personality || 'Professional and friendly'}`;
        systemPrompt += `\n- Message length: ${style.length || 'Concise (2-3 sentences)'}`;
        if (style.emojis) {
          systemPrompt += `\n- Use appropriate emojis to be friendly`;
        }
      } else {
        systemPrompt += `\n- Tone: ${strategy.tone || 'Professional and friendly'}`;
        systemPrompt += `\n- Keep responses concise (2-3 sentences)`;
      }
    } catch (e) {
      console.error('Error parsing response style:', e);
    }

    // Add booking info
    try {
      if (strategy.bookingWorkflow) {
        const booking = JSON.parse(strategy.bookingWorkflow);
        if (booking.enabled) {
          systemPrompt += `\n\n## Appointment Booking:`;
          systemPrompt += `\nAfter qualification, offer to schedule a ${booking.durationType || 'meeting'}.`;
          if (booking.callToAction) {
            systemPrompt += `\nCall to action: "${booking.callToAction}"`;
          }
        }
      }
    } catch (e) {
      console.error('Error parsing booking workflow:', e);
    }

    systemPrompt += `\n\n---

# CONVERSATION TRACKER
- User's name: ${userName}
- Current conversation: Maintain context from previous messages
- Next step: Follow the conversation flow and ask questions in order

Remember: Be helpful, professional, and guide the conversation naturally toward qualification and booking.`;

    console.log('📋 Built system prompt:', systemPrompt.substring(0, 200) + '...');

    return systemPrompt;
  }

  /**
   * Generate AI response using Claude API
   */
  async generateResponse(messages, systemPrompt, options = {}) {
    try {
      const {
        model = 'claude-sonnet-4-20250514',
        maxTokens = 2048,
        temperature = 1.0
      } = options;

      console.log('🤖 Calling Claude API...');
      console.log('Messages count:', messages.length);

      // Check if this is an initial greeting request
      const isInitialGreeting = messages.length === 1 &&
                                 messages[0].role === 'user' &&
                                 messages[0].content === '__INIT__';

      let chatMessages;
      if (isInitialGreeting) {
        console.log('🎯 Generating initial greeting...');
        // For initial greeting, just ask the AI to start the conversation
        chatMessages = [
          { role: 'user', content: 'Please start the conversation with the initial greeting.' }
        ];
      } else {
        chatMessages = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      }

      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: chatMessages
      });

      console.log('✅ Claude API response received');

      // Extract text content from response
      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      return textContent;

    } catch (error) {
      console.error('❌ Claude API error:', error);

      if (error.status === 401) {
        throw new Error('Invalid API key. Please check your ANTHROPIC_API_KEY in .env');
      }

      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      if (error.status === 529) {
        throw new Error('Claude API is temporarily overloaded. Please try again.');
      }

      throw error;
    }
  }

  /**
   * Generate response with streaming (for future use)
   */
  async *generateStreamingResponse(messages, systemPrompt, options = {}) {
    try {
      const {
        model = 'claude-3-5-sonnet-20241022',
        maxTokens = 1024,
        temperature = 1.0
      } = options;

      const stream = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages,
        stream: true
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield event.delta.text;
        }
      }

    } catch (error) {
      console.error('Claude Streaming Error:', error.message);
      throw new Error(`Claude streaming error: ${error.message}`);
    }
  }

  /**
   * Analyze conversation and extract lead information
   */
  async extractLeadInfo(conversationHistory, strategy) {
    const systemPrompt = `You are a lead qualification assistant. Analyze the conversation and extract key information about the lead.

Extract:
- Name (if mentioned)
- Email (if mentioned)
- Phone (if mentioned)
- Company (if mentioned)
- Lead score (0-100 based on engagement and qualification)
- Status (new, contacted, qualified, interested, not_interested)
- Summary (brief 1-2 sentence summary of the conversation)

Return ONLY a JSON object with this structure:
{
  "name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "company": "string or null",
  "score": number,
  "status": "string",
  "summary": "string"
}`;

    const messages = [
      {
        role: 'user',
        content: `Analyze this conversation:\n\n${JSON.stringify(conversationHistory, null, 2)}`
      }
    ];

    try {
      const response = await this.generateResponse(messages, systemPrompt, {
        temperature: 0.3,
        maxTokens: 500
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('Lead extraction error:', error);
      return null;
    }
  }
}

module.exports = new AIService();
