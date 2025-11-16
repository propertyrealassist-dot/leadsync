const Anthropic = require('@anthropic-ai/sdk');

class AIService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  buildComprehensiveSystemPrompt(strategy, userName) {
    let systemPrompt = `# AI AGENT CONFIGURATION: ${strategy.name}

You are an AI assistant configured with the following complete setup:

`;

    // ============================================
    // STEP 1: INSTRUCTIONS (Basic Info)
    // ============================================
    systemPrompt += `## BASIC INFORMATION
- **Agent Name**: ${strategy.name}
- **Tag**: ${strategy.tag || 'general'}
- **Description**: ${strategy.description || 'No description provided'}
- **User Name**: ${userName}

`;

    // ============================================
    // STEP 2: CONVERSATION FLOW
    // ============================================
    let conversationSteps = this.parseJSON(strategy.conversationSteps);

    systemPrompt += `## CONVERSATION FLOW (Step 2)

`;

    // Initial Message
    if (conversationSteps?.initialMessage) {
      systemPrompt += `### Initial Message Template:
"${conversationSteps.initialMessage}"

When starting a conversation, use this as your opening message (personalize with user's name if appropriate).

`;
    }

    // Qualification Questions
    if (conversationSteps?.qualificationQuestions && conversationSteps.qualificationQuestions.length > 0) {
      systemPrompt += `### Qualification Questions:
You MUST ask these questions during the conversation (naturally, not all at once):

`;
      conversationSteps.qualificationQuestions.forEach((q, index) => {
        systemPrompt += `**Q${index + 1}**: ${q.question || q.text || q}
`;
        if (q.conditions && q.conditions.length > 0) {
          systemPrompt += `   Conditions: ${JSON.stringify(q.conditions)}
`;
        }
      });
      systemPrompt += `
IMPORTANT: Work these questions naturally into the conversation. Don't ask them all at once.

`;
    }

    // Follow-ups
    if (conversationSteps?.followUps && conversationSteps.followUps.length > 0) {
      systemPrompt += `### Follow-up Messages:
`;
      conversationSteps.followUps.forEach((f, index) => {
        systemPrompt += `**F${index + 1}**: ${f.message || f.text || f}
`;
        if (f.delay) {
          systemPrompt += `   Timing: After ${f.delay} seconds
`;
        }
        if (f.trigger) {
          systemPrompt += `   Trigger: ${f.trigger}
`;
        }
      });
      systemPrompt += '\n';
    }

    // ============================================
    // STEP 3: BOOKING WORKFLOW
    // ============================================
    let bookingWorkflow = this.parseJSON(strategy.bookingWorkflow);

    systemPrompt += `## BOOKING WORKFLOW (Step 3)

`;

    if (bookingWorkflow?.enabled) {
      systemPrompt += `**Booking is ENABLED** - Guide users toward scheduling appointments.

`;

      if (bookingWorkflow.calendarIntegration) {
        systemPrompt += `### Calendar Integration:
- Type: ${bookingWorkflow.calendarIntegration.type || 'Not specified'}
- Calendar ID: ${bookingWorkflow.calendarIntegration.calendarId || 'Not specified'}

`;
      }

      if (bookingWorkflow.requiredFields && bookingWorkflow.requiredFields.length > 0) {
        systemPrompt += `### Required Information to Book:
Before confirming an appointment, you MUST collect:
`;
        bookingWorkflow.requiredFields.forEach(field => {
          systemPrompt += `- ${field}
`;
        });
        systemPrompt += '\n';
      }

      if (bookingWorkflow.confirmationMessage) {
        systemPrompt += `### Booking Confirmation Message:
"${bookingWorkflow.confirmationMessage}"

Use this message when confirming appointments.

`;
      }

      if (bookingWorkflow.reminderSettings) {
        systemPrompt += `### Reminder Settings:
${JSON.stringify(bookingWorkflow.reminderSettings, null, 2)}

`;
      }
    } else {
      systemPrompt += `**Booking is DISABLED** - Do not attempt to schedule appointments.

`;
    }

    // ============================================
    // STEP 3 (continued): INTENT RECOGNITION
    // ============================================
    let intentRecognition = this.parseJSON(strategy.intentRecognition);

    if (intentRecognition && Object.keys(intentRecognition).length > 0) {
      systemPrompt += `## INTENT RECOGNITION

Recognize user intents and respond accordingly:

`;

      if (intentRecognition.keywords) {
        systemPrompt += `### Keywords to Watch For:
`;
        Object.entries(intentRecognition.keywords).forEach(([intent, keywords]) => {
          systemPrompt += `**${intent}**: ${Array.isArray(keywords) ? keywords.join(', ') : keywords}
`;
        });
        systemPrompt += '\n';
      }

      if (intentRecognition.triggers) {
        systemPrompt += `### Automated Triggers:
`;
        Object.entries(intentRecognition.triggers).forEach(([trigger, action]) => {
          systemPrompt += `- When: ${trigger}
  Action: ${action}
`;
        });
        systemPrompt += '\n';
      }
    }

    // ============================================
    // STEP 4: KNOWLEDGE BASE
    // ============================================
    let knowledgeBase = this.parseJSON(strategy.knowledgeBase);

    systemPrompt += `## KNOWLEDGE BASE (Step 4)

`;

    if (knowledgeBase?.documents && knowledgeBase.documents.length > 0) {
      systemPrompt += `### Available Knowledge Documents:
`;
      knowledgeBase.documents.forEach((doc, index) => {
        systemPrompt += `
**Document ${index + 1}: ${doc.title || doc.name || 'Untitled'}**
${doc.content || doc.text || 'No content'}

`;
      });
    }

    if (knowledgeBase?.faqs && knowledgeBase.faqs.length > 0) {
      systemPrompt += `### Frequently Asked Questions:
`;
      knowledgeBase.faqs.forEach((faq, index) => {
        systemPrompt += `
**Q${index + 1}**: ${faq.question}
**A**: ${faq.answer}

`;
      });
    }

    if (knowledgeBase?.businessInfo) {
      systemPrompt += `### Business Information:
${JSON.stringify(knowledgeBase.businessInfo, null, 2)}

`;
    }

    if (!knowledgeBase || ((!knowledgeBase.documents || knowledgeBase.documents.length === 0) &&
                           (!knowledgeBase.faqs || knowledgeBase.faqs.length === 0))) {
      systemPrompt += `No specific knowledge base configured. Use general knowledge to assist users.

`;
    }

    // ============================================
    // STEP 5: CUSTOM TASKS & RESPONSE STYLE
    // ============================================
    let responseStyle = this.parseJSON(strategy.responseStyle);

    systemPrompt += `## RESPONSE STYLE & BEHAVIOR (Step 5)

`;

    if (responseStyle) {
      if (responseStyle.tone) {
        systemPrompt += `### Tone:
${responseStyle.tone}

`;
      }

      if (responseStyle.personality) {
        systemPrompt += `### Personality:
${responseStyle.personality}

`;
      }

      if (responseStyle.messageLength) {
        systemPrompt += `### Message Length Preference:
${responseStyle.messageLength}

`;
      }

      if (responseStyle.formality) {
        systemPrompt += `### Formality Level:
${responseStyle.formality}

`;
      }

      if (responseStyle.language) {
        systemPrompt += `### Language:
${responseStyle.language}

`;
      }

      if (responseStyle.emojis !== undefined) {
        systemPrompt += `### Emoji Usage:
${responseStyle.emojis ? 'Use emojis occasionally to add warmth' : 'Do not use emojis'}

`;
      }
    }

    // Custom Tasks
    let customTasks = this.parseJSON(strategy.customTasks);

    if (customTasks && customTasks.length > 0) {
      systemPrompt += `### Custom Tasks:
`;
      customTasks.forEach((task, index) => {
        systemPrompt += `
**Task ${index + 1}: ${task.name || task.title || 'Unnamed Task'}**
${task.description || task.instructions || ''}
${task.trigger ? `Trigger: ${task.trigger}` : ''}
${task.action ? `Action: ${task.action}` : ''}

`;
      });
    }

    // Availability Settings
    let availabilitySettings = this.parseJSON(strategy.availabilitySettings);

    if (availabilitySettings) {
      systemPrompt += `## AVAILABILITY SETTINGS

`;
      if (availabilitySettings.timezone) {
        systemPrompt += `Timezone: ${availabilitySettings.timezone}
`;
      }
      if (availabilitySettings.businessHours) {
        systemPrompt += `Business Hours:
${JSON.stringify(availabilitySettings.businessHours, null, 2)}

`;
      }
      if (availabilitySettings.holidays) {
        systemPrompt += `Holidays/Closed Dates:
${JSON.stringify(availabilitySettings.holidays, null, 2)}

`;
      }
    }

    // ============================================
    // FINAL INSTRUCTIONS
    // ============================================
    systemPrompt += `
## CORE BEHAVIORAL RULES

1. **Stay in Character**: Follow ALL the configurations above precisely
2. **Natural Conversation**: Don't sound robotic or list-like
3. **Be Contextual**: Remember what the user has said throughout the conversation
4. **Follow the Flow**: Use the qualification questions and follow-ups as designed
5. **Use Knowledge**: Reference the knowledge base when answering questions
6. **Guide to Goal**: If booking is enabled, naturally guide toward scheduling
7. **Be Helpful**: Always prioritize helping the user
8. **Message Length**: Keep responses concise (2-4 sentences typically) unless more detail is needed
9. **Personality**: Maintain the personality and tone specified throughout

Remember: You are representing ${strategy.name}. Everything you say should align with this agent's complete configuration.
`;

    return systemPrompt;
  }

  parseJSON(data) {
    if (!data) return null;
    if (typeof data === 'object') return data;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        return null;
      }
    }
    return null;
  }

  async generateResponse(messages, systemPrompt) {
    try {
      const requestOptions = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048, // Increased for more detailed responses
        messages: messages,
        system: systemPrompt
      };

      console.log('=== SENDING TO CLAUDE API ===');
      console.log('System Prompt Length:', systemPrompt.length, 'characters');
      console.log('Message Count:', messages.length);

      const response = await this.client.messages.create(requestOptions);

      console.log('=== CLAUDE API RESPONSE RECEIVED ===');
      console.log('Response Length:', response.content[0].text.length, 'characters');

      return response.content[0].text;
    } catch (error) {
      console.error('=== CLAUDE API ERROR ===');
      console.error('Error:', error.message);
      if (error.status) {
        console.error('Status:', error.status);
      }
      if (error.error) {
        console.error('Details:', JSON.stringify(error.error, null, 2));
      }
      throw error;
    }
  }
}

module.exports = new AIService();
