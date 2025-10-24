const http = require('http');

// Get Client ID from command line or use default
const clientId = process.argv[2] || '70162eec-ef0d-42ed-8364-a2755a1cdab9'; // Test user's client ID
const message = process.argv[3] || 'Hi, I would like to schedule an appointment';

console.log('🧪 Testing GHL Webhook');
console.log('Client ID:', clientId);
console.log('Message:', message);
console.log('');

// Simulate GHL webhook payload
const payload = {
  type: 'InboundMessage',
  message: {
    body: message,
    direction: 'inbound',
    type: 'SMS',
    contactId: 'test-contact-' + Date.now(),
    conversationId: 'test-conv-' + Date.now(),
    messageType: 'SMS'
  },
  contact: {
    id: 'test-contact-' + Date.now(),
    name: 'John Doe',
    phone: '+1234567890',
    email: 'john@example.com',
    tags: ['sales', 'new-lead']
  },
  location: {
    id: 'test-location'
  },
  customData: {
    client_id: clientId
  }
};

const data = JSON.stringify(payload);

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/webhook/ghl',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'x-client-id': clientId
  }
};

console.log('📤 Sending webhook to http://localhost:3001/api/webhook/ghl\n');

const req = http.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log('📥 Response Status:', res.statusCode);
    console.log('📥 Response Headers:', JSON.stringify(res.headers, null, 2));
    console.log('📥 Response Body:', body);

    try {
      const jsonResponse = JSON.parse(body);
      console.log('\n✅ Webhook test completed');
      console.log('Success:', jsonResponse.success);
      console.log('Message:', jsonResponse.message);

      if (!jsonResponse.success) {
        console.log('\n❌ Error:', jsonResponse.error);
      } else {
        console.log('\n💡 Check the backend logs to see the full processing flow');
        console.log('💡 The AI response will be logged in the terminal');
      }
    } catch (e) {
      console.log('\n⚠️  Response is not JSON:', body);
    }

    console.log('\n🔍 You can also check webhook logs at:');
    console.log('   GET http://localhost:3001/api/webhook/logs?clientId=' + clientId);
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
  console.log('\n💡 Make sure the backend server is running on port 3001');
});

req.write(data);
req.end();
