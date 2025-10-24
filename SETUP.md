# Quick Setup Guide for LeadSync

## Prerequisites Checklist
- [ ] Node.js 16+ installed
- [ ] GoHighLevel account with admin access
- [ ] Anthropic Claude API key
- [ ] GHL OAuth app created

## 5-Minute Setup

### Step 1: Install Dependencies (2 minutes)

```bash
# Backend
cd backend
npm install

# Frontend (in new terminal)
cd frontend
npm install
```

### Step 2: Configure GHL OAuth App (2 minutes)

1. Go to GHL: **Settings → Integrations → Custom Apps**
2. Click **Create App**
3. Fill in:
   - **Name:** LeadSync
   - **Redirect URI:** `http://localhost:3001/api/ghl/auth/callback`
   - **Scopes:** Select all calendar and contact scopes
4. Copy **Client ID** and **Client Secret**

### Step 3: Update .env File (1 minute)

Edit `backend/.env`:

```env
# Add your keys here:
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
GHL_CLIENT_ID=your_client_id_here
GHL_CLIENT_SECRET=your_client_secret_here

# Optional: Turn off mock AI to use real Claude
USE_MOCK_AI=false
```

### Step 4: Initialize Database

```bash
cd backend
npm run init-db
```

### Step 5: Start the App

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

## First Steps After Launch

1. **Open** http://localhost:3000
2. **Navigate to Settings** (⚙️ in sidebar)
3. **Click "Connect to GoHighLevel"**
4. **Authorize** the app in GHL
5. **Select** your default calendar
6. **Save settings**

## Test Your Setup

### Test 1: Check GHL Connection
- Go to Settings
- Should see "Connected to GoHighLevel" with green indicator
- Should see your calendars listed

### Test 2: Create Test Appointment
- Go to Appointments
- Click "+ New Appointment"
- Fill in test data
- Enable "Sync to GoHighLevel"
- Select calendar
- Submit

### Test 3: Verify Sync
- Check GHL calendar for the appointment
- Edit the appointment in GHL
- Webhook should update LeadSync (if configured)

## Common Setup Issues

### Issue: "Cannot find module"
```bash
# Solution: Reinstall dependencies
cd backend
rm -rf node_modules
npm install
```

### Issue: Database error
```bash
# Solution: Reinitialize database
cd backend
rm data/leadsync.db
npm run init-db
```

### Issue: GHL connection fails
- Check Client ID and Secret are correct
- Verify redirect URI matches exactly: `http://localhost:3001/api/ghl/auth/callback`
- Ensure all required scopes are enabled in GHL app

### Issue: Port already in use
```bash
# Change port in backend/.env
PORT=3002

# Change frontend port: Create frontend/.env
PORT=3001
```

## API Keys You Need

1. **Anthropic Claude API Key**
   - Get from: https://console.anthropic.com/
   - Free tier available
   - Used for AI scheduling

2. **GoHighLevel OAuth Credentials**
   - Get from: GHL Settings → Integrations → Custom Apps
   - Free with GHL account
   - Required for calendar sync

3. **Twilio (Optional)**
   - Get from: https://www.twilio.com/
   - Only needed for SMS reminders
   - Can skip initially

## Verify Everything Works

Run this checklist:

- [ ] Backend runs without errors (http://localhost:3001/api/health)
- [ ] Frontend loads (http://localhost:3000)
- [ ] Can navigate to all pages
- [ ] GHL connection successful
- [ ] Can create an appointment
- [ ] Appointment appears in GHL
- [ ] Can see appointments in LeadSync

## Next Steps

Once setup is complete:

1. **Configure Calendar Settings**
   - Set business hours
   - Choose timezone
   - Enable reminders

2. **Import Existing Appointments**
   - Go to Appointments
   - Click "Sync from GHL"
   - Select your calendar

3. **Test AI Scheduling**
   - Use the conversation features
   - Test appointment booking flow

4. **Set Up Webhooks (Optional)**
   - Use ngrok for local development
   - Configure webhooks in GHL
   - Test real-time sync

## Need Help?

- Check README.md for detailed documentation
- Review troubleshooting section
- Check GHL API docs: https://highlevel.stoplight.io/

## Production Deployment

When ready to deploy:

1. Update .env with production URLs
2. Set up proper database (PostgreSQL recommended)
3. Configure HTTPS for webhooks
4. Update GHL OAuth redirect URI
5. Deploy backend and frontend separately
6. Set up monitoring and logging

---

You're all set! Start scheduling appointments with AI-powered automation! 🚀
