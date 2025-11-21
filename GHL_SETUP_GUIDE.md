# GoHighLevel Integration Setup Guide

## Overview
This guide will help you complete the GoHighLevel (GHL) OAuth integration for LeadSync. The code is already implemented and working - you just need to configure your GHL app credentials.

---

## What's Already Built ✅

### Backend Infrastructure:
- ✅ OAuth 2.0 flow (`/api/ghl/auth/start`, `/api/ghl/auth/callback`)
- ✅ GHL API service with token refresh
- ✅ Database tables for storing GHL credentials
- ✅ Calendar, contacts, and opportunities endpoints
- ✅ Webhook receiver for inbound messages (`/api/webhook/ghl`)
- ✅ Integration status checking

### Frontend:
- ✅ Integrations page with "Connect GHL Account" button
- ✅ OAuth flow handling
- ✅ Connection status display
- ✅ Disconnect functionality

---

## Step 1: Create GHL App

### 1.1 Navigate to GHL Marketplace
1. Go to https://marketplace.gohighlevel.com/
2. Log in with your GHL account
3. Click on **"My Apps"** or **"Create App"**

### 1.2 Create New App
1. **App Name**: `LeadSync` (or your preferred name)
2. **App Description**: `AI Lead Management & Conversation Automation`
3. **App Type**: Select **"Private App"** or **"Public App"** depending on your needs
4. **Redirect URI**:
   ```
   https://leadsync.realassistagents.com/api/ghl/auth/callback
   ```
   ⚠️ **Important**: This MUST match exactly (including https://)

### 1.3 Set Required Scopes
Select the following OAuth scopes:
- ✅ `calendars.readonly` - View calendars
- ✅ `calendars.write` - Create/update calendar events
- ✅ `contacts.readonly` - View contacts
- ✅ `contacts.write` - Create/update contacts
- ✅ `opportunities.readonly` - View opportunities/pipelines
- ✅ `opportunities.write` - Create/update opportunities
- ✅ `conversations.readonly` - View conversations (optional)
- ✅ `conversations.write` - Send messages (optional)

### 1.4 Save and Get Credentials
After creating the app, you'll receive:
- **Client ID**: `abc123...` (looks like a random string)
- **Client Secret**: `xyz789...` (longer random string - keep this secret!)

---

## Step 2: Configure Backend Environment Variables

### 2.1 Update `.env` File
On your production server (Render.com), add these environment variables:

```bash
# GoHighLevel OAuth Configuration
GHL_CLIENT_ID=your_actual_client_id_from_step_1.4
GHL_CLIENT_SECRET=your_actual_client_secret_from_step_1.4
GHL_REDIRECT_URI=https://leadsync.realassistagents.com/api/ghl/auth/callback
GHL_APP_NAME=LeadSync
GHL_APP_DESCRIPTION=AI Lead Management & Conversation Automation
```

### 2.2 On Render.com Dashboard:
1. Go to your `leadsync-backend` service
2. Click **"Environment"** tab
3. Add each variable above (replace `your_actual_...` with real values)
4. Click **"Save Changes"**
5. Service will auto-redeploy with new variables

---

## Step 3: Test the OAuth Flow

### 3.1 Test Connection from Frontend
1. Go to https://leadsync.realassistagents.com
2. Login to your LeadSync account
3. Navigate to **Settings** → **Integrations** page
4. Click **"Connect GHL Account"** button
5. You should be redirected to GHL OAuth authorization page
6. Select a GHL location (sub-account) to connect
7. Click **"Authorize"**
8. You should be redirected back to LeadSync with "GHL Connected" status

### 3.2 Verify Connection
After successful connection, you should see:
- ✅ Green "Connected" status dot
- ✅ "Your GHL account is connected and ready" message
- ✅ "Disconnect" button (instead of "Connect" button)

### 3.3 Check Database
The connection stores credentials in `ghl_credentials` table:
```sql
SELECT user_id, location_id, expires_at, created_at
FROM ghl_credentials
WHERE user_id = 'your-user-id';
```

---

## Step 4: Configure GHL Webhooks (For Inbound Messages)

### 4.1 Import Snapshot (Easiest Method)
1. In LeadSync Integrations page, click **"View Snapshot"**
2. Download the JSON file
3. Go to GHL → Settings → Snapshots → Import
4. Upload the JSON file
5. The workflow will be created automatically!

### 4.2 Manual Webhook Setup (Alternative)
If you prefer manual setup:

1. **Create Workflow in GHL**:
   - Go to GHL → Automations → Workflows
   - Create new workflow: "LeadSync AI Chat"

2. **Add Trigger**:
   - Type: **Inbound Message**
   - Channels: SMS, Facebook, Instagram, GMB

3. **Add Webhook Action**:
   - URL: `https://leadsync.realassistagents.com/api/webhook/ghl`
   - Method: POST
   - Headers:
     ```
     Content-Type: application/json
     x-client-id: YOUR_CLIENT_ID_FROM_LEADSYNC
     ```
   - Body (JSON):
     ```json
     {
       "message": {
         "body": "{{message.body}}",
         "contactId": "{{contact.id}}",
         "conversationId": "{{conversation.id}}"
       },
       "contact": {
         "id": "{{contact.id}}",
         "name": "{{contact.name}}",
         "phone": "{{contact.phone}}",
         "email": "{{contact.email}}",
         "tags": "{{contact.tags}}"
       }
     }
     ```

4. **Save Response**:
   - Save webhook response as custom field: `ai_response`

5. **Add Condition**:
   - If `ai_response.success == true`
   - Then: Send SMS with `{{ai_response.message}}`
   - Else: Send fallback message

---

## Step 5: Test End-to-End

### 5.1 Create AI Strategy in LeadSync
1. Go to LeadSync → AI Agents
2. Create a new strategy with qualification questions
3. Note the strategy ID or tag

### 5.2 Tag a GHL Contact
1. Go to GHL → Contacts
2. Select a test contact
3. Add tag matching your LeadSync strategy

### 5.3 Send Test Message
1. Send SMS to the GHL contact's phone number
2. GHL should trigger the workflow
3. Workflow calls LeadSync webhook
4. LeadSync AI processes message and returns response
5. GHL sends AI response back to contact

### 5.4 Verify in LeadSync
1. Check LeadSync → Conversations
2. You should see the conversation with AI responses
3. Check LeadSync → Leads
4. Lead should be created/updated

---

## Troubleshooting

### Issue: "Failed to connect to GoHighLevel"
**Cause**: OAuth credentials not configured or incorrect
**Fix**:
- Verify `GHL_CLIENT_ID` and `GHL_CLIENT_SECRET` in environment variables
- Ensure `GHL_REDIRECT_URI` exactly matches what's configured in GHL app
- Check Render logs: `Settings → Logs` to see actual error

### Issue: "Invalid redirect_uri"
**Cause**: Mismatch between GHL app config and backend env variable
**Fix**:
- GHL app redirect URI must be: `https://leadsync.realassistagents.com/api/ghl/auth/callback`
- Backend `GHL_REDIRECT_URI` must match exactly
- No trailing slashes, must include https://

### Issue: Webhook not receiving messages
**Cause**: Client ID not set in webhook headers
**Fix**:
- Go to LeadSync → Settings → Integrations
- Copy your Client ID
- In GHL workflow webhook, add header: `x-client-id: YOUR_CLIENT_ID`

### Issue: "Token expired" errors
**Cause**: Access token expired and refresh failed
**Fix**:
- Disconnect and reconnect GHL account
- Check backend logs for refresh token errors
- Verify GHL app scopes include required permissions

---

## Testing Checklist

- [ ] GHL app created in marketplace
- [ ] Client ID and Secret added to Render environment variables
- [ ] Backend redeployed with new environment variables
- [ ] "Connect GHL Account" button works
- [ ] OAuth redirect to GHL works
- [ ] OAuth callback returns to LeadSync successfully
- [ ] "Connected" status shows in Integrations page
- [ ] Webhook URL accessible: `https://leadsync.realassistagents.com/api/webhook/ghl`
- [ ] Workflow imported/created in GHL
- [ ] Test message triggers AI response
- [ ] Conversation appears in LeadSync

---

## API Endpoints Reference

### OAuth Endpoints:
- `GET /api/ghl/auth/start` - Start OAuth flow (returns authorization URL)
- `GET /api/ghl/auth/callback` - OAuth callback (GHL redirects here)
- `GET /api/ghl/status` - Check connection status
- `POST /api/ghl/disconnect` - Disconnect GHL account

### GHL API Endpoints (require connection):
- `GET /api/ghl/calendars` - List calendars
- `GET /api/ghl/calendars/:id/events` - Get calendar events
- `GET /api/ghl/contacts/search?query=...` - Search contacts
- `POST /api/ghl/calendars/events` - Create appointment

### Webhook Endpoints:
- `POST /api/webhook/ghl` - Receive GHL webhooks (inbound messages)
- `POST /api/webhook/test` - Test webhook locally
- `GET /api/webhook/logs` - View webhook logs

---

## Next Steps After Setup

1. **Create Multiple Strategies**: Build different AI agents for different use cases
2. **Tag-Based Routing**: Use GHL tags to route contacts to specific strategies
3. **Calendar Integration**: Enable AI to book appointments automatically
4. **Lead Scoring**: Configure qualification questions to score leads
5. **Team Management**: Add team members to handle qualified leads

---

## Support

If you encounter issues:
1. Check Render logs for backend errors
2. Check browser console for frontend errors
3. Test webhook with: `POST /api/webhook/test` endpoint
4. View webhook logs: `GET /api/webhook/logs?clientId=YOUR_CLIENT_ID`

---

**Status**: ✅ Code Complete - Ready for Configuration
**Last Updated**: 2025-01-21
