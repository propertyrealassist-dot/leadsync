const Anthropic = require('@anthropic-ai/sdk');

class ClaudeAIService {
  constructor(template) {
    this.template = template;
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateResponse(userMessage, conversationHistory) {
    try {
      // Build conversation context from history
      const messages = conversationHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage
      });

      // Create system prompt from template
      const systemPrompt = this.buildSystemPrompt();

      console.log('Sending request to Claude...');

      // Call Claude API
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages
      });

      console.log('Received response from Claude');

      const aiResponse = response.content[0].text;

      return aiResponse;

    } catch (error) {
      console.error('Claude API Error:', error);
      throw new Error('Failed to get AI response: ' + error.message);
    }
  }

  buildSystemPrompt() {
    let prompt = `You are an AI sales assistant for a company. Your role is to engage leads naturally and qualify them through conversation.\n\n`;

    prompt += `BRIEF: ${this.template.brief}\n\n`;

    prompt += `OBJECTIVE: ${this.template.objective}\n\n`;

    if (this.template.company_information) {
      prompt += `COMPANY INFORMATION:\n${this.template.company_information}\n\n`;
    }

    prompt += `COMMUNICATION TONE: ${this.template.tone}\n\n`;

    if (this.template.qualificationQuestions && this.template.qualificationQuestions.length > 0) {
      prompt += `IMPORTANT - QUALIFICATION PROCESS:\n`;
      prompt += `You MUST ask these qualifying questions during the conversation, one at a time:\n\n`;
      this.template.qualificationQuestions.forEach((q, idx) => {
        let questionText = q.text;
        if (typeof q.Body === 'string' && q.Body.startsWith('{')) {
          try {
            const parsed = JSON.parse(q.Body);
            questionText = parsed.text;
          } catch (e) {
            questionText = q.Body;
          }
        }
        prompt += `${idx + 1}. ${questionText}\n`;
      });
      prompt += `\nASK ONE QUESTION AT A TIME. Wait for the user's response before asking the next question. Keep track of which questions you've already asked and answered.\n\n`;
    }

    if (this.template.faqs && this.template.faqs.length > 0) {
      prompt += `FREQUENTLY ASKED QUESTIONS (Use these to answer user queries):\n`;
      this.template.faqs.forEach(faq => {
        prompt += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
      });
    }

    if (this.template.cta) {
      prompt += `CALL TO ACTION: ${this.template.cta}\n\n`;
    }

    prompt += `INTERACTION GUIDELINES:\n`;
    prompt += `- Be conversational, friendly, and natural like a real human salesperson\n`;
    prompt += `- Ask qualification questions one at a time, not all at once\n`;
    prompt += `- Listen to and acknowledge the user's responses before moving to the next question\n`;
    prompt += `- If the user asks a question, answer it using the FAQ section if available\n`;
    prompt += `- Keep messages concise - aim for under 160 characters when possible\n`;
    prompt += `- Show genuine interest in helping the user\n`;
    prompt += `- Build rapport naturally throughout the conversation\n`;
    prompt += `- After gathering qualification info, guide toward ${this.template.cta || 'booking an appointment'}\n`;

    return prompt;
  }

  // Detect if booking should be triggered
  shouldTriggerBooking(message) {
    const bookingKeywords = ['book', 'schedule', 'appointment', 'reserve', 'available', 'calendar', 'meet', 'call'];
    return bookingKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  // Detect if lead is lost
  shouldTriggerLost(message) {
    const lostKeywords = ['not interested', 'stop', 'unsubscribe', 'no thanks', 'leave me alone', 'remove me'];
    return lostKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }
}

/**
 * Simple function for webhook processor
 * Processes a message with Claude AI using a simple prompt
 */
async function processMessage(prompt, context = {}) {
  try {
    console.log('🤖 Processing message with Claude AI...');
    console.log('Prompt length:', prompt.length);

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY not set in environment');
      return getFallbackResponse(context);
    }

    // Initialize Claude client
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Determine temperature
    const temperature = context.temperature || 0.7;

    // Build messages array
    const messages = [];

    // Add conversation history if provided
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      context.conversationHistory.forEach(msg => {
        messages.push({
          role: msg.sender === 'contact' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }

    // Add current prompt as user message
    messages.push({
      role: 'user',
      content: prompt
    });

    console.log('📤 Calling Claude API...');
    console.log('   Model: claude-3-5-sonnet-20241022');
    console.log('   Temperature:', temperature);
    console.log('   Message count:', messages.length);

    // Call Claude API
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      temperature: temperature,
      messages: messages
    });

    console.log('✅ Claude API response received');
    console.log('   Tokens used:', response.usage.input_tokens + response.usage.output_tokens);

    const aiResponse = response.content[0].text;

    // Ensure response is not too long for SMS (160 chars preferred)
    if (aiResponse.length > 320) {
      console.log('⚠️  Response is long, truncating...');
      return aiResponse.substring(0, 300) + '...';
    }

    return aiResponse;

  } catch (error) {
    console.error('❌ Claude API Error:', error.message);

    if (error.status === 401) {
      console.error('   Invalid API key');
    } else if (error.status === 429) {
      console.error('   Rate limit exceeded');
    } else if (error.status === 500) {
      console.error('   Claude API server error');
    }

    // Return fallback response
    return getFallbackResponse(context);
  }
}

/**
 * Get fallback response when AI fails
 */
function getFallbackResponse(context = {}) {
  const fallbacks = [
    "Thank you for your message! I'm here to help. Could you please tell me more about what you're looking for?",
    "I appreciate you reaching out. Let me help you with that. What specific information do you need?",
    "Thanks for contacting us! I'd be happy to assist. Can you provide more details about your needs?",
    "Hello! I'm here to help you. What can I assist you with today?",
    "Thank you for your interest! I'm experiencing a brief technical issue, but I'm here to help. Could you share more about what you need?"
  ];

  // Return a random fallback or the last one for consistency
  return fallbacks[Math.min(context.conversationId ? 4 : 0, fallbacks.length - 1)];
}

// Export both the class and the function
module.exports = ClaudeAIService;
module.exports.processMessage = processMessage;
module.exports.ClaudeAIService = ClaudeAIService;