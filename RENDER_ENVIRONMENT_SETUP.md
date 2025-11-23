# 🚀 Render Production Environment Variables Setup

## 🎯 Critical Environment Variables for Production

Your backend is deployed on Render, but it needs the correct environment variables to work properly!

---

## ⚠️ THE PROBLEM

The calendar OAuth callback is redirecting to `localhost:3000` instead of your production URL because the `FRONTEND_URL` environment variable isn't set on Render.

**Current behavior:**
```javascript
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
res.redirect(`${frontendUrl}/calendar?calendar_connected=true`);
```

Since `FRONTEND_URL` isn't set on Render, it falls back to `localhost:3000` ❌

---

## ✅ THE FIX: Set Environment Variables on Render

### Step 1: Go to Your Render Dashboard

1. Open: https://dashboard.render.com/
2. Find your **backend service** (API server)
3. Click on it

### Step 2: Add Environment Variables

1. Click **"Environment"** tab on the left
2. Click **"Add Environment Variable"**
3. Add these variables:

---

## 🔐 Required Environment Variables

### 1. Frontend URL
```
Key:   FRONTEND_URL
Value: https://leadsync.realassistagents.com
```
**Why:** OAuth callbacks need to redirect to your production frontend

### 2. Google Calendar Redirect URI
```
Key:   GOOGLE_REDIRECT_URI
Value: https://api.realassistagents.com/api/calendar/callback
```
**Why:** Google OAuth needs the production callback URL

### 3. GHL Redirect URI (Already Set)
```
Key:   GHL_REDIRECT_URI
Value: https://api.realassistagents.com/api/oauth/redirect
```
**Why:** GoHighLevel OAuth callback

### 4. Database URL (Should Already Be Set)
```
Key:   DATABASE_URL
Value: postgresql://leadsync:RYUN2rpGsOPvDArZidoMVg@spicy-egret-18515.j77.aws-us-east-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
```

### 5. Google Calendar Credentials (Should Already Be Set)
```
Key:   GOOGLE_CLIENT_ID
Value: YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com

Key:   GOOGLE_CLIENT_SECRET
Value: YOUR_GOOGLE_CLIENT_SECRET
```

### 6. GHL Credentials (Should Already Be Set)
```
Key:   GHL_CLIENT_ID
Value: YOUR_GHL_CLIENT_ID

Key:   GHL_CLIENT_SECRET
Value: YOUR_GHL_CLIENT_SECRET

Key:   GHL_SHARED_SECRET
Value: YOUR_GHL_SHARED_SECRET
```

### 7. JWT Secret (Should Already Be Set)
```
Key:   JWT_SECRET
Value: your-super-secret-jwt-key-change-this-in-production
```

### 8. AI Provider Settings (Should Already Be Set)
```
Key:   AI_PROVIDER
Value: groq

Key:   GROQ_API_KEY
Value: YOUR_GROQ_API_KEY
```

### 9. Node Environment
```
Key:   NODE_ENV
Value: production
```

---

## 📋 Environment Variables Checklist

After adding all variables, you should have:

- [x] `FRONTEND_URL` = `https://leadsync.realassistagents.com`
- [x] `GOOGLE_REDIRECT_URI` = `https://api.realassistagents.com/api/calendar/callback`
- [x] `GHL_REDIRECT_URI` = `https://api.realassistagents.com/api/oauth/redirect`
- [x] `DATABASE_URL` = (Your CockroachDB connection string)
- [x] `GOOGLE_CLIENT_ID` = (Your Google OAuth client ID)
- [x] `GOOGLE_CLIENT_SECRET` = (Your Google OAuth secret)
- [x] `GHL_CLIENT_ID` = (Your GHL app client ID)
- [x] `GHL_CLIENT_SECRET` = (Your GHL app secret)
- [x] `GHL_SHARED_SECRET` = (Your GHL shared secret)
- [x] `JWT_SECRET` = (Your JWT secret key)
- [x] `AI_PROVIDER` = `groq`
- [x] `GROQ_API_KEY` = (Your Groq API key)
- [x] `NODE_ENV` = `production`
- [x] `DB_TYPE` = `postgres`
- [x] `PORT` = `3001` (optional, Render sets this automatically)

---

## 🔄 After Adding Variables

### Render Will Automatically:
1. Restart your backend service
2. Load the new environment variables
3. The calendar OAuth callback will now redirect to the correct production URL!

**Wait ~2-3 minutes for the deployment to complete.**

---

## 🧪 Testing After Update

### 1. Test Calendar OAuth
1. Go to: https://leadsync.realassistagents.com/calendar
2. Click "Connect Google Calendar"
3. Authorize on Google
4. **Should redirect back to**: `https://leadsync.realassistagents.com/calendar?calendar_connected=true` ✅
5. **NOT**: `http://localhost:3000/calendar` ❌

### 2. Test GHL OAuth
1. Go to: https://leadsync.realassistagents.com/integrations
2. Click "Connect to GoHighLevel"
3. Authorize and select location
4. **Should redirect to**: `https://api.realassistagents.com/api/oauth/redirect`
5. Then back to: `https://leadsync.realassistagents.com/settings?ghl_connected=true`

---

## 🎯 Quick Reference: Where Each URL Is Used

### Backend URLs (api.realassistagents.com)
- **GHL OAuth Callback**: `https://api.realassistagents.com/api/oauth/redirect`
- **Calendar OAuth Callback**: `https://api.realassistagents.com/api/calendar/callback`
- **API Endpoints**: `https://api.realassistagents.com/api/*`

### Frontend URLs (leadsync.realassistagents.com)
- **App Home**: `https://leadsync.realassistagents.com`
- **Calendar Page**: `https://leadsync.realassistagents.com/calendar`
- **Settings Page**: `https://leadsync.realassistagents.com/settings`
- **Integrations**: `https://leadsync.realassistagents.com/integrations`

---

## 🔐 Google Cloud Console Updates

After setting environment variables, also update Google Cloud Console:

### Add Production Redirect URI
1. Go to: https://console.cloud.google.com/apis/credentials?project=leadsync-calendar-479120
2. Click your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", make sure you have:
   - ✅ `http://localhost:3001/api/calendar/callback` (for local dev)
   - ✅ `https://api.realassistagents.com/api/calendar/callback` (for production)
4. Click **"SAVE"**

---

## 📊 How to Verify Environment Variables Are Set

### Option 1: Check Render Dashboard
1. Go to your service on Render
2. Click "Environment" tab
3. Should see all variables listed

### Option 2: Check Backend Logs
After deployment, check Render logs. You should see:
```
✅ Environment loaded successfully
FRONTEND_URL: https://leadsync.realassistagents.com
GOOGLE_REDIRECT_URI: https://api.realassistagents.com/api/calendar/callback
Database: postgres
```

### Option 3: Test Endpoint
Create a test endpoint (optional):
```javascript
// backend/src/server.js
app.get('/api/config/check', (req, res) => {
  res.json({
    frontendUrl: process.env.FRONTEND_URL,
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
    ghlRedirectUri: process.env.GHL_REDIRECT_URI,
    nodeEnv: process.env.NODE_ENV
  });
});
```

Then visit: `https://api.realassistagents.com/api/config/check`

---

## 🚨 Security Notes

1. **Never commit `.env` files** to GitHub
2. **Keep secrets secure** - Only set them in Render dashboard
3. **Rotate secrets periodically** - Especially JWT_SECRET and API keys
4. **Use different secrets** for dev and production

---

## 🎉 That's It!

Once you set `FRONTEND_URL=https://leadsync.realassistagents.com` on Render:

✅ Calendar OAuth will redirect to production frontend
✅ GHL OAuth will work correctly
✅ All integrations will function properly

**Just add the environment variable and wait for Render to redeploy!** 🚀
