// Test production login
const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login to production...\n');

    const response = await axios.post('https://api.realassistagents.com/api/auth/login', {
      email: 'kmv736@gmail.com',
      password: 'Jamk52657*'
    });

    console.log('✅ Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Login failed!');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Error Message:', error.message);
  }
}

testLogin();
