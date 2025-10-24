# LeadSync - AI-Powered Appointment Scheduling with GoHighLevel Integration

LeadSync is a comprehensive appointment scheduling system with AI-powered conversational booking and seamless GoHighLevel (GHL) integration. Built with React, Node.js, Express, and Claude AI.

## Features

### Core Features
- ✅ **AI-Powered Scheduling** - Conversational appointment booking using Claude AI
- ✅ **GoHighLevel Integration** - Two-way sync with GHL calendars and contacts
- ✅ **Appointment Management** - Full CRUD operations for appointments
- ✅ **Calendar View** - Beautiful appointment dashboard with upcoming appointments
- ✅ **Contact Management** - Automatic contact sync with GHL
- ✅ **Real-time Webhooks** - Instant sync when appointments change in GHL
- ✅ **Reminder System** - SMS and email reminders (infrastructure ready)
- ✅ **Business Hours** - Configure availability and timezone
- ✅ **Multiple Calendars** - Support for multiple GHL calendars

### AI Capabilities
- Natural language understanding for appointment booking
- Automatic date and time extraction
- Contact information collection
- Appointment type identification
- Intelligent time slot suggestions
- Booking confirmation

## Tech Stack

### Backend
- **Node.js** with Express
- **Better-SQLite3** for data storage
- **Anthropic Claude AI** for conversational scheduling
- **Axios** for API requests
- **GoHighLevel API** v2021-07-28

### Frontend
- **React 18** with React Router
- **Axios** for API calls
- **Modern CSS** with responsive design
- Clean, professional UI

## Project Structure

```
leadsync-clone/
├── backend/
│   ├── src/
│   │   ├── database/
│   │   │   ├── init.js           # Database initialization
│   │   │   └── db.js             # Database connection
│   │   ├── routes/
│   │   │   ├── appointments.js    # Appointment CRUD API
│   │   │   ├── ghl.js            # GoHighLevel OAuth & API
│   │   │   ├── webhooks.js       # GHL webhook handlers
│   │   │   ├── conversations.js  # AI conversation API
│   │   │   └── templates.js      # Template management
│   │   ├── services/
│   │   │   ├── ghlService.js     # GHL API service layer
│   │   │   ├── appointmentAI.js  # AI scheduling engine
│   │   │   └── mockAI.js         # Mock AI for testing
│   │   └── server.js             # Express server
│   ├── data/                     # SQLite database
│   ├── .env                      # Environment variables
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Appointments.js    # Appointment dashboard
    │   │   ├── Appointments.css
    │   │   ├── Settings.js        # Settings & integrations
    │   │   ├── Settings.css
    │   │   ├── Dashboard.js       # Main dashboard
    │   │   └── [other components]
    │   ├── App.js                 # Main app component
    │   ├── App.css
    │   └── index.js
    ├── public/
    └── package.json
```

## Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- GoHighLevel account with API access
- Anthropic Claude API key
- (Optional) Twilio account for SMS reminders

### 1. Clone and Install

```bash
# Navigate to project directory
cd leadsync-clone

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

Edit `backend/.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
DB_PATH=./data/leadsync.db

# AI Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
USE_MOCK_AI=false

# GoHighLevel OAuth Configuration
GHL_CLIENT_ID=your_ghl_client_id_here
GHL_CLIENT_SECRET=your_ghl_client_secret_here
GHL_REDIRECT_URI=http://localhost:3001/api/ghl/auth/callback

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Optional: Twilio for SMS reminders
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone
```

### 3. Set Up GoHighLevel OAuth App

1. Log in to your GHL account
2. Go to **Settings > Integrations > Custom Apps**
3. Create a new OAuth app with these settings:
   - **App Name:** LeadSync
   - **Redirect URI:** `http://localhost:3001/api/ghl/auth/callback`
   - **Scopes:**
     - `calendars.readonly`
     - `calendars.write`
     - `contacts.readonly`
     - `contacts.write`
     - `opportunities.readonly`
     - `opportunities.write`
4. Copy the **Client ID** and **Client Secret** to your `.env` file

### 4. Initialize Database

```bash
cd backend
npm run init-db
```

This creates the SQLite database with all required tables.

### 5. Start the Application

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

The application will open at `http://localhost:3000`

## Usage Guide

### 1. Connect GoHighLevel

1. Navigate to **Settings** in the sidebar
2. Click **Connect to GoHighLevel**
3. Log in to your GHL account and authorize the app
4. Select your location
5. You'll be redirected back to LeadSync with a success message

### 2. Configure Calendar Settings

In **Settings**:
- Select your default GHL calendar
- Set business hours (9 AM - 5 PM by default)
- Choose your timezone
- Enable appointment reminders
- Configure auto-sync interval

### 3. Create Appointments

In **Appointments**:
- Click **+ New Appointment**
- Fill in appointment details:
  - Contact name (required)
  - Contact phone/email
  - Appointment title
  - Start and end time
  - Location/notes
- Enable "Sync to GoHighLevel" to create the appointment in GHL
- Select which GHL calendar to use

### 4. Manage Appointments

- View all appointments in the appointments page
- See upcoming appointments in a separate section
- Edit or delete appointments
- Sync appointments from GHL with "Sync from GHL" button
- Appointments sync automatically via webhooks

### 5. AI-Powered Booking (Coming from existing flow)

The AI conversation engine can:
- Extract appointment details from natural language
- Suggest available time slots
- Collect contact information
- Book appointments automatically
- Sync to GHL when ready

### 6. Set Up Webhooks (Optional)

For real-time sync from GHL to LeadSync:

1. In GHL, go to **Settings > Webhooks**
2. Add webhook endpoints:
   - **Calendar Events:** `https://your-domain.com/api/webhooks/ghl/calendar`
   - **Contacts:** `https://your-domain.com/api/webhooks/ghl/contact`
3. Select events to receive:
   - `CalendarEvent.create`
   - `CalendarEvent.update`
   - `CalendarEvent.delete`
   - `Contact.create`
   - `Contact.update`

**Note:** Webhooks require a public URL. For local development, use ngrok:
```bash
ngrok http 3001
```

## API Endpoints

### Appointments
- `GET /api/appointments` - Get all appointments
- `GET /api/appointments/:id` - Get single appointment
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment
- `GET /api/appointments/filter/upcoming` - Get upcoming appointments
- `POST /api/appointments/sync` - Sync appointments from GHL

### GoHighLevel
- `GET /api/ghl/auth/start` - Start OAuth flow
- `GET /api/ghl/auth/callback` - OAuth callback
- `GET /api/ghl/status` - Get connection status
- `POST /api/ghl/disconnect` - Disconnect account
- `GET /api/ghl/calendars` - Get calendars
- `GET /api/ghl/calendars/:id/events` - Get calendar events
- `GET /api/ghl/contacts/search` - Search contacts

### Webhooks
- `POST /api/webhooks/ghl/calendar` - Calendar event webhook
- `POST /api/webhooks/ghl/contact` - Contact webhook
- `GET /api/webhooks/test` - Test webhook endpoint

## Database Schema

### Main Tables
- **appointments** - Appointment records with GHL sync data
- **clients** - Contact/client information
- **ghl_credentials** - GHL OAuth tokens and credentials
- **calendar_settings** - User calendar preferences
- **appointment_reminders** - Scheduled reminders
- **sync_logs** - Sync activity logs

## Features in Detail

### Two-Way Sync
- **LeadSync → GHL:** Appointments created in LeadSync are automatically created in GHL calendars
- **GHL → LeadSync:** Changes in GHL trigger webhooks that update LeadSync in real-time
- Sync status visible on each appointment

### AI Scheduling
- Powered by Anthropic Claude 3.5 Sonnet
- Understands natural language date/time expressions
- Extracts contact information from conversation
- Suggests available time slots based on business hours
- Books appointments when all information is collected

### Reminder System
- Infrastructure ready for SMS and email reminders
- Configurable reminder timing (hours before appointment)
- Linked to appointment records
- Can be enabled/disabled per notification type

## Troubleshooting

### GHL Connection Issues
- Verify Client ID and Secret are correct
- Check that redirect URI matches exactly
- Ensure all required scopes are enabled
- Try disconnecting and reconnecting

### Appointments Not Syncing
- Check GHL connection status in Settings
- Verify calendar is selected
- Check sync logs in database
- Ensure webhook URLs are accessible (if using webhooks)

### Database Issues
```bash
# Reinitialize database
cd backend
rm data/leadsync.db
npm run init-db
```

## Development

### Run Tests
```bash
cd backend
npm test
```

### Build for Production
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm start
```

## Future Enhancements

- [ ] Calendar view with monthly/weekly display
- [ ] Recurring appointments
- [ ] Multiple user support
- [ ] Email templates for reminders
- [ ] SMS reminders via Twilio
- [ ] Advanced availability rules
- [ ] Appointment types with different durations
- [ ] Client portal for self-booking
- [ ] Analytics and reporting
- [ ] Mobile app

## Contributing

This is a demonstration project. Feel free to fork and customize for your needs.

## License

MIT License

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review GHL API documentation
3. Check Anthropic Claude documentation

## Credits

Built with:
- [React](https://reactjs.org/)
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Anthropic Claude AI](https://www.anthropic.com/)
- [GoHighLevel API](https://highlevel.stoplight.io/)
- [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3)

---

**LeadSync** - Simplifying appointment scheduling with AI and automation.
