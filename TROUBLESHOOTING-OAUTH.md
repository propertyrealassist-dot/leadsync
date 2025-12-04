# 🐛 GoHighLevel OAuth Troubleshooting Guide

## Quick Diagnostics

### Step 1: Check Where It Fails

```
[Start] → [Click Connect] → [GHL Permission] → [Approve] → [Callback] → [Connected] ✅
            ↓                  ↓                 ↓            ↓            ↓
         Button            Redirect           Redirect    Backend      Shows
         works?            to GHL?            back?       logs?        Connected?
```

Tell me where it stops! ⬆️

---

## Common Issues & Fixes

### Issue 1: Button Doesn't Redirect to GHL

**Symptoms:**
- Click "Connect to GoHighLevel" but nothing happens
- No redirect to GHL permission screen

**Check:**
```javascript
// Open browser console (F12)
// Click the button
// Look for errors like:
// - "Failed to fetch"
// - "Network error"
// - "CORS error"
```

**Fix:**
1. Check if frontend is running: `http://localhost:3000`
2. Open `frontend/src/components/GHLIntegrationCard.js`
3. Verify the OAuth URL is correct (line 13-21)

---

### Issue 2: GHL Shows "Invalid Request" or "App Not Found"

**Symptoms:**
- Redirects to GHL but shows error
- "No integration found with this ID"
- "Invalid OAuth request"

**Check the OAuth URL:**
```javascript
// Should look like this:
https://marketplace.gohighlevel.com/oauth/chooselocation?
  response_type=code&
  redirect_uri=https%3A%2F%2Fapi.realassistagents.com%2Fapi%2Foauth%2Fredirect&
  client_id=69218dacd101d3222ff1708c-mic4vq7j&
  scope=contacts.readonly+contacts.write+...&
  version_id=69218dacd101d3222ff1708c  ← CHECK THIS!
```

**Fix:**
1. Verify `version_id=69218dacd101d3222ff1708c` (client ID prefix)
2. Check `client_id=69218dacd101d3222ff1708c-mic4vq7j`
3. Verify redirect URI matches GHL app settings exactly

---

### Issue 3: Callback Fails (After Approving in GHL)

**Symptoms:**
- User approves permissions in GHL
- Redirects back but shows error
- Gets "404 Not Found"
- Stuck on loading screen

**Check Backend:**
```bash
# Is backend running?
curl http://localhost:3001/api/oauth/test

# Should return:
{
  "success": true,
  "message": "OAuth redirect endpoint is working",
  ...
}
```

**Check Backend Logs:**
```bash
# Start backend with logs visible
cd backend
npm start

# Look for:
🔐 GHL OAuth Redirect received
📤 Exchanging code for access token...
```

**Common Errors:**

**Error:** `No authorization code provided`
**Cause:** GHL didn't send the code
**Fix:** Check OAuth URL parameters

**Error:** `Failed to exchange authorization code`
**Cause:** Invalid client secret or code expired
**Fix:** Check `GHL_CLIENT_SECRET` in `.env`

**Error:** `No users found in database`
**Cause:** Database is empty
**Fix:** Create at least one user account

---

### Issue 4: Token Exchange Fails

**Symptoms:**
- Backend receives code
- Logs show "Exchanging code for access token..."
- Then shows error

**Check:**
```bash
# Backend logs should show:
❌ Error exchanging code for token: [error details]
```

**Common Causes:**

1. **Invalid Client Secret**
```bash
# Check backend/.env
GHL_CLIENT_SECRET=53960ced-8022-4fc7-8641-e39de268aa90
```

2. **Wrong Redirect URI**
```bash
# Must match exactly in:
# - GHL app settings
# - backend/.env
GHL_REDIRECT_URI=https://api.realassistagents.com/api/oauth/redirect
```

3. **Code Already Used**
- OAuth codes are single-use
- If you refresh the callback page, it will fail
- Start over from the beginning

---

### Issue 5: Credentials Not Stored

**Symptoms:**
- OAuth completes successfully
- Redirects back to `/integrations?ghl_connected=true`
- But card still shows "Connect" button

**Check Database:**
```bash
# Run this script
node check-ghl-tables.js

# Check if credentials were inserted
```

**Check Frontend:**
```javascript
// Open browser console (F12)
// Look for API call to:
GET /api/ghl/status

// Should return:
{
  "success": true,
  "connected": true,
  "locationId": "abc123"
}
```

**Fix:**
1. Check database connection
2. Verify `ghl_credentials` table exists
3. Check user ID is correct in backend logs

---

### Issue 6: Frontend Doesn't Show Connected State

**Symptoms:**
- OAuth works, credentials stored
- But frontend still shows "Connect" button
- No "Connected to..." message

**Debug:**
```javascript
// Open browser console (F12)
// Run:
fetch('/api/ghl/status', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(console.log)

// Should return:
// { success: true, connected: true, locationId: "..." }
```

**Common Causes:**

1. **Not Logged In**
- User must be authenticated
- Check `localStorage.getItem('token')` has a value

2. **Wrong User ID**
- OAuth stored credentials for different user
- Check backend logs for user ID

3. **Frontend Cache**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

## Complete Testing Checklist

### Local Testing:

```bash
# 1. Start Backend
cd backend
npm start
# Should see: Server running on port 3001

# 2. Start Frontend (new terminal)
cd frontend
npm start
# Should open: http://localhost:3000

# 3. Navigate to Integrations
# Go to: http://localhost:3000/integrations

# 4. Open Browser Console
# Press F12, go to Console tab

# 5. Click "Connect to GoHighLevel"
# Watch console for errors

# 6. Complete OAuth Flow
# Approve in GHL, wait for redirect

# 7. Check Connection Status
# Should show: "● Connected to [Location]"
```

### Production Testing:

```bash
# 1. Check Backend is Deployed
curl https://api.realassistagents.com/api/oauth/test

# 2. Check Frontend is Deployed
# Visit: https://app.realassistagents.com/integrations

# 3. Check Environment Variables
# Verify in hosting platform:
GHL_CLIENT_ID=69218dacd101d3222ff1708c-mic4vq7j
GHL_CLIENT_SECRET=...
GHL_REDIRECT_URI=https://api.realassistagents.com/api/oauth/redirect
FRONTEND_URL=https://app.realassistagents.com
```

---

## Manual Testing Steps

### Test 1: OAuth URL Generation

```javascript
// In browser console on /integrations page:
document.querySelector('.ghl-connect-btn').getAttribute('onclick')
// Or check the actual redirect URL when clicking
```

### Test 2: Backend OAuth Endpoint

```bash
curl https://api.realassistagents.com/api/oauth/test
# Should return success message
```

### Test 3: Token Exchange (Simulate)

```bash
# Get an auth code from GHL
# Then test exchange:
curl -X POST https://services.leadconnectorhq.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "69218dacd101d3222ff1708c-mic4vq7j",
    "client_secret": "YOUR_SECRET",
    "grant_type": "authorization_code",
    "code": "YOUR_CODE",
    "redirect_uri": "https://api.realassistagents.com/api/oauth/redirect"
  }'
```

### Test 4: Status Check

```bash
# After connecting:
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api.realassistagents.com/api/ghl/status
```

---

## Environment Variables Checklist

### Backend `.env`:
```bash
✅ GHL_CLIENT_ID=69218dacd101d3222ff1708c-mic4vq7j
✅ GHL_CLIENT_SECRET=53960ced-8022-4fc7-8641-e39de268aa90
✅ GHL_REDIRECT_URI=https://api.realassistagents.com/api/oauth/redirect
✅ FRONTEND_URL=https://app.realassistagents.com (or http://localhost:3000)
✅ DATABASE_URL=[your database connection]
```

### Frontend `.env`:
```bash
✅ REACT_APP_API_URL=https://api.realassistagents.com (or http://localhost:3001)
```

---

## GHL Marketplace App Settings

Verify in your GHL app dashboard:

```
✅ App Name: LeadSync
✅ Client ID: 69218dacd101d3222ff1708c-mic4vq7j
✅ Redirect URI: https://api.realassistagents.com/api/oauth/redirect
✅ Scopes:
   - contacts.readonly
   - contacts.write
   - conversations.readonly
   - conversations.write
   - calendars/events.readonly
   - calendars/events.write
   - opportunities.readonly
   - opportunities.write
   - locations.readonly
✅ App Status: Published (or In Development)
```

---

## Quick Debug Commands

```bash
# Check if backend is running
curl http://localhost:3001/api/oauth/test

# Check if OAuth endpoint responds
curl https://api.realassistagents.com/api/oauth/test

# Check GHL connection status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/ghl/status

# Check database for credentials
node check-ghl-tables.js

# View recent git commits
git log --oneline -5
```

---

## Contact Points for Debugging

When you tell me "doesn't work", please provide:

1. **Exact error message** (screenshot if possible)
2. **Browser console errors** (F12 → Console tab)
3. **Backend logs** (if accessible)
4. **Which step fails:**
   - [ ] Button click doesn't redirect
   - [ ] GHL shows error
   - [ ] Callback fails
   - [ ] Token exchange fails
   - [ ] Credentials not stored
   - [ ] Frontend doesn't update

5. **Environment:**
   - [ ] Local (localhost)
   - [ ] Production (realassistagents.com)

6. **What you see vs. what you expect:**
   - Expected: "Connected to My Agency"
   - Actual: "Still shows Connect button"

---

## Emergency Rollback

If OAuth completely breaks, you can rollback:

```bash
# Revert to previous commit
git revert HEAD
git push

# Or restore previous version
git checkout 957fccb  # Commit before OAuth changes
```

---

## Still Stuck?

Provide me with:
1. Screenshot of the error
2. Browser console output (F12)
3. Backend logs (if you have access)
4. URL where it fails

And I'll debug it with you step by step! 🔍
