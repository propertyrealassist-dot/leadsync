/**
 * Calendar API Test Script
 * Run this to test the calendar endpoints (requires valid JWT token)
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token from login

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testCalendarAPI() {
  console.log('🧪 Testing LeadSync Calendar API\n');

  try {
    // Test 1: Check connection status
    console.log('1️⃣  Checking calendar connection status...');
    const statusRes = await api.get('/calendar/connection/status');
    console.log('✅ Status:', statusRes.data);
    console.log();

    // Test 2: Get auth URL (if not connected)
    if (!statusRes.data.connected) {
      console.log('2️⃣  Getting authorization URL...');
      const authRes = await api.get('/calendar/auth');
      console.log('✅ Auth URL:', authRes.data.authUrl);
      console.log('📌 Visit this URL in your browser to connect Google Calendar');
      console.log();
      return; // Stop here until user completes OAuth
    }

    // Test 3: Get available slots
    console.log('3️⃣  Fetching available time slots...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const availabilityRes = await api.get('/calendar/availability', {
      params: {
        startDate: tomorrow.toISOString(),
        endDate: nextWeek.toISOString(),
        duration: 30,
        workingHoursStart: 9,
        workingHoursEnd: 17
      }
    });
    console.log(`✅ Found ${availabilityRes.data.count} available slots`);
    console.log('First 5 slots:', availabilityRes.data.availableSlots.slice(0, 5));
    console.log();

    // Test 4: Book an appointment (using first available slot)
    if (availabilityRes.data.availableSlots.length > 0) {
      console.log('4️⃣  Booking test appointment...');
      const firstSlot = availabilityRes.data.availableSlots[0];

      const bookingRes = await api.post('/calendar/book', {
        startTime: firstSlot.start,
        endTime: firstSlot.end,
        summary: 'Test Appointment - LeadSync',
        description: 'This is a test booking from the Calendar API',
        attendeeEmail: 'test@example.com',
        attendeeName: 'Test User',
        timeZone: 'America/New_York',
        includeVideoConference: true
      });
      console.log('✅ Appointment booked:', bookingRes.data.appointment);
      console.log('📧 Meeting link:', bookingRes.data.appointment.meetingLink);
      console.log();

      // Store event ID for cancellation test
      const eventId = bookingRes.data.appointment.id;

      // Test 5: List appointments
      console.log('5️⃣  Listing upcoming appointments...');
      const eventsRes = await api.get('/calendar/events', {
        params: {
          maxResults: 10,
          startDate: new Date().toISOString()
        }
      });
      console.log(`✅ Found ${eventsRes.data.count} upcoming appointments`);
      console.log();

      // Test 6: Cancel the test appointment
      console.log('6️⃣  Cancelling test appointment...');
      const cancelRes = await api.delete(`/calendar/events/${eventId}`);
      console.log('✅ Appointment cancelled:', cancelRes.data.message);
      console.log();
    }

    console.log('🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n⚠️  Please update JWT_TOKEN in this file with a valid token');
    }
  }
}

// Run tests
testCalendarAPI();
