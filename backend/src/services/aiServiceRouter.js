const anthropicService = require('./aiService');
const groqService = require('./groqService');

class AIServiceRouter {
  /**
   * Generate mock response for testing
   */
  generateMockResponse(messages) {
    const lastMessage = messages[messages.length - 1]?.content || 'Hello';
    return `Thank you for reaching out! I received your message: "${lastMessage}".

This is a mock AI response for testing purposes. In production mode, I would provide a detailed, personalized response based on the AI strategy configuration.

How can I assist you further?`;
  }

  /**
   * Main method to generate AI response with provider selection and fallback
   */
  async generateResponse(messages, systemPrompt, options = {}) {
    // Check for mock mode first
    if (process.env.USE_MOCK_AI === 'true') {
      console.log('🎭 Using Mock AI (USE_MOCK_AI=true)');
      return this.generateMockResponse(messages);
    }

    // Determine provider from environment (default to groq)
    const provider = (process.env.AI_PROVIDER || 'groq').toLowerCase();

    console.log(`🤖 AI Provider selected: ${provider.toUpperCase()}`);

    try {
      if (provider === 'groq') {
        console.log('🚀 Using Groq AI (LLaMA 3.1)...');
        return await groqService.generateResponse(messages, systemPrompt, options);
      } else if (provider === 'claude' || provider === 'anthropic') {
        console.log('🚀 Using Claude AI (Anthropic)...');
        return await anthropicService.generateResponse(messages, systemPrompt, options);
      } else {
        console.warn(`⚠️  Unknown provider "${provider}", falling back to Groq`);
        return await groqService.generateResponse(messages, systemPrompt, options);
      }
    } catch (error) {
      console.error(`❌ ${provider.toUpperCase()} failed:`, error.message);

      // Fallback strategy
      if (provider === 'claude' || provider === 'anthropic') {
        console.log('🔄 Claude failed, attempting fallback to Groq...');
        try {
          return await groqService.generateResponse(messages, systemPrompt, options);
        } catch (fallbackError) {
          console.error('❌ Groq fallback also failed:', fallbackError.message);
          console.log('🎭 Using mock AI as final fallback');
          return this.generateMockResponse(messages);
        }
      } else if (provider === 'groq') {
        console.log('🔄 Groq failed, checking if Claude is available...');
        if (process.env.ANTHROPIC_API_KEY) {
          try {
            console.log('🔄 Attempting fallback to Claude...');
            return await anthropicService.generateResponse(messages, systemPrompt, options);
          } catch (fallbackError) {
            console.error('❌ Claude fallback also failed:', fallbackError.message);
            console.log('🎭 Using mock AI as final fallback');
            return this.generateMockResponse(messages);
          }
        } else {
          console.log('🎭 No Claude API key available, using mock AI');
          return this.generateMockResponse(messages);
        }
      } else {
        // Unknown provider failed, use mock
        console.log('🎭 Using mock AI as fallback');
        return this.generateMockResponse(messages);
      }
    }
  }

  /**
   * Build system prompt - delegates to the appropriate service
   */
  buildComprehensiveSystemPrompt(strategy, userName = 'User') {
    const provider = (process.env.AI_PROVIDER || 'groq').toLowerCase();

    if (provider === 'groq') {
      return groqService.buildComprehensiveSystemPrompt(strategy, userName);
    } else if (provider === 'claude' || provider === 'anthropic') {
      return anthropicService.buildComprehensiveSystemPrompt(strategy, userName);
    } else {
      // Default to groq
      return groqService.buildComprehensiveSystemPrompt(strategy, userName);
    }
  }

  /**
   * Extract lead information from conversation
   */
  async extractLeadInfo(conversationHistory, strategy) {
    const provider = (process.env.AI_PROVIDER || 'groq').toLowerCase();

    try {
      if (provider === 'groq') {
        return await groqService.extractLeadInfo(conversationHistory, strategy);
      } else if (provider === 'claude' || provider === 'anthropic') {
        return await anthropicService.extractLeadInfo(conversationHistory, strategy);
      } else {
        return await groqService.extractLeadInfo(conversationHistory, strategy);
      }
    } catch (error) {
      console.error('Lead extraction failed:', error);
      return null;
    }
  }
}

module.exports = new AIServiceRouter();
