# 🚨 IMMEDIATE FIX: Calendar OAuth Redirecting to Localhost

## ⚡ The Problem

When users connect Google Calendar on production, they get redirected back to:
```
http://localhost:3000/calendar ❌
```

Instead of:
```
https://leadsync.realassistagents.com/calendar ✅
```

---

## ✅ The Solution (2 Steps)

### Step 1: Set Environment Variable on Render

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Find your backend service** (the API)
3. **Click "Environment"** tab
4. **Add Environment Variable**:
   ```
   Key:   FRONTEND_URL
   Value: https://leadsync.realassistagents.com
   ```
5. **Click "Save Changes"**
6. **Wait 2-3 minutes** for Render to redeploy

### Step 2: Add Production Redirect URI to Google Cloud

1. **Go to Google Cloud Console**: https://console.cloud.google.com/apis/credentials?project=leadsync-calendar-479120
2. **Click your OAuth 2.0 Client ID**
3. **Under "Authorized redirect URIs", add**:
   ```
   https://api.realassistagents.com/api/calendar/callback
   ```
4. **Click "SAVE"**

---

## 🎯 Why This Works

The backend code already uses the environment variable:

```javascript
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
res.redirect(`${frontendUrl}/calendar?calendar_connected=true`);
```

**Currently:** `FRONTEND_URL` is not set on Render, so it uses the fallback `localhost:3000` ❌

**After fix:** `FRONTEND_URL` will be `https://leadsync.realassistagents.com` ✅

---

## 🧪 Test After Fix

1. Go to: https://leadsync.realassistagents.com/calendar
2. Click "Connect Google Calendar"
3. Authorize on Google
4. **Should redirect to**: `https://leadsync.realassistagents.com/calendar?calendar_connected=true` ✅
5. **Should see**: "✅ Google Calendar connected successfully!"

---

## 📋 Quick Checklist

- [ ] Go to Render Dashboard
- [ ] Open backend service → Environment tab
- [ ] Add `FRONTEND_URL=https://leadsync.realassistagents.com`
- [ ] Save and wait for redeploy (~2-3 mins)
- [ ] Go to Google Cloud Console
- [ ] Add production redirect URI
- [ ] Save
- [ ] Test calendar connection on production

---

## 🔍 Other Environment Variables to Check

While you're in Render's Environment tab, make sure these are also set:

```
GOOGLE_REDIRECT_URI=https://api.realassistagents.com/api/calendar/callback
GHL_REDIRECT_URI=https://api.realassistagents.com/api/oauth/redirect
DATABASE_URL=(your CockroachDB connection string)
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GHL_CLIENT_ID=YOUR_GHL_CLIENT_ID
GHL_CLIENT_SECRET=YOUR_GHL_CLIENT_SECRET
NODE_ENV=production
DB_TYPE=postgres
AI_PROVIDER=groq
```

See **RENDER_ENVIRONMENT_SETUP.md** for complete list.

---

## 🎉 That's It!

**The code is already correct - you just need to set the environment variable!**

After setting `FRONTEND_URL` on Render, the calendar OAuth will work perfectly! 🚀
