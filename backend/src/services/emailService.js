const nodemailer = require('nodemailer');

/**
 * Email Service for LeadSync
 * Handles all email communications including password resets
 */
class EmailService {
  constructor() {
    // Initialize transporter based on environment
    const emailConfig = {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    };

    // For development/testing without real email credentials
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ Email credentials not configured. Emails will not be sent.');
      console.warn('Set EMAIL_USER and EMAIL_PASSWORD in .env to enable email sending.');
      this.transporter = null;
    } else {
      this.transporter = nodemailer.createTransport(emailConfig);
      console.log('✅ Email service initialized with:', process.env.EMAIL_USER);
    }
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email address
   * @param {string} resetToken - Password reset token
   * @returns {Promise<boolean>}
   */
  async sendPasswordResetEmail(email, resetToken) {
    if (!this.transporter) {
      console.error('❌ Email service not configured. Cannot send password reset email.');
      console.log('📧 [DEV MODE] Password reset token:', resetToken);
      console.log(`📧 [DEV MODE] Reset URL: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`);
      // In development, we don't throw an error to allow testing without email setup
      return true;
    }

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `LeadSync <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'LeadSync - Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #0a0118 0%, #1a0a2e 100%);
              color: #ffffff;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .logo {
              font-size: 36px;
              font-weight: 700;
              background: linear-gradient(135deg, #8B5CF6, #EC4899);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin-bottom: 8px;
            }
            .tagline {
              color: rgba(255, 255, 255, 0.6);
              font-size: 14px;
            }
            .content {
              background: rgba(26, 10, 46, 0.8);
              border: 1px solid rgba(139, 92, 246, 0.3);
              border-radius: 16px;
              padding: 32px;
              backdrop-filter: blur(10px);
            }
            .content h2 {
              margin-top: 0;
              margin-bottom: 16px;
              font-size: 24px;
              color: #ffffff;
            }
            .content p {
              line-height: 1.6;
              margin-bottom: 16px;
              color: rgba(255, 255, 255, 0.9);
            }
            .button {
              display: inline-block;
              padding: 16px 40px;
              background: linear-gradient(135deg, #8B5CF6, #EC4899);
              color: white !important;
              text-decoration: none;
              border-radius: 12px;
              font-weight: 600;
              margin: 24px 0;
              transition: transform 0.2s;
              box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
            }
            .button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 16px rgba(139, 92, 246, 0.6);
            }
            .warning {
              background: rgba(236, 72, 153, 0.1);
              border: 1px solid rgba(236, 72, 153, 0.3);
              border-radius: 8px;
              padding: 16px;
              margin: 24px 0;
            }
            .warning p {
              margin: 0;
              color: #EC4899;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              margin-top: 32px;
              color: rgba(255, 255, 255, 0.5);
              font-size: 13px;
              line-height: 1.6;
            }
            .footer a {
              color: #8B5CF6;
              text-decoration: none;
            }
            @media only screen and (max-width: 600px) {
              .container { padding: 20px 10px; }
              .content { padding: 24px 16px; }
              .button { padding: 14px 32px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">LeadSync</div>
              <div class="tagline">AI-Powered Lead Management</div>
            </div>

            <div class="content">
              <h2>🔐 Password Reset Request</h2>

              <p>Hi there,</p>

              <p>We received a request to reset the password for your LeadSync account associated with <strong>${email}</strong>.</p>

              <p>Click the button below to create a new password:</p>

              <center>
                <a href="${resetUrl}" class="button">Reset Your Password</a>
              </center>

              <div class="warning">
                <p><strong>⏰ This link expires in 1 hour</strong></p>
              </div>

              <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>

              <p>For security reasons, this reset link can only be used once.</p>

              <p style="margin-bottom: 0; margin-top: 24px;">
                Best regards,<br>
                <strong>The LeadSync Team</strong>
              </p>
            </div>

            <div class="footer">
              <p>
                LeadSync - AI-Powered Lead Management & Automation<br>
                <a href="${process.env.FRONTEND_URL}">Visit LeadSync</a>
              </p>
              <p style="margin-top: 16px;">
                This email was sent to ${email} because a password reset<br>
                was requested for your LeadSync account.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      // Plain text fallback
      text: `
LeadSync - Password Reset Request

We received a request to reset your password.

Reset your password by visiting this link:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this reset, you can safely ignore this email.

Thanks,
The LeadSync Team

LeadSync - AI-Powered Lead Management & Automation
${process.env.FRONTEND_URL}
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent to:', email);
      console.log('📧 Message ID:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Get reusable email template
   */
  getEmailTemplate(title, content, buttonText, buttonUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0a0118 0%, #1a0a2e 100%);
            color: #ffffff;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          .logo {
            font-size: 36px;
            font-weight: 700;
            background: linear-gradient(135deg, #8B5CF6, #EC4899);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .content {
            background: rgba(26, 10, 46, 0.8);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 16px;
            padding: 32px;
          }
          .content h2 {
            margin-top: 0;
            color: white;
          }
          .content p {
            line-height: 1.6;
            margin: 16px 0;
          }
          .button {
            display: inline-block;
            padding: 16px 32px;
            background: linear-gradient(135deg, #8B5CF6, #EC4899);
            color: white !important;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            margin: 24px 0;
          }
          .details-box {
            background: rgba(139, 92, 246, 0.1);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin: 12px 0;
            padding: 8px 0;
            border-bottom: 1px solid rgba(139, 92, 246, 0.2);
          }
          .detail-label {
            color: rgba(255, 255, 255, 0.6);
            font-size: 14px;
          }
          .detail-value {
            color: white;
            font-weight: 600;
          }
          .footer {
            text-align: center;
            margin-top: 32px;
            color: rgba(255,255,255,0.6);
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">LeadSync</div>
          </div>
          <div class="content">
            <h2>${title}</h2>
            ${content}
            ${buttonUrl ? `
              <center>
                <a href="${buttonUrl}" class="button">${buttonText}</a>
              </center>
            ` : ''}
          </div>
          <div class="footer">
            <p>LeadSync - AI-Powered Lead Management & Automation</p>
            <p style="margin-top: 16px; font-size: 12px;">
              This is an automated email. Please do not reply.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send appointment confirmation email
   */
  async sendAppointmentConfirmation(appointmentData) {
    if (!this.transporter) {
      console.log('📧 [DEV MODE] Appointment confirmation email would be sent to:', appointmentData.attendee_email);
      return true;
    }

    const { attendee_email, attendee_name, start_time, end_time, notes, meeting_link } = appointmentData;

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    const dateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = `${startDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })} - ${endDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;

    const content = `
      <p>Hi ${attendee_name},</p>
      <p>Your appointment has been confirmed! We're looking forward to meeting with you.</p>

      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">📅 Date</span>
          <span class="detail-value">${dateStr}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">🕐 Time</span>
          <span class="detail-value">${timeStr}</span>
        </div>
        ${meeting_link ? `
          <div class="detail-row">
            <span class="detail-label">🎥 Meeting Link</span>
            <span class="detail-value"><a href="${meeting_link}" style="color: #8B5CF6;">Join Meeting</a></span>
          </div>
        ` : ''}
        ${notes ? `
          <div class="detail-row">
            <span class="detail-label">📝 Notes</span>
            <span class="detail-value">${notes}</span>
          </div>
        ` : ''}
      </div>

      <p>We'll send you a reminder 24 hours before your appointment.</p>
      <p style="margin-bottom: 0;">See you soon!<br>The LeadSync Team</p>
    `;

    const html = this.getEmailTemplate(
      '✅ Appointment Confirmed',
      content,
      meeting_link ? 'Join Meeting' : 'View Details',
      meeting_link || `${process.env.FRONTEND_URL}/calendar`
    );

    try {
      await this.transporter.sendMail({
        from: `"LeadSync" <${process.env.EMAIL_USER}>`,
        to: attendee_email,
        subject: 'Your Appointment is Confirmed',
        html: html
      });
      console.log('✅ Appointment confirmation sent to:', attendee_email);
      return true;
    } catch (error) {
      console.error('❌ Failed to send appointment confirmation:', error);
      throw error;
    }
  }

  /**
   * Send appointment reminder email
   */
  async sendAppointmentReminder(appointmentData) {
    if (!this.transporter) {
      console.log('📧 [DEV MODE] Appointment reminder would be sent to:', appointmentData.attendee_email);
      return true;
    }

    const { attendee_email, attendee_name, start_time, meeting_link } = appointmentData;

    const startDate = new Date(start_time);
    const dateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = startDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const content = `
      <p>Hi ${attendee_name},</p>
      <p><strong>Reminder:</strong> You have an appointment coming up in 24 hours.</p>

      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">📅 Tomorrow</span>
          <span class="detail-value">${dateStr}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">🕐 Time</span>
          <span class="detail-value">${timeStr}</span>
        </div>
      </div>

      ${meeting_link ? `<p>Click the button below to join the meeting when it's time.</p>` : ''}
      <p style="margin-bottom: 0;">Looking forward to seeing you!<br>The LeadSync Team</p>
    `;

    const html = this.getEmailTemplate(
      '⏰ Appointment Reminder',
      content,
      'Join Meeting',
      meeting_link || `${process.env.FRONTEND_URL}/calendar`
    );

    try {
      await this.transporter.sendMail({
        from: `"LeadSync" <${process.env.EMAIL_USER}>`,
        to: attendee_email,
        subject: 'Reminder: Your Appointment Tomorrow',
        html: html
      });
      console.log('✅ Appointment reminder sent to:', attendee_email);
      return true;
    } catch (error) {
      console.error('❌ Failed to send appointment reminder:', error);
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email, name) {
    if (!this.transporter) {
      console.log('📧 [DEV MODE] Welcome email would be sent to:', email);
      return true;
    }

    const content = `
      <p>Hi ${name},</p>
      <p>Welcome to LeadSync! We're excited to have you on board.</p>
      <p>LeadSync helps you manage leads and automate your sales process with AI-powered conversations.</p>

      <div class="details-box">
        <h3 style="margin-top: 0;">🚀 Quick Start Guide:</h3>
        <p style="margin: 8px 0;">1. Create your first AI strategy</p>
        <p style="margin: 8px 0;">2. Connect your calendar</p>
        <p style="margin: 8px 0;">3. Integrate with GoHighLevel</p>
        <p style="margin: 8px 0;">4. Test your AI agent</p>
      </div>

      <p>Need help getting started? Check out our documentation or reach out to support.</p>
      <p style="margin-bottom: 0;">Let's build something amazing!<br>The LeadSync Team</p>
    `;

    const html = this.getEmailTemplate(
      '🎉 Welcome to LeadSync!',
      content,
      'Get Started',
      `${process.env.FRONTEND_URL}/home`
    );

    try {
      await this.transporter.sendMail({
        from: `"LeadSync" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Welcome to LeadSync!',
        html: html
      });
      console.log('✅ Welcome email sent to:', email);
      return true;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      throw error;
    }
  }

  /**
   * Send lead notification email
   */
  async sendLeadNotification(userEmail, leadData) {
    if (!this.transporter) {
      console.log('📧 [DEV MODE] Lead notification would be sent to:', userEmail);
      return true;
    }

    const content = `
      <p>Hi there,</p>
      <p>You have a new lead! 🎉</p>

      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">👤 Name</span>
          <span class="detail-value">${leadData.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📧 Email</span>
          <span class="detail-value">${leadData.email || 'Not provided'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📱 Phone</span>
          <span class="detail-value">${leadData.phone || 'Not provided'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📍 Source</span>
          <span class="detail-value">${leadData.source || 'Unknown'}</span>
        </div>
      </div>

      <p>Click below to view and manage this lead.</p>
      <p style="margin-bottom: 0;">Happy selling!<br>The LeadSync Team</p>
    `;

    const html = this.getEmailTemplate(
      '🔔 New Lead Captured!',
      content,
      'View Lead',
      `${process.env.FRONTEND_URL}/leads`
    );

    try {
      await this.transporter.sendMail({
        from: `"LeadSync" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'New Lead: ' + leadData.name,
        html: html
      });
      console.log('✅ Lead notification sent to:', userEmail);
      return true;
    } catch (error) {
      console.error('❌ Failed to send lead notification:', error);
      throw error;
    }
  }

  /**
   * Test email configuration
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email service is ready to send emails');
      return true;
    } catch (error) {
      console.error('❌ Email service configuration error:', error.message);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
