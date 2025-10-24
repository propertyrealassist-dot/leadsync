# Credentials Setup Checklist

This file tracks the credentials you need to configure for LeadSync to work fully.

## ✅ Already Configured

- [x] **Anthropic Claude API Key** - Already in `.env` file

## 🔑 Need to Add (You Have GHL Access)

### 1. GoHighLevel OAuth Credentials

**Status:** ⏳ TO DO

**Steps:**
1. Log in to your GoHighLevel account
2. Go to **Settings** → **Integrations** → **Custom Apps**
3. Click **Create App** or **Create Custom App**
4. Fill in:
   - **App Name:** LeadSync
   - **Redirect URI:** `http://localhost:3001/api/ghl/auth/callback`
   - **Scopes:** Select these:
     - ✅ calendars.readonly
     - ✅ calendars.write
     - ✅ contacts.readonly
     - ✅ contacts.write
     - ✅ opportunities.readonly (optional)
     - ✅ opportunities.write (optional)
5. Click **Create** or **Save**
6. Copy your credentials:
   - Client ID
   - Client Secret

**Add to backend/.env:**
```env
GHL_CLIENT_ID=paste_your_client_id_here
GHL_CLIENT_SECRET=paste_your_client_secret_here
```

**Location in file:** Lines 12-13 in `backend/.env`

## 📋 Optional Credentials

### 2. Twilio (for SMS Reminders)

**Status:** ⏸️ OPTIONAL (Not needed to start)

**Get from:** https://www.twilio.com/

**Add to backend/.env:**
```env
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

**Location in file:** Lines 8-10 in `backend/.env`

## 🚀 Quick Setup After Adding GHL Credentials

Once you have your GHL Client ID and Secret:

1. **Add them to backend/.env file** (lines 12-13)

2. **Start the backend:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Start the frontend** (in new terminal):
   ```bash
   cd frontend
   npm start
   ```

4. **Open app:** http://localhost:3000

5. **Connect GHL:**
   - Go to Settings
   - Click "Connect to GoHighLevel"
   - Authorize the app
   - Done! ✅

## 🔍 Verify Your Setup

After adding credentials, check:

- [ ] Backend starts without errors
- [ ] Frontend loads successfully
- [ ] Can click "Connect to GoHighLevel" in Settings
- [ ] GHL authorization page opens
- [ ] After authorizing, see "Connected" status
- [ ] Calendars appear in the list
- [ ] Can create a test appointment
- [ ] Appointment appears in GHL calendar

## 🆘 Getting Help

### If GHL Connection Fails:

1. **Double-check credentials:**
   - Client ID is correct (no spaces)
   - Client Secret is correct (no spaces)

2. **Check redirect URI:**
   - Must be exactly: `http://localhost:3001/api/ghl/auth/callback`
   - No trailing slash
   - Must match in both GHL app settings and .env file

3. **Check scopes:**
   - Ensure all calendar and contact scopes are enabled in GHL app

4. **Check GHL app status:**
   - Make sure app is active/approved in GHL

### If Backend Won't Start:

```bash
# Reinstall dependencies
cd backend
rm -rf node_modules
npm install

# Reinitialize database
npm run init-db

# Try starting again
npm run dev
```

## 📝 Current Status of .env File

Your `backend/.env` currently has:

✅ PORT=3001
✅ NODE_ENV=development
✅ DB_PATH=./data/leadsync.db
❌ OPENAI_API_KEY= (not needed)
✅ ANTHROPIC_API_KEY=sk-ant-api03-... (configured!)
✅ USE_MOCK_AI=true (change to false once testing)
❌ TWILIO_ACCOUNT_SID= (optional)
❌ TWILIO_AUTH_TOKEN= (optional)
❌ TWILIO_PHONE_NUMBER= (optional)
⏳ GHL_CLIENT_ID=your_ghl_client_id_here (NEEDS YOUR INPUT)
⏳ GHL_CLIENT_SECRET=your_ghl_client_secret_here (NEEDS YOUR INPUT)
✅ GHL_REDIRECT_URI=http://localhost:3001/api/ghl/auth/callback
✅ FRONTEND_URL=http://localhost:3000

## ⚡ Quick Command Reference

```bash
# Initialize database (first time only)
cd backend && npm run init-db

# Start backend
cd backend && npm run dev

# Start frontend (new terminal)
cd frontend && npm start

# Check backend is running
curl http://localhost:3001/api/health

# Should return:
# {"status":"ok","message":"Leadsync API Server Running","mockAI":true}
```

## 🎯 Your Next Steps

1. **Create GHL OAuth app** (5 minutes)
2. **Copy Client ID and Secret** to backend/.env
3. **Start backend and frontend**
4. **Connect GHL in Settings**
5. **Create your first appointment!** 🎉

---

**Note:** Once you add your GHL credentials and connect, you can start using LeadSync immediately! All the code is ready and working.

The system is fully functional - it just needs your GHL OAuth credentials to enable the integration features.

**Everything else is already done! ✅**
