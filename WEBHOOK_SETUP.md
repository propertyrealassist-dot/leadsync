# GHL Webhook Integration - Complete Guide

## 🎯 Overview

The webhook system receives incoming messages from GoHighLevel (GHL), processes them with Claude AI based on your configured strategies, and sends intelligent responses back to your contacts.

---

## 📋 System Architecture

```
GHL Contact → GHL Webhook → Your Server → Claude AI → Response → GHL Contact
                    ↓
              Authentication
                    ↓
              Find Strategy
                    ↓
              Process Message
                    ↓
              Store in DB
```

---

## 🚀 Quick Start

### 1. **Restart Backend** (Required after setup)
```bash
cd backend
npm start
```

### 2. **Create Test User** (Already done)
```bash
cd backend
node src/database/create-test-user.js
```

Output:
```
📧 Email:        test@example.com
🔒 Password:     password123
🆔 Client ID:    70162eec-ef0d-42ed-8364-a2755a1cdab9
🔑 API Key:      ak_live_xxxxx...
```

### 3. **Create AI Strategy** (Already done)
```bash
cd backend
node create-sample-strategy.js
```

### 4. **Test Webhook**
```bash
cd backend
node test-webhook.js <CLIENT_ID> "Your test message"
```

Example:
```bash
node test-webhook.js 70162eec-ef0d-42ed-8364-a2755a1cdab9 "I need a plumber"
```

---

## 📡 Webhook Endpoints

### **POST /api/webhook/ghl**
Main webhook endpoint for receiving GHL messages.

**Authentication:**
- Client ID in `x-client-id` header (recommended)
- OR Client ID in request body: `client_id` or `customData.client_id`

**Request Example:**
```json
{
  "type": "InboundMessage",
  "message": {
    "body": "Hi, I need help with scheduling",
    "direction": "inbound",
    "type": "SMS",
    "contactId": "contact-123",
    "conversationId": "conv-456"
  },
  "contact": {
    "id": "contact-123",
    "name": "John Doe",
    "phone": "+1234567890",
    "tags": ["sales", "new-lead"]
  },
  "customData": {
    "client_id": "your-client-id-here"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook received and processing"
}
```

**Status Codes:**
- `200` - Webhook received successfully
- `401` - Invalid or missing Client ID
- `500` - Processing error

---

### **POST /api/webhook/test**
Test endpoint for simulating webhooks without GHL.

**Request:**
```json
{
  "clientId": "your-client-id",
  "message": "Test message",
  "contactName": "Test User",
  "contactPhone": "+1234567890",
  "tag": "sales"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test webhook processed",
  "result": {
    "response": "AI generated response...",
    "strategy": "Sales Assistant",
    "conversationId": "conv-xxx"
  },
  "simulatedPayload": { ... }
}
```

---

### **GET /api/webhook/logs**
View webhook processing logs.

**Query Parameters:**
- `clientId` (optional) - Filter by Client ID
- `limit` (optional) - Number of logs to return (default: 50)

**Example:**
```
GET /api/webhook/logs?clientId=your-client-id&limit=20
```

**Response:**
```json
{
  "success": true,
  "count": 15,
  "logs": [
    {
      "id": 1,
      "client_id": "xxx",
      "endpoint": "/api/webhook/ghl",
      "status_code": 200,
      "processing_time_ms": 1250,
      "matched_template_id": "strategy-id",
      "created_at": "2025-10-24T12:00:00Z"
    }
  ]
}
```

---

## 🔧 Configuration

### **GoHighLevel Setup**

1. **Login to GHL**
2. **Go to Settings → Integrations → Webhooks**
3. **Create New Webhook:**
   - **URL:** `https://yourdomain.com/api/webhook/ghl`
   - **Events:** Select "Inbound Message" or "SMS Received"
   - **Headers:** Add `x-client-id` with your Client ID

4. **Custom Field (Alternative):**
   - Add Client ID to webhook payload in GHL workflow
   - Include in `customData.client_id`

---

## 🤖 AI Strategy Matching

The system matches incoming messages to AI strategies using **contact tags**:

1. **Extract tags** from GHL contact
2. **Find strategy** with matching tag
3. **Use strategy configuration:**
   - Prompt template
   - Tone and style
   - FAQs
   - Call-to-action
   - Temperature setting

**Example:**
- Contact has tag: `sales`
- System finds strategy with `tag = "sales"`
- Processes message using that strategy

**Default Behavior:**
- If no tag matches, uses first available strategy
- If no strategies exist, sends default response

---

## 📊 Database Tables Used

### **webhook_logs**
Stores all incoming and outgoing webhooks:
```sql
- id
- user_id
- client_id
- endpoint
- method
- payload (JSON)
- headers (JSON)
- status_code
- response_body (JSON)
- processing_time_ms
- error_message
- matched_template_id
- created_conversation_id
- created_at
```

### **conversations**
Stores ongoing conversations:
```sql
- id
- user_id
- template_id (strategy)
- contact_name
- contact_phone
- status
- started_at
- last_message_at
```

### **messages**
Stores individual messages:
```sql
- id
- conversation_id
- sender (contact/bot)
- content
- timestamp
```

---

## 🔒 Authentication Flow

```
1. Webhook Received
   ↓
2. Extract Client ID (header or body)
   ↓
3. Query users table: WHERE client_id = ? AND account_status = 'active'
   ↓
4. If found → Process
   If not → Return 401
```

---

## ⚡ Processing Flow

```
1. Receive webhook → Log to database
   ↓
2. Return 200 OK immediately (< 100ms)
   ↓
3. Process asynchronously:
   a. Extract message data
   b. Find user by Client ID
   c. Find strategy by tag
   d. Get conversation history
   e. Build AI prompt
   f. Call Claude AI
   g. Store AI response
   h. Send to GHL (if credentials exist)
   i. Update webhook log
```

---

## 🎛️ AI Prompt Building

The system builds prompts using strategy configuration:

```javascript
You are an AI assistant for ABC Home Services.

OBJECTIVE: Qualify the lead and schedule an appointment

TONE: Friendly and Professional

CONTEXT: We provide plumbing, electrical, and HVAC services.

CONVERSATION HISTORY:
Customer: Hi, I need help
You: Hello! How can I assist you today?

CURRENT MESSAGE FROM John Doe:
I need a plumber to fix a leak

Please respond appropriately based on context.
When appropriate, guide the conversation towards: Schedule an appointment
```

---

## 🔄 GHL Response Sending

### **With GHL Credentials:**
```javascript
POST https://rest.gohighlevel.com/v1/conversations/{conversationId}/messages
Headers: {
  Authorization: Bearer {access_token}
}
Body: {
  type: "SMS",
  message: "AI response...",
  contactId: "contact-id"
}
```

### **Without GHL Credentials:**
- Response logged but not sent
- Shows in webhook logs
- Can be used for testing

---

## 🐛 Error Handling

### **Invalid Client ID (401)**
```json
{
  "success": false,
  "error": "Invalid Client ID"
}
```

### **No Matching Strategy**
- Uses default response
- Logs warning in webhook_logs
- Still returns 200 OK

### **AI API Error**
- Sends fallback message
- Logs error details
- Returns 200 OK to GHL

### **GHL Send Error**
- Message stored but not sent
- Error logged
- Processing continues

---

## 🧪 Testing Scenarios

### **Test 1: Basic Message**
```bash
node test-webhook.js <CLIENT_ID> "Hello"
```

### **Test 2: Appointment Request**
```bash
node test-webhook.js <CLIENT_ID> "I need to schedule an appointment"
```

### **Test 3: Question**
```bash
node test-webhook.js <CLIENT_ID> "What services do you offer?"
```

### **Test 4: Invalid Client ID**
```bash
node test-webhook.js "invalid-id" "Test message"
```

### **Test 5: Via Test Endpoint**
```bash
curl -X POST http://localhost:3001/api/webhook/test \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "your-client-id",
    "message": "Test message",
    "tag": "sales"
  }'
```

---

## 📈 Monitoring

### **Check Logs:**
```bash
# View recent logs
curl http://localhost:3001/api/webhook/logs

# View logs for specific user
curl http://localhost:3001/api/webhook/logs?clientId=your-client-id

# View limited logs
curl http://localhost:3001/api/webhook/logs?limit=10
```

### **Backend Console:**
Watch for these log messages:
```
🔔 GHL Webhook received
✅ User authenticated: user@example.com
✅ Found strategy: Sales Assistant
🤖 Sending to Claude AI...
✅ AI Response: ...
📤 Sending message to GHL...
✅ Message sent to GHL
```

---

## 🚨 Troubleshooting

### **404 Error**
- **Cause:** Server not running or routes not registered
- **Fix:** Restart backend server

### **401 Unauthorized**
- **Cause:** Invalid or missing Client ID
- **Fix:** Check Client ID in request

### **No AI Response**
- **Cause:** No strategy configured
- **Fix:** Create a strategy for the user

### **Message Not Sent to GHL**
- **Cause:** No GHL credentials
- **Fix:** Connect GHL account or use test mode

---

## 🎯 Production Deployment

1. **Set Environment Variables:**
```env
NODE_ENV=production
GHL_CLIENT_ID=your_ghl_client_id
GHL_CLIENT_SECRET=your_ghl_client_secret
ANTHROPIC_API_KEY=your_claude_api_key
```

2. **Use HTTPS:**
   - GHL requires HTTPS for webhooks
   - Use reverse proxy (nginx/Apache)
   - Or use service like ngrok for testing

3. **Set Up Domain:**
   - Point domain to your server
   - Configure SSL certificate
   - Update GHL webhook URL

4. **Monitor Logs:**
   - Set up log aggregation
   - Monitor webhook_logs table
   - Set up alerts for errors

---

## 📚 API Reference

All endpoints are documented in this guide. For more details:
- Main webhook: `/api/webhook/ghl`
- Test endpoint: `/api/webhook/test`
- Logs endpoint: `/api/webhook/logs`

---

## ✅ Checklist

- [x] User created with Client ID
- [x] AI Strategy created with tag
- [x] Backend server running
- [x] Test webhook successful
- [ ] GHL webhook configured
- [ ] Production domain set up
- [ ] SSL certificate installed
- [ ] Monitoring enabled

---

## 🎉 You're Ready!

The webhook system is now fully operational. Test thoroughly before connecting to GHL production workflows.

**Need Help?**
- Check `/api/webhook/logs` for debugging
- Review backend console logs
- Test with `/api/webhook/test` endpoint
