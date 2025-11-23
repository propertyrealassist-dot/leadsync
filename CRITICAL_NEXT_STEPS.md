# ✅ CRITICAL NEXT STEPS - Configuration Complete!

## 🎉 What I Just Configured

I've successfully updated your `backend/.env` file with:

### ✅ Google Calendar OAuth Credentials
- **Client ID**: `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com`
- **Client Secret**: `YOUR_GOOGLE_CLIENT_SECRET`
- **Redirect URI**: `http://localhost:3001/api/calendar/callback`

### ✅ GoHighLevel (GHL) OAuth Credentials
- **Client ID**: `YOUR_GHL_CLIENT_ID`
- **Client Secret**: `YOUR_GHL_CLIENT_SECRET`
- **Shared Secret**: `YOUR_GHL_SHARED_SECRET`
- **Redirect URI**: `https://api.realassistagents.com/api/oauth/redirect`

---

## 🚨 IMPORTANT: Update Google Cloud Console

**You MUST add the redirect URI to Google Cloud Console or the calendar won't connect!**

### Steps:

1. **Go to Google Cloud Console Credentials:**
   - https://console.cloud.google.com/apis/credentials?project=leadsync-calendar-479120

2. **Click on your OAuth 2.0 Client ID:**
   - Find: `605910537114-qd4600dbuuqmor0mqc5iumpanmko1n2v.apps.googleusercontent.com`
   - Click to edit it

3. **Add Authorized Redirect URI:**
   - Under "Authorized redirect URIs", click **"+ ADD URI"**
   - Add: `http://localhost:3001/api/calendar/callback`
   - Click **"SAVE"**

4. **Optional - For Production:**
   - If you're deploying to production, also add:
   - `https://api.realassistagents.com/api/calendar/callback`
   - Click **"SAVE"**

---

## 🔄 Restart Your Backend Server

**The backend server MUST be restarted for the new credentials to load!**

### If running locally:

```bash
# Stop your current backend server (Ctrl+C)
cd backend
npm start
```

### If running on Render.com or other hosting:

The server should auto-restart when you push changes, OR manually restart from your hosting dashboard.

---

## 🧪 Test the Calendar Integration

### Step 1: Start Your Application

1. Make sure backend is running on `http://localhost:3001`
2. Make sure frontend is running on `http://localhost:3000`

### Step 2: Connect Google Calendar

1. Open LeadSync in your browser
2. Login to your account
3. Navigate to the **Calendar** page (sidebar menu)
4. Click **"Connect Google Calendar"** button
5. You should be redirected to Google OAuth page
6. Sign in with your Google account
7. Click **"Allow"** to grant permissions
8. You should be redirected back to LeadSync

### Step 3: Verify Connection

After authorizing:
- ✅ Calendar page should show "Manage your appointments and availability"
- ✅ You should see your Google Calendar events
- ✅ Try creating a test appointment to verify it syncs

---

## 🧪 Test the GHL Integration

### Verify GHL OAuth Flow:

1. Navigate to **Settings** or **Integrations** page
2. Click **"Connect GoHighLevel"**
3. You should be redirected to GHL authorization page
4. Select a location and authorize
5. You should be redirected back to: `https://api.realassistagent.com/api/oauth/redirect`

**Note:** Make sure your GHL app in the marketplace has the redirect URI set to:
- `https://api.realassistagents.com/api/oauth/redirect`

---

## 🔍 Troubleshooting

### Google Calendar: "redirect_uri_mismatch" Error

**Solution:**
- This means the redirect URI in Google Cloud Console doesn't match
- Double-check you added `http://localhost:3001/api/calendar/callback` EXACTLY
- Make sure you clicked "SAVE" in Google Cloud Console
- Clear your browser cache and try again

### Google Calendar: "Failed to connect calendar. Please try again."

**Possible causes:**
1. Backend server not restarted → Restart it
2. Redirect URI not added to Google Cloud → Add it (see above)
3. Check backend logs for detailed error message

### GHL: "Invalid redirect_uri"

**Solution:**
- Go to your GHL app settings in the marketplace
- Verify redirect URI is: `https://api.realassistagents.com/api/oauth/redirect`
- Make sure it matches EXACTLY (including https://)

### Backend Won't Start

**Check for errors:**
```bash
cd backend
npm start
```

Common issues:
- Port 3001 already in use → Kill existing process or use different port
- Database connection error → Check DATABASE_URL in .env
- Missing dependencies → Run `npm install`

---

## 📋 Configuration Summary

All credentials are now stored in: `backend/.env`

**Environment Variables Set:**
- ✅ `GOOGLE_CLIENT_ID`
- ✅ `GOOGLE_CLIENT_SECRET`
- ✅ `GOOGLE_REDIRECT_URI`
- ✅ `GHL_CLIENT_ID`
- ✅ `GHL_CLIENT_SECRET`
- ✅ `GHL_SHARED_SECRET`
- ✅ `GHL_REDIRECT_URI`

**Database:** CockroachDB (PostgreSQL)
- ✅ Connected and running

**AI Provider:** Groq
- ✅ Configured

---

## 🚀 Next Actions Checklist

- [ ] Add redirect URI to Google Cloud Console (CRITICAL!)
- [ ] Restart backend server
- [ ] Test Google Calendar connection
- [ ] Test GHL OAuth flow
- [ ] Create a test appointment
- [ ] Verify appointment appears in Google Calendar
- [ ] Check webhook logs in database

---

## 📞 Need Help?

If you encounter any issues:

1. **Check backend logs** - They will show detailed error messages
2. **Check browser console** (F12) - Shows frontend errors
3. **Review the setup guides:**
   - `GOOGLE_CALENDAR_SETUP.md` - Detailed Google Calendar setup
   - `GHL_SETUP_GUIDE.md` - GoHighLevel integration guide
   - `WEBHOOK_SETUP.md` - Webhook configuration

---

## 🎯 What's Working Now

After completing the steps above, you'll have:

✅ **Google Calendar Integration**
- Users can connect their Google Calendar
- Appointments automatically sync to Google Calendar
- Available time slots are calculated from Calendar
- Video conferencing links (Google Meet) auto-generated

✅ **GoHighLevel Integration**
- OAuth connection to GHL accounts
- Access to GHL contacts, calendars, and opportunities
- Webhook support for real-time updates
- Lead sync between LeadSync and GHL

✅ **AI-Powered Features**
- AI conversation handling (via Groq)
- Lead qualification and scoring
- Automated follow-ups
- Smart appointment scheduling

---

**Everything is configured! Just add the redirect URI to Google Cloud Console and restart your backend!** 🚀
