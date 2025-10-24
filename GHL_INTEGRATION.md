# GoHighLevel Integration Guide

This guide explains how to set up and use the GoHighLevel integration with LeadSync.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Creating Your GHL OAuth App](#creating-your-ghl-oauth-app)
3. [Configuring Webhooks](#configuring-webhooks)
4. [Understanding the Sync Flow](#understanding-the-sync-flow)
5. [Testing the Integration](#testing-the-integration)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

- GoHighLevel account with admin/agency access
- Location set up in GHL
- At least one calendar created in GHL
- LeadSync backend and frontend running

## Creating Your GHL OAuth App

### Step 1: Access GHL Settings

1. Log in to your GoHighLevel account
2. Click on **Settings** (gear icon)
3. Navigate to **Integrations** → **Custom Apps**
4. Click **Create App**

### Step 2: Configure App Settings

Fill in the following information:

**Basic Information:**
- **App Name:** `LeadSync` (or your preferred name)
- **App URL:** `http://localhost:3000` (or your production URL)
- **Description:** `AI-powered appointment scheduling system`

**OAuth Configuration:**
- **Redirect URI:** `http://localhost:3001/api/ghl/auth/callback`
  - ⚠️ **Important:** This must match exactly!
  - For production: `https://yourdomain.com/api/ghl/auth/callback`

**Scopes Required:**
Select the following scopes:
- ✅ `calendars.readonly` - View calendars and events
- ✅ `calendars.write` - Create and modify calendar events
- ✅ `contacts.readonly` - View contact information
- ✅ `contacts.write` - Create and update contacts
- ✅ `opportunities.readonly` - View opportunities (optional)
- ✅ `opportunities.write` - Create opportunities (optional)

### Step 3: Save and Get Credentials

1. Click **Create** or **Save**
2. Copy your **Client ID**
3. Copy your **Client Secret**
4. Store these securely in your `backend/.env` file:

```env
GHL_CLIENT_ID=your_copied_client_id
GHL_CLIENT_SECRET=your_copied_client_secret
GHL_REDIRECT_URI=http://localhost:3001/api/ghl/auth/callback
```

## Configuring Webhooks

Webhooks enable real-time synchronization from GHL to LeadSync.

### When Do You Need Webhooks?

- **Without webhooks:** Changes in GHL require manual sync button click
- **With webhooks:** Changes in GHL automatically update LeadSync instantly

### Step 1: Get Your Webhook URL

For **local development:**
```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3001

# Use the https URL provided (e.g., https://abc123.ngrok.io)
```

For **production:**
```
https://yourdomain.com
```

### Step 2: Configure GHL Webhooks

1. In GHL, go to **Settings** → **Webhooks**
2. Click **Add Webhook**

**Calendar Events Webhook:**
- **Name:** LeadSync Calendar Sync
- **URL:** `https://your-url.com/api/webhooks/ghl/calendar`
- **Events to Subscribe:**
  - `CalendarEvent.create` - New appointments
  - `CalendarEvent.update` - Modified appointments
  - `CalendarEvent.delete` - Cancelled appointments

**Contacts Webhook (Optional):**
- **Name:** LeadSync Contact Sync
- **URL:** `https://your-url.com/api/webhooks/ghl/contact`
- **Events to Subscribe:**
  - `Contact.create` - New contacts
  - `Contact.update` - Modified contacts
  - `Contact.delete` - Deleted contacts

### Step 3: Test Webhook

```bash
# Test endpoint
curl https://your-url.com/api/webhooks/test

# Should return:
{
  "success": true,
  "message": "Webhook endpoint is working",
  "timestamp": "2025-10-23T..."
}
```

## Understanding the Sync Flow

### LeadSync → GHL (Outbound Sync)

When you create an appointment in LeadSync:

1. **User creates appointment** with "Sync to GHL" enabled
2. **LeadSync creates contact** in GHL (if needed)
3. **LeadSync creates calendar event** in GHL
4. **Appointment marked as synced** in LeadSync database
5. **GHL event ID stored** for future updates

```javascript
// Example: Creating synced appointment
POST /api/appointments
{
  "contactName": "John Doe",
  "contactPhone": "+1234567890",
  "title": "Consultation",
  "startTime": "2025-10-25T14:00:00Z",
  "endTime": "2025-10-25T15:00:00Z",
  "syncToGHL": true,           // Enable sync
  "calendarId": "cal_xyz123"   // GHL calendar ID
}
```

### GHL → LeadSync (Inbound Sync)

#### Manual Sync

Click "Sync from GHL" button:

1. **LeadSync requests** all events from GHL calendar
2. **New events are created** in LeadSync database
3. **Existing events are updated** with latest information
4. **Sync timestamp recorded** for each appointment

#### Automatic Sync (Webhooks)

When appointment changes in GHL:

1. **GHL sends webhook** to LeadSync
2. **Webhook handler processes** the event
3. **Database updated** automatically
4. **Sync log entry created** for tracking

```json
// Example webhook payload from GHL
{
  "type": "CalendarEvent.update",
  "location_id": "loc_abc123",
  "calendar_id": "cal_xyz123",
  "event": {
    "id": "evt_789",
    "title": "Consultation",
    "startTime": "2025-10-25T14:00:00Z",
    "endTime": "2025-10-25T15:00:00Z",
    "contact": {
      "id": "contact_456",
      "name": "John Doe",
      "phone": "+1234567890"
    }
  }
}
```

## Testing the Integration

### Test 1: OAuth Connection

1. **Start LeadSync**
2. **Go to Settings** page
3. **Click "Connect to GoHighLevel"**
4. **Authorize the app** in GHL
5. **Verify success:**
   - Green "Connected" indicator
   - Location ID displayed
   - Calendars listed

### Test 2: Create Appointment (LeadSync → GHL)

1. **Go to Appointments** page
2. **Click "+ New Appointment"**
3. **Fill in:**
   - Contact Name: Test User
   - Phone: +1234567890
   - Title: Test Appointment
   - Time: Tomorrow at 2 PM
4. **Enable "Sync to GoHighLevel"**
5. **Select calendar**
6. **Submit**
7. **Verify:**
   - Appointment appears in LeadSync
   - Check GHL calendar - appointment should be there
   - Sync indicator (🔄) shown in LeadSync

### Test 3: Update Appointment in GHL (GHL → LeadSync)

**With Webhooks:**
1. **Open GHL calendar**
2. **Find the test appointment**
3. **Change the time** or title
4. **Save changes in GHL**
5. **Verify in LeadSync:**
   - Refresh the page
   - Changes should appear immediately

**Without Webhooks:**
1. **Make changes in GHL**
2. **In LeadSync, click "Sync from GHL"**
3. **Changes should appear**

### Test 4: Delete Appointment

1. **Delete appointment in GHL**
2. **With webhooks:** Status becomes "cancelled" in LeadSync
3. **Without webhooks:** Click "Sync from GHL" to update status

## Integration Features

### What Gets Synced

**From LeadSync to GHL:**
- ✅ Contact information (name, phone, email)
- ✅ Appointment title
- ✅ Start and end time
- ✅ Location/address
- ✅ Notes
- ✅ Appointment status

**From GHL to LeadSync:**
- ✅ All calendar events
- ✅ Event updates (time, title, status)
- ✅ Event deletions (marked as cancelled)
- ✅ Contact information
- ✅ Appointment metadata

### Sync Status Indicators

In LeadSync appointments:
- 🔄 = Synced to GHL
- No indicator = Local only
- Last synced timestamp shown

### Conflict Resolution

When the same appointment is modified in both systems:
- **Webhook-enabled:** GHL changes take precedence (real-time)
- **Manual sync:** Latest sync overwrites local changes
- **Best practice:** Make changes in one system only

## Advanced Configuration

### Multiple Calendars

You can sync with multiple GHL calendars:

1. **In Settings:** Select default calendar
2. **When creating:** Choose specific calendar
3. **Each appointment** can be in different calendars

### Sync Intervals

Configure automatic sync frequency in Settings:
- Default: 15 minutes
- Range: 5-60 minutes
- Only applies to polling-based sync
- Webhooks sync instantly regardless of this setting

### Business Hours

Set availability in Settings:
- Start time (e.g., 9:00 AM)
- End time (e.g., 5:00 PM)
- Timezone
- AI scheduling respects these hours

## Troubleshooting

### Connection Issues

**Problem:** "Failed to connect to GHL"

**Solutions:**
1. Verify Client ID and Secret are correct
2. Check redirect URI matches exactly
3. Ensure all scopes are enabled
4. Try clearing browser cache
5. Check GHL app is active/approved

### Sync Issues

**Problem:** Appointments not syncing to GHL

**Check:**
1. Connection status in Settings
2. "Sync to GHL" checkbox is enabled
3. Calendar is selected
4. GHL API is accessible
5. Check sync logs in database:
   ```sql
   SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 10;
   ```

**Problem:** Changes in GHL not appearing

**For webhooks:**
1. Verify webhook URL is accessible
2. Check webhook is active in GHL
3. Test webhook endpoint: `/api/webhooks/test`
4. Check server logs for webhook errors

**For manual sync:**
1. Click "Sync from GHL" button
2. Select the correct calendar
3. Check for errors in console

### Token Expiration

GHL access tokens expire after 24 hours:
- LeadSync automatically refreshes tokens
- If refresh fails, you'll need to reconnect
- Check `ghl_credentials` table for token expiry

### Webhook Not Receiving Events

1. **Check ngrok:** Is tunnel still running?
2. **Check URL:** Does it match webhook configuration?
3. **Check firewall:** Is port accessible?
4. **Check logs:** Any errors in server logs?
5. **Test endpoint:** Does `/api/webhooks/test` respond?

## Security Best Practices

1. **Never commit** `.env` file to git
2. **Use HTTPS** in production
3. **Rotate tokens** periodically
4. **Validate webhook** signatures (implement HMAC verification)
5. **Rate limit** API calls
6. **Monitor** sync logs for suspicious activity

## API Rate Limits

GoHighLevel API limits:
- **Standard:** 300 requests per minute
- **Burst:** 600 requests per minute
- LeadSync implements automatic retry with backoff

## Production Checklist

Before going live:

- [ ] GHL OAuth app approved for production
- [ ] HTTPS enabled for webhook endpoints
- [ ] Redirect URI updated to production URL
- [ ] Environment variables secured
- [ ] Webhook endpoints tested
- [ ] Error monitoring configured
- [ ] Backup strategy for database
- [ ] Rate limiting implemented
- [ ] Logging configured

## Support Resources

- **GHL API Docs:** https://highlevel.stoplight.io/
- **GHL Community:** https://community.gohighlevel.com/
- **OAuth 2.0 Spec:** https://oauth.net/2/
- **Webhook Best Practices:** https://webhooks.fyi/

---

Need help? Check the main README.md or create an issue in the repository.
