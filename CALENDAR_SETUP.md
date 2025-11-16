# 📅 LeadSync Calendar Integration - Setup Guide

## ✅ Phase 1 Complete!

The Google Calendar integration has been successfully installed in LeadSync. This guide will help you configure and use the calendar booking system.

---

## 🎯 What's Been Installed

### 1. **Packages Installed**
- `googleapis` - Google Calendar API client
- `google-auth-library` - OAuth2 authentication
- `@google-cloud/local-auth` - Local authentication helper

### 2. **New Files Created**

#### Backend Services
- `backend/src/services/googleCalendarService.js` - Complete Google Calendar API wrapper
  - OAuth2 authentication flow
  - Token management (access & refresh)
  - Available time slot calculation
  - Event creation, update, and cancellation
  - Calendar list management

#### API Routes
- `backend/src/routes/calendar.js` - RESTful API endpoints:
  - `GET /api/calendar/auth` - Start OAuth flow
  - `GET /api/calendar/callback` - OAuth callback handler
  - `GET /api/calendar/availability` - Get available time slots
  - `POST /api/calendar/book` - Book appointments
  - `GET /api/calendar/events` - List appointments
  - `DELETE /api/calendar/events/:id` - Cancel appointments
  - `GET /api/calendar/connection/status` - Check connection status
  - `DELETE /api/calendar/connection` - Disconnect calendar

#### Database Tables
- `calendar_connections` - Stores OAuth tokens per user
- `appointments` - Stores booking details
- `calendar_settings` - User preferences (working hours, timezone, etc.)
- `appointment_types` - Customizable appointment types (Discovery Call, Demo, Follow-up)

---

## 🔧 Configuration Steps

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google Calendar API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Configure OAuth consent screen (if first time):
   - User Type: External
   - App name: LeadSync
   - User support email: your email
   - Developer contact: your email
4. Create OAuth client ID:
   - Application type: **Web application**
   - Name: LeadSync Calendar
   - Authorized redirect URIs:
     - `http://localhost:3001/api/calendar/callback`
     - `https://yourdomain.com/api/calendar/callback` (for production)
5. Download credentials or copy Client ID and Client Secret

### Step 3: Update Environment Variables

Edit `backend/.env` file:

```bash
# Google Calendar Integration
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/calendar/callback
```

### Step 4: Restart Backend Server

```bash
cd backend
npm start
```

---

## 🚀 How to Use

### For Users (Connecting Calendar)

1. **Connect Google Calendar**
   ```
   GET /api/calendar/auth
   Authorization: Bearer <jwt_token>
   ```
   This returns an authorization URL. Redirect user to this URL.

2. **User Authorizes**
   - User grants permission to LeadSync
   - They're redirected back to `/api/calendar/callback`
   - Tokens are automatically stored in database

3. **Check Connection Status**
   ```
   GET /api/calendar/connection/status
   Authorization: Bearer <jwt_token>
   ```

### For Leads (Booking Appointments)

1. **Get Available Slots**
   ```
   GET /api/calendar/availability?startDate=2025-01-15&endDate=2025-01-20&duration=30
   Authorization: Bearer <jwt_token>
   ```

   Optional parameters:
   - `duration` - Meeting length in minutes (default: 30)
   - `workingHoursStart` - Start hour (default: 9)
   - `workingHoursEnd` - End hour (default: 17)

2. **Book Appointment**
   ```
   POST /api/calendar/book
   Authorization: Bearer <jwt_token>

   {
     "startTime": "2025-01-15T14:00:00Z",
     "endTime": "2025-01-15T14:30:00Z",
     "summary": "Discovery Call with John Doe",
     "description": "Discussing LeadSync implementation",
     "attendeeEmail": "john@example.com",
     "attendeeName": "John Doe",
     "timeZone": "America/New_York",
     "includeVideoConference": true
   }
   ```

3. **List Appointments**
   ```
   GET /api/calendar/events?maxResults=10&startDate=2025-01-15
   Authorization: Bearer <jwt_token>
   ```

4. **Cancel Appointment**
   ```
   DELETE /api/calendar/events/<event_id>
   Authorization: Bearer <jwt_token>
   ```

---

## 🎨 Features

### ✨ Built-in Capabilities

- **Smart Availability Detection**
  - Automatically detects conflicts with existing events
  - Respects working hours (9am-5pm by default)
  - Skips weekends automatically
  - Configurable time slots (15, 30, 45, 60 minutes)

- **Google Meet Integration**
  - Automatically creates video conference links
  - Includes meeting link in appointment details
  - Sent to attendees via email

- **Automatic Notifications**
  - Email reminders 24 hours before
  - Popup reminder 30 minutes before
  - All attendees notified of changes/cancellations

- **Token Management**
  - Automatic token refresh when expired
  - Secure storage in database
  - Per-user OAuth credentials

### 📊 Database Schema

**calendar_connections**
- Stores OAuth access & refresh tokens
- Links user to their Google Calendar
- Tracks token expiry

**appointments**
- Complete booking details
- Links to calendar events
- Tracks status (confirmed, cancelled, rescheduled, completed)
- Stores meeting links

**calendar_settings**
- User preferences (working hours, timezone)
- Buffer time between meetings
- Minimum notice period
- Maximum days in advance

**appointment_types**
- Customizable meeting types
- Default durations
- Custom questions for attendees
- Color coding

---

## 🧪 Testing the Integration

### 1. Test OAuth Flow
```bash
# Get auth URL
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/calendar/auth

# Visit the returned URL in browser
# After authorization, you'll be redirected to callback
```

### 2. Test Availability Check
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3001/api/calendar/availability?startDate=2025-01-20&endDate=2025-01-25&duration=30"
```

### 3. Test Booking
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "2025-01-20T14:00:00-05:00",
    "endTime": "2025-01-20T14:30:00-05:00",
    "summary": "Test Appointment",
    "attendeeEmail": "test@example.com",
    "attendeeName": "Test User"
  }' \
  http://localhost:3001/api/calendar/book
```

---

## 🔒 Security Notes

- OAuth tokens are stored encrypted in database
- Tokens automatically refresh before expiry
- Each user has isolated calendar access
- JWT authentication required for all endpoints
- HTTPS strongly recommended in production

---

## 📝 Next Steps - Phase 2 (Coming Soon)

- Frontend UI components for calendar integration
- Calendly-style booking page
- Embedded booking widget
- SMS reminders via Twilio
- Multiple calendar support
- Team availability (round-robin scheduling)
- Custom branding per appointment type
- Webhook notifications

---

## 🐛 Troubleshooting

### Error: "Google Calendar credentials not configured"
**Solution:** Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`

### Error: "redirect_uri_mismatch"
**Solution:** Add the exact redirect URI to Google Cloud Console authorized redirect URIs

### Error: "No calendar connected"
**Solution:** User needs to complete OAuth flow first via `/api/calendar/auth`

### Tokens expired
**Solution:** The system automatically refreshes tokens. If issues persist, disconnect and reconnect calendar.

---

## 📞 Support

For issues or questions:
1. Check the server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure Google Calendar API is enabled in GCP
4. Confirm OAuth redirect URIs match exactly

---

**🎉 You're all set! The calendar integration is ready to use.**
