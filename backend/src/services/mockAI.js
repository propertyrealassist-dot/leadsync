// Mock AI responses for testing without API keys
class MockAIService {
  constructor(template) {
    this.template = template;
    this.conversationState = {
      hasGreeted: false,
      hasAskedName: false,
      hasQualified: false,
      questionIndex: 0
    };
  }

  async generateResponse(userMessage, conversationHistory) {
    // Simulate AI thinking delay
    await this.delay(1000);

    const msg = userMessage.toLowerCase();

    // Name confirmation flow
    if (!this.conversationState.hasAskedName) {
      this.conversationState.hasAskedName = true;
      return "Great! Thanks for confirming. I'm here to help you get started. What are you most interested in today?";
    }

    // Interest/qualification flow
    if (!this.conversationState.hasQualified && this.template.qualificationQuestions) {
      const currentQ = this.template.qualificationQuestions[this.conversationState.questionIndex];
      
      if (currentQ) {
        this.conversationState.questionIndex++;
        
        // Parse the JSON body if it exists
        let questionText = currentQ.Body;
        if (typeof currentQ.Body === 'string' && currentQ.Body.startsWith('{')) {
          try {
            const parsed = JSON.parse(currentQ.Body);
            questionText = parsed.text;
          } catch (e) {
            // Use as is if parse fails
          }
        }
        
        return questionText;
      } else {
        this.conversationState.hasQualified = true;
        return "Perfect! Based on what you've told me, I think we can definitely help. Would you like to schedule a quick call to discuss next steps?";
      }
    }

    // Handle common responses
    if (msg.includes('yes') || msg.includes('sure') || msg.includes('ok')) {
      return "Awesome! Let me get you booked in. What day works best for you this week?";
    }

    if (msg.includes('price') || msg.includes('cost') || msg.includes('how much')) {
      return "Great question! Our pricing varies based on what you need. Can I ask what specific services you're interested in?";
    }

    if (msg.includes('no') || msg.includes('not interested')) {
      return "No worries at all! If you change your mind or have questions later, feel free to reach out anytime.";
    }

    // Default friendly response
    return "Thanks for sharing that! To make sure I point you in the right direction, can you tell me a bit more about what you're looking for?";
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Detect if booking should be triggered
  shouldTriggerBooking(message) {
    const bookingKeywords = ['book', 'schedule', 'appointment', 'reserve', 'available', 'calendar'];
    return bookingKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  // Detect if lead is lost
  shouldTriggerLost(message) {
    const lostKeywords = ['not interested', 'stop', 'unsubscribe', 'no thanks', 'leave me alone'];
    return lostKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }
}

module.exports = MockAIService;