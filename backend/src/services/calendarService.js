const axios = require('axios');

class CalendarService {
  constructor() {
    this.ghlApiUrl = 'https://rest.gohighlevel.com/v1';
  }

  /**
   * Get available time slots from GHL calendar
   * Pattern inspired by Cal.com's availability engine
   */
  async getAvailableSlots(calendarId, startDate, endDate, timezone = 'UTC') {
    try {
      // Fetch calendar settings
      const calendar = await this.getCalendarSettings(calendarId);

      // Get existing appointments
      const appointments = await this.getExistingAppointments(calendarId, startDate, endDate);

      // Calculate available slots based on:
      // 1. Business hours
      // 2. Existing appointments
      // 3. Buffer times
      // 4. Time zone conversions

      const slots = this.calculateAvailableSlots({
        businessHours: calendar.businessHours,
        slotDuration: calendar.slotDuration || 30,
        bufferTime: calendar.bufferTime || 0,
        existingAppointments: appointments,
        startDate,
        endDate,
        timezone
      });

      return slots;

    } catch (error) {
      console.error('Error getting available slots:', error);
      throw error;
    }
  }

  /**
   * Calculate slots with buffer times and conflicts
   */
  calculateAvailableSlots(config) {
    const slots = [];
    const { businessHours, slotDuration, bufferTime, existingAppointments, startDate, endDate } = config;

    // Implementation of slot calculation algorithm
    // Similar to Cal.com but adapted for our needs

    let currentTime = new Date(startDate);
    const endTime = new Date(endDate);

    while (currentTime < endTime) {
      // Check if time is within business hours
      const dayOfWeek = currentTime.getDay();
      const hours = businessHours[dayOfWeek];

      if (hours && this.isWithinBusinessHours(currentTime, hours)) {
        // Check if slot conflicts with existing appointments
        const hasConflict = existingAppointments.some(apt =>
          this.hasTimeConflict(currentTime, slotDuration, apt)
        );

        if (!hasConflict) {
          slots.push({
            start: new Date(currentTime),
            end: new Date(currentTime.getTime() + slotDuration * 60000),
            available: true
          });
        }
      }

      // Move to next slot (including buffer time)
      currentTime = new Date(currentTime.getTime() + (slotDuration + bufferTime) * 60000);
    }

    return slots;
  }

  isWithinBusinessHours(time, hours) {
    const timeMinutes = time.getHours() * 60 + time.getMinutes();
    const startMinutes = this.parseTime(hours.start);
    const endMinutes = this.parseTime(hours.end);

    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  }

  parseTime(timeString) {
    // "09:00" -> 540 minutes
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  hasTimeConflict(proposedStart, duration, existingAppointment) {
    const proposedEnd = new Date(proposedStart.getTime() + duration * 60000);
    const aptStart = new Date(existingAppointment.startTime);
    const aptEnd = new Date(existingAppointment.endTime);

    return (proposedStart < aptEnd && proposedEnd > aptStart);
  }

  async getCalendarSettings(calendarId) {
    // Fetch from database or GHL
    // Return calendar configuration
    return {
      businessHours: {
        0: null, // Sunday closed
        1: { start: '09:00', end: '17:00' }, // Monday
        2: { start: '09:00', end: '17:00' },
        3: { start: '09:00', end: '17:00' },
        4: { start: '09:00', end: '17:00' },
        5: { start: '09:00', end: '17:00' },
        6: null // Saturday closed
      },
      slotDuration: 30,
      bufferTime: 0,
      timezone: 'America/New_York'
    };
  }

  async getExistingAppointments(calendarId, startDate, endDate) {
    // Fetch existing appointments from GHL or database
    // In production, this would query the database
    return [];
  }

  /**
   * Book appointment with conflict checking
   * Pattern from Cal.com's booking flow
   */
  async bookAppointment(data) {
    try {
      // 1. Validate slot is still available
      const isAvailable = await this.validateSlotAvailability(
        data.calendarId,
        data.startTime,
        data.duration
      );

      if (!isAvailable) {
        throw new Error('Time slot no longer available');
      }

      // 2. Create appointment in GHL
      const appointment = await this.createGHLAppointment(data);

      // 3. Send confirmation email/SMS
      await this.sendConfirmation(appointment);

      // 4. Update local database
      await this.saveAppointmentRecord(appointment);

      return appointment;

    } catch (error) {
      console.error('Error booking appointment:', error);
      throw error;
    }
  }

  async validateSlotAvailability(calendarId, startTime, duration) {
    const slots = await this.getAvailableSlots(
      calendarId,
      startTime,
      new Date(new Date(startTime).getTime() + duration * 60000)
    );

    return slots.some(slot =>
      new Date(slot.start).getTime() === new Date(startTime).getTime()
    );
  }

  async createGHLAppointment(data) {
    // Call GHL API to create appointment
    // Return created appointment
    return {
      id: 'apt_' + Date.now(),
      ...data,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };
  }

  async sendConfirmation(appointment) {
    // Send email/SMS confirmation
    console.log('📧 Sending confirmation for:', appointment.id);
  }

  async saveAppointmentRecord(appointment) {
    // Save to local database for tracking
    console.log('💾 Saving appointment:', appointment.id);
  }
}

module.exports = new CalendarService();
