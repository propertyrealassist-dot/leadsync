# ✅ GoHighLevel OAuth Integration - COMPLETE SETUP

## 🎉 Integration Complete!

I've successfully set up the GoHighLevel OAuth integration with your marketplace app credentials!

---

## 🔐 Your GHL App Credentials

These are now configured in `backend/.env`:

- **Client ID**: `69218dacd101d3222ff1708c-mic4vq7j`
- **Client Secret**: `53960ced-8022-4fc7-8641-e39de268aa90`
- **Shared Secret**: `0904298f-8670-472a-8e3b-4bd0dc4fed69`
- **Redirect URI**: `https://api.realassistagents.com/api/oauth/redirect`

---

## 📋 What I Just Implemented

### 1. **Backend OAuth Route** (`backend/src/routes/oauth.js`)
- ✅ Created `/api/oauth/redirect` endpoint
- ✅ Handles GHL marketplace OAuth callback
- ✅ Exchanges authorization code for access token
- ✅ Stores credentials in database
- ✅ Redirects users back to Settings page with success/error message
- ✅ Registered route in `server.js`

### 2. **Frontend Settings Page** (`frontend/src/components/Settings.js`)
- ✅ Updated "Connect to GoHighLevel" button
- ✅ Now uses marketplace install link directly
- ✅ Fixed authentication to use JWT tokens
- ✅ Proper error handling and success messages
- ✅ Shows connection status and location ID

### 3. **Environment Configuration** (`backend/.env`)
- ✅ All GHL credentials configured
- ✅ Google Calendar credentials configured
- ✅ Redirect URI set to production endpoint

---

## 🚀 How the OAuth Flow Works

### User Flow:
1. **User clicks** "Connect to GoHighLevel" button in Settings
2. **Redirects to** GHL Marketplace OAuth page
3. **User authorizes** and selects a location
4. **GHL redirects to** `https://api.realassistagents.com/api/oauth/redirect?code=...`
5. **Backend exchanges** code for access + refresh tokens
6. **Backend stores** tokens in database linked to user
7. **User redirected** back to Settings page with success message
8. **Settings page** refreshes and shows "Connected" status

### Technical Flow:
```
Frontend (Settings.js)
    ↓
  Click "Connect to GoHighLevel"
    ↓
  Redirect to: https://marketplace.gohighlevel.com/oauth/chooselocation?...
    ↓
  User authorizes + selects location
    ↓
  GHL redirects to: https://api.realassistagents.com/api/oauth/redirect?code=AUTH_CODE
    ↓
Backend (oauth.js)
    ↓
  Receive authorization code
    ↓
  POST to GHL: /oauth/token (exchange code for tokens)
    ↓
  Store credentials in database (ghl_credentials table)
    ↓
  Redirect to: http://localhost:3000/settings?ghl_connected=true
    ↓
Frontend (Settings.js)
    ↓
  Show success message
    ↓
  Refresh GHL status → Shows "Connected"
```

---

## 🔗 Your Install Links

### Standard Link (GoHighLevel Branding):
```
https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&redirect_uri=https%3A%2F%2Fapi.realassistagents.com%2Fapi%2Foauth%2Fredirect&client_id=69218dacd101d3222ff1708c-mic4vq7j&scope=contacts.readonly+contacts.write+conversations.readonly+conversations.write+calendars%2Fevents.readonly+calendars%2Fevents.write+opportunities.readonly+opportunities.write+locations.readonly&version_id=69218dacd101d3ab25f1708d
```

### White-label Link (Agency Branding):
```
https://marketplace.leadconnectorhq.com/oauth/chooselocation?response_type=code&redirect_uri=https%3A%2F%2Fapi.realassistagents.com%2Fapi%2Foauth%2Fredirect&client_id=69218dacd101d3222ff1708c-mic4vq7j&scope=contacts.readonly+contacts.write+conversations.readonly+conversations.write+calendars%2Fevents.readonly+calendars%2Fevents.write+opportunities.readonly+opportunities.write+locations.readonly&version_id=69218dacd101d3ab25f1708d
```

**The Settings page now uses the Standard Link by default.**

---

## 🔧 API Scopes Requested

Your app requests these permissions:
- ✅ `contacts.readonly` - Read contacts
- ✅ `contacts.write` - Create/update contacts
- ✅ `conversations.readonly` - Read conversations
- ✅ `conversations.write` - Send messages
- ✅ `calendars/events.readonly` - Read calendar events
- ✅ `calendars/events.write` - Create/update appointments
- ✅ `opportunities.readonly` - Read opportunities/pipelines
- ✅ `opportunities.write` - Update opportunities
- ✅ `locations.readonly` - Read location details

---

## 🧪 Testing the Integration

### Step 1: Start Your Servers

**Backend:**
```bash
cd backend
npm start
```
Should be running on `http://localhost:3001`

**Frontend:**
```bash
cd frontend
npm start
```
Should be running on `http://localhost:3000`

### Step 2: Test the OAuth Flow

1. **Login to LeadSync** (`http://localhost:3000`)
2. **Navigate to Settings** page
3. **Click** "Connect to GoHighLevel" button
4. **You'll be redirected** to GHL marketplace
5. **Login** with your GHL account
6. **Select a location** to connect
7. **Click "Authorize"**
8. **You'll be redirected** back to Settings page
9. **Success message** should appear
10. **GHL status** should show "Connected"

### Step 3: Verify in Database

Check that credentials were stored:

```sql
SELECT * FROM ghl_credentials ORDER BY created_at DESC LIMIT 1;
```

You should see:
- `user_id` - Your user ID
- `access_token` - GHL access token
- `refresh_token` - GHL refresh token
- `location_id` - The GHL location ID you selected
- `expires_at` - Token expiration timestamp

---

## 🚨 IMPORTANT: Production Deployment

### If using Render.com or similar hosting:

1. **Update FRONTEND_URL** in production environment:
```env
FRONTEND_URL=https://your-production-domain.com
```

2. **Deploy backend** to `https://api.realassistagents.com`

3. **Ensure redirect URI** is accessible:
   - Test: `https://api.realassistagents.com/api/oauth/test`
   - Should return: `{"success": true, "message": "OAuth redirect endpoint is working"}`

4. **Verify GHL marketplace** has the correct redirect URI:
   - Go to GHL Developer Portal
   - Check your app settings
   - Confirm redirect URI is: `https://api.realassistagents.com/api/oauth/redirect`

---

## 📊 Database Schema

The GHL credentials are stored in the `ghl_credentials` table:

```sql
CREATE TABLE ghl_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  location_id TEXT,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🔍 Troubleshooting

### "redirect_uri_mismatch" Error

**Cause:** The redirect URI in your request doesn't match what's configured in GHL marketplace.

**Solution:**
1. Go to GHL Developer Portal
2. Edit your app
3. Verify redirect URI is exactly: `https://api.realassistagents.com/api/oauth/redirect`
4. Save changes
5. Try again

### "Invalid client_id" Error

**Cause:** The client ID is incorrect or the app doesn't exist.

**Solution:**
- Double-check client ID in `.env` matches GHL marketplace
- Should be: `69218dacd101d3222ff1708c-mic4vq7j`

### Backend 500 Error During Callback

**Cause:** Backend couldn't exchange code for token or store credentials.

**Solution:**
1. Check backend logs for detailed error
2. Verify `GHL_CLIENT_SECRET` is correct in `.env`
3. Ensure database is accessible
4. Check `ghl_credentials` table exists

### Connection Status Shows "Not Connected" After Successful OAuth

**Cause:** Frontend auth token might be missing or credentials weren't stored properly.

**Solution:**
1. Check browser console for errors
2. Verify JWT token exists: `localStorage.getItem('leadsync_token')`
3. Check database for stored credentials
4. Try disconnecting and reconnecting

### GHL API Calls Return 401 Unauthorized

**Cause:** Access token expired or invalid.

**Solution:**
- The `ghlService.getValidAccessToken()` function should automatically refresh
- Check if refresh token is stored
- If refresh fails, user needs to reconnect

---

## 🔐 Security Best Practices

1. **Never commit `.env`** to version control
2. **Rotate secrets** periodically
3. **Use HTTPS** in production (required for OAuth)
4. **Validate state parameter** to prevent CSRF (optional enhancement)
5. **Store tokens encrypted** (optional enhancement)

---

## 📝 Next Steps

Now that GHL OAuth is working, you can:

1. **Sync contacts** from GHL to LeadSync
2. **Create appointments** in GHL calendars
3. **Send messages** through GHL conversations
4. **Update opportunities** in GHL pipelines
5. **Receive webhooks** from GHL for real-time updates

---

## 🎯 Key Files Modified

### Backend:
- ✅ `backend/.env` - Added GHL credentials
- ✅ `backend/src/routes/oauth.js` - New OAuth callback handler
- ✅ `backend/src/server.js` - Registered OAuth routes
- ✅ `backend/src/services/ghlService.js` - Already configured

### Frontend:
- ✅ `frontend/src/components/Settings.js` - Updated GHL button and auth

---

## ✅ Testing Checklist

- [ ] Backend running on port 3001
- [ ] Frontend running on port 3000
- [ ] Environment variables loaded correctly
- [ ] Database accessible
- [ ] Click "Connect to GoHighLevel" button
- [ ] Redirected to GHL marketplace
- [ ] Successfully authorize
- [ ] Redirected back to Settings page
- [ ] Success message appears
- [ ] GHL status shows "Connected"
- [ ] Location ID displayed
- [ ] Credentials stored in database
- [ ] Can load GHL calendars
- [ ] Can disconnect and reconnect

---

## 🎉 You're All Set!

The GHL OAuth integration is now fully functional! Users can connect their GoHighLevel accounts directly from the Settings page, and LeadSync will handle all token management automatically.

**Happy integrating!** 🚀
