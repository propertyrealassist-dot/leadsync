const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function runTests() {
  console.log('🧪 Running API Tests...\n');

  try {
    // Health check
    console.log('1. Health Check...');
    const health = await axios.get(`${API_URL}/api/health`);
    console.log('✅ Health:', health.data.status);
    console.log('   Environment:', health.data.environment);
    console.log('   Uptime:', Math.floor(health.data.uptime), 'seconds');

    // Register test user
    console.log('\n2. User Registration...');
    const testEmail = `test${Date.now()}@test.com`;
    const register = await axios.post(`${API_URL}/api/auth/register`, {
      email: testEmail,
      password: 'testpassword123',
      name: 'Test User'
    });
    console.log('✅ User registered:', register.data.user.email);

    const token = register.data.token;

    // Get user info
    console.log('\n3. Get User Info...');
    const me = await axios.get(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ User info:', me.data.name);

    // Get strategies
    console.log('\n4. Get Strategies...');
    const strategies = await axios.get(`${API_URL}/api/templates`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Strategies loaded:', strategies.data.length);

    // Get leads
    console.log('\n5. Get Leads...');
    const leads = await axios.get(`${API_URL}/api/leads`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Leads loaded:', leads.data.length);

    // Get analytics
    console.log('\n6. Get Analytics Dashboard...');
    const analytics = await axios.get(`${API_URL}/api/analytics/dashboard?dateRange=30`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Analytics loaded successfully');
    console.log('   Total leads:', analytics.data.leadMetrics.total);

    // Get real-time stats
    console.log('\n7. Get Real-time Stats...');
    const realtime = await axios.get(`${API_URL}/api/analytics/realtime`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Real-time stats loaded');
    console.log('   Today\'s leads:', realtime.data.todayLeads);
    console.log('   Today\'s appointments:', realtime.data.todayAppointments);

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

runTests();
