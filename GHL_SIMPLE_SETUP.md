# GoHighLevel Simple Setup Guide (No Developer Account Needed!)

## ✅ Quick Setup - 5 Minutes

You **DON'T** need a GHL developer account! Just use your normal GHL location access token.

---

## Step 1: Get Your GHL Location ID (1 minute)

### Method 1: From URL (Easiest)
1. Log into your GoHighLevel account
2. Look at the URL in your browser
3. It will look like: `https://app.gohighlevel.com/location/XXXXX...`
4. The `XXXXX...` part is your **Location ID**
5. Copy it - you'll need it in Step 3

### Method 2: From Settings
1. Go to **Settings** → **Business Profile**
2. Look for **Location ID** field
3. Copy the value

---

## Step 2: Get Your GHL Access Token (2 minutes)

### Option A: From Company Settings (Recommended)
1. In GHL, click on your **Company Name** (top left)
2. Go to **Settings** → **Integrations**
3. Look for **API Key** or **Access Token** section
4. Click **Generate New Token** or **Show Token**
5. Copy the token (it's a long string of random characters)

### Option B: From Location Settings
1. Go to **Settings** → **Business Profile**
2. Scroll to **API** section
3. Copy your **API Key** or **Access Token**

⚠️ **Important**: Keep this token secret! It's like a password.

---

## Step 3: Connect to LeadSync (2 minutes)

1. Go to https://leadsync.realassistagents.com
2. Log in to your LeadSync account
3. Go to **Integrations** page
4. Find the **GoHighLevel Integration** card
5. Click **"Connect GHL Account"** button
6. Enter:
   - **GHL Location ID**: (from Step 1)
   - **GHL Access Token**: (from Step 2)
7. Click **"Connect"**
8. You should see green "Connected" status!

---

## Step 4: Setup Webhook for AI Responses (Optional but Recommended)

### Quick Method - Import Snapshot:
1. In LeadSync Integrations page, click **"View Snapshot"**
2. Download the JSON file
3. In GHL: **Settings** → **Snapshots** → **Import**
4. Upload the JSON file
5. Done! Workflow is ready.

### Manual Method:
1. In GHL, go to **Automations** → **Workflows**
2. Create new workflow: "LeadSync AI Chat"
3. **Trigger**: Inbound Message (SMS, Facebook, Instagram, GMB)
4. **Action**: Webhook
   - **URL**: `https://leadsync.realassistagents.com/api/webhook/ghl`
   - **Method**: POST
   - **Headers**:
     ```
     Content-Type: application/json
     x-client-id: YOUR_LEADSYNC_CLIENT_ID
     ```
   - **Body** (copy this exactly):
     ```json
     {
       "message": {
         "body": "{{message.body}}",
         "contactId": "{{contact.id}}",
         "conversationId": "{{conversation.id}}"
       },
       "contact": {
         "id": "{{contact.id}}",
         "name": "{{contact.name}}",
         "phone": "{{contact.phone}}",
         "email": "{{contact.email}}",
         "tags": "{{contact.tags}}"
       }
     }
     ```
5. Save webhook response as: `ai_response`
6. Add condition:
   - If `ai_response.success == true`
   - Then send SMS: `{{ai_response.message}}`
7. Save and activate workflow

---

## Where to Find Your LeadSync Client ID

1. In LeadSync, go to **Integrations** page
2. Find **Client ID** card
3. Click eye icon to show
4. Click **"Copy Client ID"** button

---

## Test It!

1. Create an AI strategy in LeadSync with some questions
2. Tag a GHL contact with matching tag
3. Send SMS to that contact
4. GHL workflow triggers → calls LeadSync webhook
5. LeadSync AI responds → sent back to contact
6. Check LeadSync **Conversations** to see the chat!

---

## Troubleshooting

### "Invalid access token or location ID"
- Double-check you copied the full token (no spaces)
- Make sure Location ID matches your current GHL location
- Try regenerating the token in GHL

### Webhook not working
- Verify Client ID in webhook headers matches your LeadSync Client ID
- Check webhook URL is exactly: `https://leadsync.realassistagents.com/api/webhook/ghl`
- Ensure workflow is activated in GHL

### Can't find Access Token in GHL
- Some GHL accounts call it "API Key" instead of "Access Token"
- Look in: Settings → Integrations → API
- Or contact GHL support to enable API access

---

## What You Can Do Once Connected

✅ **AI Conversations** - Auto-respond to GHL messages with AI
✅ **Calendar Sync** - View GHL appointments in LeadSync
✅ **Contact Management** - Search and create GHL contacts
✅ **Lead Qualification** - AI qualifies leads based on your questions
✅ **Opportunity Tracking** - Create deals in GHL pipelines
✅ **Multi-Channel** - Works with SMS, Facebook, Instagram, GMB

---

## Security Notes

- Your Access Token is stored encrypted in our database
- We never share your token with third parties
- You can disconnect anytime from Integrations page
- LeadSync only accesses data you explicitly allow

---

## Still Having Issues?

1. Check LeadSync webhook logs: Integrations → View Logs
2. Check GHL workflow execution logs
3. Make sure your GHL account has API access enabled
4. Contact support with error messages

---

**That's it! No developer account needed. Just your normal GHL credentials.** 🎉
