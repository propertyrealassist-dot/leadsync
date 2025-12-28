const Anthropic = require('@anthropic-ai/sdk');
const ghlService = require('./ghlService');
const moment = require('moment-timezone');

/**
 * Enhanced AI service with calendar viewing and booking capabilities
 * Uses Claude's tool use (function calling) feature
 */

class CalendarAI {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Process message with calendar integration
   * The AI can view calendar availability and book appointments
   */
  async processMessageWithCalendar(prompt, context = {}) {
    try {
      const { userId, contactId, contactName, contactPhone, contactEmail, temperature = 0.7 } = context;

      console.log('🤖 Processing message with Calendar AI...');
      console.log('   User ID:', userId);
      console.log('   Contact ID:', contactId);
      console.log('   Temperature:', temperature);

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

      // Define tools for calendar operations
      const tools = [
        {
          name: 'view_calendar_availability',
          description: 'View available time slots in the calendar for booking appointments. Use this when a lead asks about availability, what times are free, or when they can meet. This will show you the available slots for the next 7 days.',
          input_schema: {
            type: 'object',
            properties: {
              date_range_days: {
                type: 'number',
                description: 'Number of days ahead to check availability (default 7, max 14)',
                default: 7
              }
            }
          }
        },
        {
          name: 'book_appointment',
          description: 'Book an appointment in the calendar. Use this ONLY when the lead has explicitly agreed to a specific date and time. The lead must have confirmed they want to book.',
          input_schema: {
            type: 'object',
            properties: {
              start_time: {
                type: 'string',
                description: 'Appointment start time in ISO 8601 format (e.g., "2024-01-15T10:00:00-05:00")'
              },
              duration_minutes: {
                type: 'number',
                description: 'Appointment duration in minutes (default 30)',
                default: 30
              },
              title: {
                type: 'string',
                description: 'Appointment title (e.g., "Discovery Call", "Consultation")',
                default: 'Consultation Call'
              },
              notes: {
                type: 'string',
                description: 'Optional notes or context about the appointment',
                default: ''
              }
            },
            required: ['start_time']
          }
        }
      ];

      // Call Claude API with tools
      let response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        temperature: temperature,
        tools: tools,
        messages: messages
      });

      console.log('✅ Claude response received');
      console.log('   Stop reason:', response.stop_reason);

      // Handle tool use
      while (response.stop_reason === 'tool_use') {
        console.log('🔧 Claude wants to use a tool...');

        const toolUse = response.content.find(block => block.type === 'tool_use');

        if (!toolUse) {
          console.log('⚠️  No tool use block found, breaking loop');
          break;
        }

        console.log('   Tool:', toolUse.name);
        console.log('   Input:', JSON.stringify(toolUse.input, null, 2));

        let toolResult;

        // Execute the requested tool
        if (toolUse.name === 'view_calendar_availability') {
          toolResult = await this.viewCalendarAvailability(userId, toolUse.input);
        } else if (toolUse.name === 'book_appointment') {
          toolResult = await this.bookAppointment(userId, contactId, contactName, contactPhone, contactEmail, toolUse.input);
        } else {
          toolResult = { error: 'Unknown tool requested' };
        }

        console.log('   Tool result:', JSON.stringify(toolResult).substring(0, 200) + '...');

        // Add assistant's tool use and tool result to messages
        messages.push({
          role: 'assistant',
          content: response.content
        });

        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(toolResult)
            }
          ]
        });

        // Continue conversation with tool result
        response = await this.client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2048,
          temperature: temperature,
          tools: tools,
          messages: messages
        });

        console.log('✅ Claude follow-up response received');
        console.log('   Stop reason:', response.stop_reason);
      }

      // Extract final text response
      const textBlock = response.content.find(block => block.type === 'text');
      const aiResponse = textBlock ? textBlock.text : 'I apologize, but I encountered an issue. Could you please try again?';

      console.log('📤 Final AI response:', aiResponse.substring(0, 100) + '...');

      return aiResponse;

    } catch (error) {
      console.error('❌ Calendar AI Error:', error.message);
      console.error('   Error details:', error);

      return "I apologize, but I'm having trouble accessing the calendar right now. Let me know how else I can help!";
    }
  }

  /**
   * View calendar availability
   * Returns available time slots for booking
   */
  async viewCalendarAvailability(userId, input) {
    try {
      console.log('📅 Viewing calendar availability for user:', userId);

      const daysAhead = Math.min(input.date_range_days || 7, 14);

      // Get user's GHL calendars
      const calendarsResponse = await ghlService.getCalendars(userId);

      if (!calendarsResponse || !calendarsResponse.calendars || calendarsResponse.calendars.length === 0) {
        return {
          success: false,
          message: 'No calendars found for this user. Please ensure GHL is connected.'
        };
      }

      // Use first calendar (or you could make this configurable)
      const calendar = calendarsResponse.calendars[0];
      console.log('   Using calendar:', calendar.name);

      // Calculate date range
      const startTime = moment().format();
      const endTime = moment().add(daysAhead, 'days').format();

      console.log('   Date range:', startTime, 'to', endTime);

      // Get calendar events
      const eventsResponse = await ghlService.getCalendarEvents(userId, calendar.id, startTime, endTime);

      const bookedEvents = eventsResponse.events || [];
      console.log('   Found', bookedEvents.length, 'booked events');

      // Generate available slots (9 AM - 5 PM, Monday-Friday, 30-min slots)
      const availableSlots = this.generateAvailableSlots(bookedEvents, daysAhead);

      console.log('   Generated', availableSlots.length, 'available slots');

      return {
        success: true,
        calendar_name: calendar.name,
        calendar_id: calendar.id,
        date_range: {
          start: startTime,
          end: endTime,
          days: daysAhead
        },
        booked_events: bookedEvents.length,
        available_slots: availableSlots.slice(0, 20), // Return first 20 slots to avoid overwhelming the AI
        total_available: availableSlots.length
      };

    } catch (error) {
      console.error('❌ Error viewing calendar:', error);
      return {
        success: false,
        error: error.message,
        message: 'Unable to access calendar. Please ensure GHL integration is set up correctly.'
      };
    }
  }

  /**
   * Book an appointment
   */
  async bookAppointment(userId, contactId, contactName, contactPhone, contactEmail, input) {
    try {
      console.log('📅 Booking appointment for user:', userId);
      console.log('   Contact:', contactName);
      console.log('   Start time:', input.start_time);
      console.log('   Duration:', input.duration_minutes || 30, 'minutes');

      const startTime = moment(input.start_time);
      const endTime = moment(input.start_time).add(input.duration_minutes || 30, 'minutes');

      // Prepare appointment data
      const appointmentData = {
        calendarId: null, // Will be fetched
        startTime: startTime.format(),
        endTime: endTime.format(),
        title: input.title || 'Consultation Call',
        appointmentStatus: 'confirmed',
        assignedUserId: null, // GHL will assign
        address: '',
        contactId: contactId,
        ignoreDateRange: false,
        toNotify: false
      };

      // Get calendar ID
      const calendarsResponse = await ghlService.getCalendars(userId);
      if (!calendarsResponse || !calendarsResponse.calendars || calendarsResponse.calendars.length === 0) {
        return {
          success: false,
          message: 'No calendar found to book the appointment.'
        };
      }

      appointmentData.calendarId = calendarsResponse.calendars[0].id;

      console.log('   Using calendar ID:', appointmentData.calendarId);

      // Create appointment in GHL
      const result = await ghlService.createAppointment(userId, appointmentData);

      console.log('✅ Appointment created successfully');
      console.log('   Event ID:', result.id);

      return {
        success: true,
        appointment_id: result.id,
        contact_name: contactName,
        start_time: startTime.format('LLLL'),
        end_time: endTime.format('LT'),
        duration_minutes: input.duration_minutes || 30,
        title: input.title || 'Consultation Call',
        calendar_name: calendarsResponse.calendars[0].name,
        message: `Appointment booked successfully for ${contactName} on ${startTime.format('MMMM Do, YYYY')} at ${startTime.format('h:mm A')}`
      };

    } catch (error) {
      console.error('❌ Error booking appointment:', error);
      return {
        success: false,
        error: error.message,
        message: 'Unable to book appointment. The time slot might be unavailable.'
      };
    }
  }

  /**
   * Generate available time slots
   * Business hours: 9 AM - 5 PM, Monday-Friday, 30-minute slots
   */
  generateAvailableSlots(bookedEvents, daysAhead) {
    const slots = [];
    const slotDuration = 30; // minutes
    const businessStart = 9; // 9 AM
    const businessEnd = 17; // 5 PM

    // Generate slots for each day
    for (let day = 0; day < daysAhead; day++) {
      const currentDate = moment().add(day, 'days');

      // Skip weekends
      if (currentDate.day() === 0 || currentDate.day() === 6) {
        continue;
      }

      // Generate slots for this day
      for (let hour = businessStart; hour < businessEnd; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const slotStart = currentDate.clone()
            .hour(hour)
            .minute(minute)
            .second(0);

          const slotEnd = slotStart.clone().add(slotDuration, 'minutes');

          // Skip past slots
          if (slotStart.isBefore(moment())) {
            continue;
          }

          // Check if slot conflicts with any booked event
          const isBooked = bookedEvents.some(event => {
            const eventStart = moment(event.startTime);
            const eventEnd = moment(event.endTime);

            // Check for overlap
            return (
              slotStart.isBefore(eventEnd) && slotEnd.isAfter(eventStart)
            );
          });

          if (!isBooked) {
            slots.push({
              start: slotStart.format(),
              end: slotEnd.format(),
              display: slotStart.format('dddd, MMMM D [at] h:mm A'),
              iso: slotStart.toISOString()
            });
          }
        }
      }
    }

    return slots;
  }
}

module.exports = new CalendarAI();
