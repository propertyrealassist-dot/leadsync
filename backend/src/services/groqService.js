const Groq = require('groq-sdk');

class GroqService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }

  /**
   * Build comprehensive system prompt from strategy template
   */
  buildComprehensiveSystemPrompt(strategy, userName = 'User') {
    // Extract brief sections if they exist
    const brief = strategy.brief || '';

    // ULTRA-STRICT STRUCTURED CONVERSATION FLOW
    let systemPrompt = `You are an AI sales assistant following a STRUCTURED conversation flow.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 YOUR MISSION: FOLLOW THE BRIEF AND CONVERSATION STRUCTURE EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# STEP 1: WHO YOU ARE & YOUR BRIEF

${brief}

${strategy.company_information ? `\n# STEP 4: KNOWLEDGE BASE (Use for answering questions)\n\n${strategy.company_information}\n` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 2: CONVERSATION STRUCTURE - FOLLOW EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## PHASE 1: QUALIFICATION QUESTIONS
You MUST ask these questions ONE AT A TIME, in order:
`;

    // Add qualification questions from database
    if (strategy.qualificationQuestions && strategy.qualificationQuestions.length > 0) {
      strategy.qualificationQuestions.forEach((q, idx) => {
        systemPrompt += `\nQuestion ${idx + 1}: "${q.text}"`;
      });

      systemPrompt += `\n\n⚠️ CRITICAL RULES FOR QUALIFICATION:
- Ask ONE question at a time
- Wait for their answer before asking the next question
- Acknowledge their answer briefly (1 sentence max) before next question
- Follow conversation rules from your brief
- Track which questions you've asked
- Once ALL ${strategy.qualificationQuestions.length} questions are answered, move to PHASE 2

`;
    }

    systemPrompt += `## PHASE 2: BOOKING (Only after ALL qualification questions complete)

${strategy.settings ? (() => {
  try {
    const settings = typeof strategy.settings === 'string' ? JSON.parse(strategy.settings) : strategy.settings;
    return settings.cta || 'Let me get you scheduled. What time works best for you?';
  } catch (e) {
    return 'Let me get you scheduled. What time works best for you?';
  }
})() : 'Let me get you scheduled. What time works best for you?'}

⚠️ YOU MUST COMPLETE ALL QUALIFICATION QUESTIONS BEFORE OFFERING TO BOOK!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 4: KNOWLEDGE BASE & FAQs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If they ask questions during qualification, use this knowledge:
`;

    // Add FAQs from database
    if (strategy.faqs && strategy.faqs.length > 0) {
      strategy.faqs.forEach((faq, idx) => {
        systemPrompt += `\n\nQ${idx + 1}: ${faq.question}\nA${idx + 1}: ${faq.answer}`;
      });
    }

    systemPrompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CONVERSATION FLOW TRACKER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Lead's Name: ${userName}
Current Phase: Check message history to see where you are
Questions Asked: Track which qualification questions you've asked
Questions Remaining: Don't move to booking until ALL questions answered

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ CRITICAL REMINDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. FOLLOW YOUR BRIEF - Use the conversation rules, objection handling, and psychological triggers from your brief
2. ASK QUESTIONS IN ORDER - Don't skip, don't rush, don't ask multiple at once
3. USE KNOWLEDGE BASE - When they ask questions, reference Step 4 knowledge
4. COMPLETE QUALIFICATION BEFORE BOOKING - All questions must be answered first
5. FOLLOW CONVERSATION RULES - Short messages, acknowledge their answers, match their energy

You are a professional who follows structure while being warm and human.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    console.log('📋 Built Groq system prompt:', systemPrompt.substring(0, 200) + '...');

    return systemPrompt;
  }

  /**
   * Generate AI response using Groq API
   */
  async generateResponse(messages, systemPrompt, options = {}) {
    try {
      const {
        model = 'llama-3.3-70b-versatile', // Latest Groq model
        maxTokens = 2048,
        temperature = 0.7,
        initialMessage = null,  // Pass the exact initial message from database
        userName = 'User'       // Pass the user's name for variable substitution
      } = options;

      console.log('🚀 Calling Groq API...');
      console.log('Messages count:', messages.length);
      console.log('Model:', model);

      // Check if this is an initial greeting request
      const isInitialGreeting = messages.length === 1 &&
                                 messages[0].role === 'user' &&
                                 messages[0].content === '__INIT__';

      if (isInitialGreeting && initialMessage) {
        console.log('🎯 Using exact initial message from database...');
        console.log('Initial message template:', initialMessage);

        // Replace template variables with actual values
        let formattedMessage = initialMessage
          .replace(/\{\{contact\.first_name\}\}/g, userName)
          .replace(/\{\{contact\.name\}\}/g, userName)
          .replace(/\{\{user\.name\}\}/g, userName);

        console.log('✅ Formatted initial message:', formattedMessage);

        // Return the exact initial message without calling AI
        return formattedMessage;
      }

      let chatMessages;
      if (isInitialGreeting) {
        console.log('🎯 Generating initial greeting...');
        // For initial greeting, just ask the AI to start the conversation
        chatMessages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Please start the conversation with the initial greeting.' }
        ];
      } else {
        chatMessages = [
          { role: 'system', content: systemPrompt },
          ...messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ];
      }

      const completion = await this.groq.chat.completions.create({
        messages: chatMessages,
        model: model,
        temperature: temperature,
        max_tokens: maxTokens
      });

      console.log('✅ Groq API response received');

      return completion.choices[0].message.content;

    } catch (error) {
      console.error('❌ Groq API error:', error);

      if (error.status === 401) {
        throw new Error('Invalid Groq API key. Please check your GROQ_API_KEY in .env');
      }

      if (error.status === 429) {
        throw new Error('Groq rate limit exceeded. Please try again later.');
      }

      if (error.status === 503) {
        throw new Error('Groq API is temporarily unavailable. Please try again.');
      }

      throw error;
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
        maxTokens: 500,
        model: 'llama-3.3-70b-versatile'
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('Lead extraction error:', error);
      return null;
    }
  }
}

module.exports = new GroqService();
