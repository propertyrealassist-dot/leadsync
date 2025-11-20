const Anthropic = require('@anthropic-ai/sdk');
const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class AppointmentAI {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  /**
   * Get available time slots for a given date
   */
  getAvailableSlots(userId, date) {
    const stmt = db.prepare(`
      SELECT start_time, end_time FROM appointments
      WHERE user_id = ?
        AND DATE(start_time) = DATE(?)
        AND status NOT IN ('cancelled', 'completed')
      ORDER BY start_time ASC
    `);

    const bookedSlots = stmt.all(userId, date);

    // Get calendar settings
    const settingsStmt = db.prepare('SELECT * FROM calendar_settings WHERE user_id = ?');
    const settings = settingsStmt.get(userId) || {
      business_hours_start: '09:00',
      business_hours_end: '17:00'
    };

    const [startHour, startMin] = settings.business_hours_start.split(':').map(Number);
    const [endHour, endMin] = settings.business_hours_end.split(':').map(Number);

    const dayStart = new Date(date);
    dayStart.setHours(startHour, startMin, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(endHour, endMin, 0, 0);

    const slotDuration = 60; // 60 minutes per slot
    const availableSlots = [];

    let currentTime = new Date(dayStart);

    while (currentTime < dayEnd) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60 * 1000);

      // Check if slot is available
      const isBooked = bookedSlots.some(booked => {
        const bookedStart = new Date(booked.start_time);
        const bookedEnd = new Date(booked.end_time);
        return (
          (currentTime >= bookedStart && currentTime < bookedEnd) ||
          (slotEnd > bookedStart && slotEnd <= bookedEnd) ||
          (currentTime <= bookedStart && slotEnd >= bookedEnd)
        );
      });

      if (!isBooked) {
        availableSlots.push({
          startTime: currentTime.toISOString(),
          endTime: slotEnd.toISOString(),
          displayTime: currentTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        });
      }

      currentTime = slotEnd;
    }

    return availableSlots;
  }

  /**
   * Extract appointment details from conversation
   */
  async extractAppointmentInfo(conversationHistory) {
    const systemPrompt = `You are an appointment scheduling assistant. Extract appointment details from the conversation.

Extract the following information if available:
- Contact name
- Contact phone
- Contact email
- Preferred date (convert relative dates like "tomorrow", "next Monday" to actual dates)
- Preferred time (if specified)
- Appointment type/reason
- Any special notes or requirements

Today's date is: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Return ONLY a JSON object with these fields (use null for missing information):
{
  "contactName": "...",
  "contactPhone": "...",
  "contactEmail": "...",
  "preferredDate": "YYYY-MM-DD",
  "preferredTime": "HH:MM",
  "appointmentType": "...",
  "notes": "...",
  "readyToBook": true/false
}

readyToBook should be true only if you have at least: name, phone OR email, and a specific date.`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Extract appointment information from this conversation:\n\n${JSON.stringify(conversationHistory, null, 2)}`
          }
        ]
      });

      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return null;
    } catch (error) {
      console.error('Error extracting appointment info:', error);
      return null;
    }
  }

  /**
   * Generate AI response for appointment conversation
   */
  async generateResponse(conversationId, userMessage, context = {}) {
    try {
      // Get conversation history
      const stmt = db.prepare(`
        SELECT sender, content, timestamp FROM messages
        WHERE conversation_id = ?
        ORDER BY timestamp ASC
      `);
      const history = stmt.all(conversationId);

      // Add current message to history
      history.push({
        sender: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      });

      // Extract appointment info
      const appointmentInfo = await this.extractAppointmentInfo(history);

      // Get available slots if date is specified
      let availableSlots = [];
      if (appointmentInfo?.preferredDate && context.userId) {
        availableSlots = this.getAvailableSlots(
          context.userId,
          appointmentInfo.preferredDate
        );
      }

      // Build context for AI
      const systemPrompt = `You are LeadSync, a friendly and professional appointment scheduling assistant.

Your goal is to:
1. Collect necessary information: name, phone/email, preferred date and time
2. Offer available time slots when a date is mentioned
3. Confirm appointment details before booking
4. Be conversational, warm, and helpful

Business Information:
${context.businessName ? `Business: ${context.businessName}` : ''}
${context.businessDescription ? `Description: ${context.businessDescription}` : ''}
${context.appointmentTypes ? `Services: ${context.appointmentTypes.join(', ')}` : ''}

Current extracted information:
${JSON.stringify(appointmentInfo, null, 2)}

${availableSlots.length > 0 ? `Available time slots for ${appointmentInfo.preferredDate}:\n${availableSlots.map(s => s.displayTime).join(', ')}` : ''}

Guidelines:
- Keep responses concise (2-3 sentences max)
- Ask for one piece of information at a time
- When date is mentioned, offer specific time slots from the available slots
- Confirm all details before indicating readiness to book
- Be natural and conversational, not robotic

If the user seems ready to book (has provided name, contact, date, time), end your response with: [READY_TO_BOOK]`;

      const conversationText = history
        .map(m => `${m.sender === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: conversationText
          }
        ]
      });

      const aiResponse = response.content[0].text;
      const readyToBook = aiResponse.includes('[READY_TO_BOOK]');

      return {
        message: aiResponse.replace('[READY_TO_BOOK]', '').trim(),
        appointmentInfo,
        availableSlots,
        readyToBook: readyToBook && appointmentInfo?.readyToBook
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        message: "I apologize, but I'm having trouble processing that right now. Could you please repeat that?",
        appointmentInfo: null,
        availableSlots: [],
        readyToBook: false
      };
    }
  }

  /**
   * Book appointment from conversation
   */
  async bookAppointment(conversationId, appointmentInfo, userId) {
    try {
      const appointmentId = uuidv4();

      // Parse date and time
      const startDateTime = new Date(`${appointmentInfo.preferredDate}T${appointmentInfo.preferredTime || '09:00'}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour default

      // Insert appointment
      const stmt = db.prepare(`
        INSERT INTO appointments (
          id, user_id, contact_name, contact_email, contact_phone,
          title, description, start_time, end_time, duration_minutes,
          status, appointment_type, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        appointmentId,
        userId,
        appointmentInfo.contactName,
        appointmentInfo.contactEmail,
        appointmentInfo.contactPhone,
        appointmentInfo.appointmentType || 'Appointment',
        appointmentInfo.notes,
        startDateTime.toISOString(),
        endDateTime.toISOString(),
        60,
        'scheduled',
        appointmentInfo.appointmentType,
        appointmentInfo.notes
      );

      // Update conversation with appointment
      const convStmt = db.prepare(`
        UPDATE conversations
        SET status = 'completed',
            contact_name = ?,
            contact_phone = ?
        WHERE id = ?
      `);

      convStmt.run(
        appointmentInfo.contactName,
        appointmentInfo.contactPhone,
        conversationId
      );

      return {
        success: true,
        appointmentId,
        appointment: {
          id: appointmentId,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          contactName: appointmentInfo.contactName
        }
      };
    } catch (error) {
      console.error('Error booking appointment:', error);
      return {
        success: false,
        error: 'Failed to book appointment'
      };
    }
  }
}

module.exports = new AppointmentAI();
