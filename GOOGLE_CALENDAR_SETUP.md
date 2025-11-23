# Google Calendar Integration Setup Guide

This guide will walk you through setting up Google Calendar integration for LeadSync.

## Prerequisites

- Google Account
- Access to Google Cloud Console
- LeadSync backend running

## Step-by-Step Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown (top left, next to "Google Cloud")
3. Click **"New Project"**
4. Enter project name: `LeadSync Calendar` (or your preferred name)
5. Click **"Create"**
6. Wait for the project to be created and select it

### 2. Enable Google Calendar API

1. In your Google Cloud project, go to **"APIs & Services"** > **"Library"**
   - Or use this direct link: https://console.cloud.google.com/apis/library
2. Search for **"Google Calendar API"**
3. Click on **"Google Calendar API"** from the results
4. Click **"Enable"**
5. Wait for the API to be enabled

### 3. Configure OAuth Consent Screen

1. Go to **"APIs & Services"** > **"OAuth consent screen"**
   - Or use this link: https://console.cloud.google.com/apis/credentials/consent
2. Select **"External"** user type (or "Internal" if you have Google Workspace)
3. Click **"Create"**
4. Fill in the required fields:
   - **App name**: `LeadSync`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"Save and Continue"**
6. On the "Scopes" page, click **"Add or Remove Scopes"**
7. Add these scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
8. Click **"Update"** and then **"Save and Continue"**
9. On "Test users" page (if External), add your email as a test user
10. Click **"Save and Continue"**
11. Review and click **"Back to Dashboard"**

### 4. Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** > **"Credentials"**
   - Or use this link: https://console.cloud.google.com/apis/credentials
2. Click **"Create Credentials"** > **"OAuth client ID"**
3. Select **"Web application"** as the application type
4. Enter a name: `LeadSync Web Client`
5. Under **"Authorized redirect URIs"**, click **"Add URI"** and add:
   - For local development: `http://localhost:3001/api/calendar/callback`
   - For production (if deployed): `https://your-domain.com/api/calendar/callback`
   - You can add multiple URIs for different environments
6. Click **"Create"**
7. A popup will show your credentials - **COPY THESE NOW**:
   - **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)
   - **Client secret** (random string)
8. Click **"OK"**

> **Important**: Keep these credentials secure and never commit them to version control!

### 5. Update Backend Environment Variables

1. Open `backend/.env` in your text editor
2. Find the Google Calendar section (around line 50):

```env
# Google Calendar (Optional)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/calendar/callback
```

3. Replace with your actual credentials:

```env
# Google Calendar
GOOGLE_CLIENT_ID=your-actual-client-id-from-step-4.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret-from-step-4
GOOGLE_REDIRECT_URI=http://localhost:3001/api/calendar/callback
```

4. **Save the file**

### 6. Restart Backend Server

The backend needs to be restarted to load the new environment variables.

**If running with npm:**
```bash
cd backend
npm start
```

**If running with node:**
```bash
cd backend
node src/server.js
```

**If running on Render or other hosting:**
- Update the environment variables in your hosting dashboard
- The service will automatically restart

### 7. Test the Integration

1. Open LeadSync in your browser: `http://localhost:5000` (or your frontend URL)
2. Navigate to the **Calendar** page
3. Click **"Connect Google Calendar"**
4. You should be redirected to Google's OAuth consent page
5. Sign in with your Google account
6. Grant the requested permissions
7. You should be redirected back to LeadSync with calendar connected

### 8. Verify Connection

After authorizing:
- The Calendar page should show "Manage your appointments and availability"
- You should see any upcoming appointments
- Try creating a test appointment to verify it works

## Troubleshooting

### "Failed to connect calendar. Please try again."

**Possible causes:**
1. **Invalid credentials** - Double-check your Client ID and Secret
2. **Backend not restarted** - Restart the backend after updating .env
3. **Wrong redirect URI** - Make sure the redirect URI in Google Cloud matches your .env file exactly
4. **API not enabled** - Verify Google Calendar API is enabled in Google Cloud Console

### "Google Calendar credentials not configured"

This means the environment variables are still using placeholder values. Make sure you:
1. Replaced the placeholder values in `backend/.env`
2. Saved the file
3. Restarted the backend server

### "Authorization error" during OAuth flow

1. Check that your app is in "Testing" mode in OAuth consent screen
2. Make sure your Google account is added as a test user
3. Try using an incognito window to rule out cached auth issues

### Database errors about calendar_connections table

If you see database errors, you may need to run migrations:

```bash
cd backend
node src/scripts/migrate-to-cockroach.js
```

Or check that the calendar tables exist in your database.

## Production Deployment

When deploying to production:

1. Update `GOOGLE_REDIRECT_URI` in production environment variables:
   ```
   GOOGLE_REDIRECT_URI=https://your-production-domain.com/api/calendar/callback
   ```

2. Add the production redirect URI to your Google Cloud OAuth client:
   - Go to Google Cloud Console > Credentials
   - Edit your OAuth client
   - Add `https://your-production-domain.com/api/calendar/callback` to Authorized redirect URIs

3. Publish your OAuth consent screen (if using External type):
   - Go to OAuth consent screen
   - Click "Publish App"
   - Submit for verification (required for production use with external users)

## Security Best Practices

1. **Never commit credentials** - Keep `.env` in `.gitignore`
2. **Use different credentials** for development and production
3. **Rotate secrets regularly** - Change your Client Secret periodically
4. **Monitor usage** - Check Google Cloud Console for API usage and anomalies
5. **Set up billing alerts** - Though Calendar API is free for reasonable use

## API Endpoints Reference

Once configured, these endpoints will be available:

- `GET /api/calendar/auth` - Start OAuth flow
- `GET /api/calendar/callback` - OAuth callback (handled by Google)
- `GET /api/calendar/connection/status` - Check connection status
- `GET /api/calendar/availability` - Get available time slots
- `POST /api/calendar/book` - Book an appointment
- `GET /api/calendar/events` - List appointments
- `DELETE /api/calendar/events/:id` - Cancel appointment
- `DELETE /api/calendar/connection` - Disconnect calendar

## Support

If you continue to have issues:
1. Check backend logs for detailed error messages
2. Check browser console (F12) for frontend errors
3. Verify all environment variables are set correctly
4. Ensure database migrations have run successfully

---

**Next Steps After Setup:**
- Test booking an appointment through the UI
- Verify calendar events appear in your Google Calendar
- Set up availability preferences
- Configure appointment notifications
