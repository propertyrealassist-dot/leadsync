class NotificationService {
  constructor() {
    // Email configuration would go here
    // In production, use nodemailer with SMTP or SendGrid/Mailgun
  }

  /**
   * Send appointment confirmation email
   */
  async sendAppointmentConfirmation(appointment, contact) {
    const emailTemplate = this.getAppointmentConfirmationTemplate(appointment, contact);

    return await this.sendEmail({
      to: contact.email,
      subject: `Appointment Confirmed - ${new Date(appointment.startTime).toLocaleDateString()}`,
      html: emailTemplate
    });
  }

  /**
   * Send appointment reminder (24h before)
   */
  async sendAppointmentReminder(appointment, contact) {
    const emailTemplate = this.getAppointmentReminderTemplate(appointment, contact);

    return await this.sendEmail({
      to: contact.email,
      subject: `Reminder: Upcoming Appointment Tomorrow`,
      html: emailTemplate
    });
  }

  /**
   * Send SMS notification via GHL
   */
  async sendSMS(phoneNumber, message) {
    try {
      // Integration with GHL SMS API
      console.log(`📱 Sending SMS to ${phoneNumber}: ${message}`);
      // Actual implementation would call GHL API
      return { success: true };
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  async sendEmail({ to, subject, html, from }) {
    try {
      // In production, integrate with actual email provider
      console.log(`📧 Sending email to ${to}:`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Email template generated`);

      // Placeholder for actual email sending
      // const info = await this.emailTransporter.sendMail({
      //   from: from || '"LeadSync" <noreply@leadsync.com>',
      //   to,
      //   subject,
      //   html
      // });

      return { success: true, messageId: 'mock_' + Date.now() };

    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  getAppointmentConfirmationTemplate(appointment, contact) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .details { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #8B5CF6; border-radius: 4px; }
          .button { display: inline-block; padding: 12px 30px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Appointment Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hi ${contact.firstName || contact.name || 'there'},</p>
            <p>Your appointment has been successfully scheduled!</p>

            <div class="details">
              <h3>Appointment Details</h3>
              <p><strong>Date:</strong> ${new Date(appointment.startTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Time:</strong> ${new Date(appointment.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
              <p><strong>Duration:</strong> ${appointment.duration} minutes</p>
              ${appointment.location ? `<p><strong>Location:</strong> ${appointment.location}</p>` : ''}
              ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
            </div>

            <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>

            ${appointment.rescheduleUrl ? `<a href="${appointment.rescheduleUrl}" class="button">Reschedule Appointment</a>` : ''}
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} LeadSync. All rights reserved.</p>
            <p>This is an automated message. Please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getAppointmentReminderTemplate(appointment, contact) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #8B5CF6); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .reminder-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .details { background: white; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Appointment Reminder</h1>
          </div>
          <div class="content">
            <p>Hi ${contact.firstName || contact.name || 'there'},</p>

            <div class="reminder-box">
              <h3>Your appointment is tomorrow!</h3>
              <p>This is a friendly reminder about your upcoming appointment.</p>
            </div>

            <div class="details">
              <p><strong>Date:</strong> ${new Date(appointment.startTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Time:</strong> ${new Date(appointment.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
              <p><strong>Duration:</strong> ${appointment.duration} minutes</p>
            </div>

            <p>We're looking forward to seeing you!</p>
            <p>If you need to reschedule, please let us know as soon as possible.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} LeadSync. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Schedule reminder notifications
   * Call this when appointment is created
   */
  async scheduleReminders(appointment, contact) {
    const appointmentTime = new Date(appointment.startTime);
    const now = new Date();

    // Schedule 24h reminder
    const reminderTime24h = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);
    if (reminderTime24h > now) {
      // In production, use a job queue like Bull or Agenda
      console.log(`⏰ Reminder scheduled for: ${reminderTime24h.toISOString()}`);
      // await this.queueReminderJob(appointment, contact, reminderTime24h);
    }

    // Schedule 1h reminder
    const reminderTime1h = new Date(appointmentTime.getTime() - 60 * 60 * 1000);
    if (reminderTime1h > now) {
      console.log(`⏰ Reminder scheduled for: ${reminderTime1h.toISOString()}`);
      // await this.queueReminderJob(appointment, contact, reminderTime1h);
    }
  }

  /**
   * Send booking confirmation SMS
   */
  async sendBookingConfirmationSMS(phoneNumber, appointment) {
    const message = `Appointment confirmed for ${new Date(appointment.startTime).toLocaleDateString()} at ${new Date(appointment.startTime).toLocaleTimeString()}. Reply CANCEL to cancel.`;
    return await this.sendSMS(phoneNumber, message);
  }
}

module.exports = new NotificationService();
