# GHL Snapshot Import Guide

## 🎯 Overview

This guide will help you import the LeadSync AI Chat automation workflow into your GoHighLevel account. Once imported, your GHL contacts will automatically receive AI-powered responses powered by Claude AI.

---

## 📋 Prerequisites

Before importing the snapshot, ensure you have:

- ✅ Active GoHighLevel account (Agency or Sub-Account)
- ✅ LeadSync account with Client ID and API Key
- ✅ At least one AI Strategy configured in LeadSync
- ✅ Your LeadSync backend deployed and accessible via HTTPS

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Download the Snapshot Template

1. **Login to LeadSync**
2. **Go to Settings** page
3. **Click "Download GHL Snapshot"** button
4. **Save** `ghl-snapshot-template.json` to your computer

### Step 2: Get Your Client ID

1. **In LeadSync Settings**, locate your **Client ID**
2. **Click "Copy"** button next to Client ID
3. **Keep this handy** - you'll need it in Step 4

Example Client ID format:
```
70162eec-ef0d-42ed-8364-a2755a1cdab9
```

### Step 3: Import Snapshot into GHL

#### Option A: Via GHL Dashboard (Recommended)

1. **Login to GoHighLevel**
2. **Navigate to:** Settings → Snapshots
3. **Click:** "Import Snapshot"
4. **Upload:** Select `ghl-snapshot-template.json`
5. **Click:** "Import"
6. **Wait** for import to complete (30-60 seconds)

#### Option B: Via Direct Workflow Creation

If snapshot import is not available in your GHL plan:

1. **Navigate to:** Automations → Workflows
2. **Click:** "Create Workflow"
3. **Manually configure** using the settings below

---

## 🔧 Configure the Workflow

### Step 4: Update Webhook URL

1. **Open the imported workflow:** "LeadSync AI Chat"
2. **Find Action 1:** "Send to LeadSync AI"
3. **Verify the webhook URL is set to:**
   ```
   https://api.realassistagents.com/api/webhook/ghl
   ```

   This should be pre-configured in the snapshot template. If you need to change it:
   - Go to Settings → Custom Values
   - Update "LeadSync Webhook URL"

### Step 5: Add Your Client ID

**Method 1: Custom Field (Recommended)**

1. **In the workflow**, find **Custom Data section**
2. **Add custom field:**
   - **Key:** `client_id`
   - **Value:** Paste your Client ID from Step 2
3. **Save** the workflow

**Method 2: Webhook Header**

1. **In Action 1 (Webhook)**, find **Headers section**
2. **Update header:**
   ```
   x-client-id: YOUR-CLIENT-ID-HERE
   ```
3. **Save** the workflow

### Step 6: Configure Trigger

1. **Trigger Type:** Inbound Message
2. **Message Types:** Select all that apply:
   - ☑ SMS
   - ☑ Facebook Messenger
   - ☑ Instagram DM
   - ☑ Google Business Messages
3. **Direction:** Inbound only
4. **Save** trigger settings

### Step 7: Activate Workflow

1. **Toggle** the workflow to **ACTIVE**
2. **Verify** status shows "Running"

---

## 🧪 Testing Your Integration

### Test 1: Send Test SMS

1. **From your mobile phone**, send an SMS to your GHL number
2. **Message:** "Hi, I need help with scheduling"
3. **Expected result:**
   - You receive an AI-powered response within 2-5 seconds
   - Response is personalized based on your AI Strategy

### Test 2: Check LeadSync Logs

1. **Login to LeadSync**
2. **Navigate to:** Settings → API Logs (or view backend logs)
3. **Verify:**
   - ✅ Webhook received
   - ✅ User authenticated
   - ✅ Strategy matched
   - ✅ AI response generated

### Test 3: View GHL Logs

1. **In GHL**, go to: Automations → Workflows → LeadSync AI Chat
2. **Click:** "Logs" or "History"
3. **Verify:**
   - ✅ Workflow triggered
   - ✅ Webhook sent successfully (200 OK)
   - ✅ Message sent to contact

---

## 📊 Workflow Breakdown

### How It Works:

```
Inbound SMS → GHL Receives → Trigger Workflow → Send to LeadSync
                                                          ↓
                                                   Authenticate User
                                                          ↓
                                                   Match AI Strategy
                                                          ↓
                                                   Process with Claude AI
                                                          ↓
                                                   Generate Response
                                                          ↓
                                                   Return to GHL
                                                          ↓
Send AI Response to Contact ← Workflow Action 3 ← Success?
```

### Workflow Actions:

**Action 1: Send to LeadSync AI**
- Type: Webhook POST
- URL: `https://api.realassistagents.com/api/webhook/ghl`
- Headers: Client ID and API Key for authentication
- Body: Contact info, message, tags
- Response: Saved as `ai_response`

**Action 2: Check AI Response**
- Type: Conditional logic
- Condition: `ai_response.success == true`
- If True → Action 3
- If False → Action 4

**Action 3: Send AI Response**
- Type: Send Message
- Message: `{{ai_response.message}}`
- Recipient: Original contact
- Channel: Same as inbound (SMS/FB/etc)

**Action 4: Send Fallback (Error Handler)**
- Type: Send Message
- Message: "Thank you for your message! We'll get back to you shortly."
- Only triggers if webhook fails

---

## 🎨 Customization Options

### Option 1: Tag-Based Routing

Create multiple workflows for different contact segments:

1. **Sales Leads Workflow**
   - Trigger: Inbound message + Contact has tag "sales"
   - Uses AI Strategy with tag "sales"

2. **Support Requests Workflow**
   - Trigger: Inbound message + Contact has tag "support"
   - Uses AI Strategy with tag "support"

3. **Appointment Reminders Workflow**
   - Trigger: Inbound message + Contact has tag "appointment"
   - Uses AI Strategy with tag "appointment"

### Option 2: Time-Based Filters

Add time-based conditions:

1. **Business Hours Only**
   - Add condition: Time between 9 AM - 5 PM
   - Outside hours → Send "We're closed" message

2. **Weekend Response**
   - Add condition: Day is Saturday or Sunday
   - Use different AI Strategy for weekend inquiries

### Option 3: Multi-Language Support

Configure language detection:

1. **Add custom field:** `preferred_language`
2. **Route to language-specific AI Strategy**
3. **Claude AI responds in detected language**

---

## 🔒 Security Best Practices

### 1. Protect Your Client ID

- ✅ **Never share** your Client ID publicly
- ✅ **Use environment variables** in GHL custom values
- ✅ **Rotate** your API key if compromised (Settings → Regenerate)

### 2. Use HTTPS Only

- ✅ **Always use HTTPS** for webhook URL
- ❌ **Never use HTTP** - GHL may reject insecure webhooks

### 3. Whitelist GHL IPs (Optional)

If you want extra security, whitelist GHL webhook IPs:
```
52.90.176.0/20
54.208.0.0/16
```

### 4. Monitor Webhook Logs

Regularly check:
- ✅ Unauthorized access attempts
- ✅ Unusual traffic patterns
- ✅ Failed authentication logs

---

## 🐛 Troubleshooting

### Problem 1: Workflow Not Triggering

**Symptoms:**
- Inbound SMS received but workflow doesn't start

**Solutions:**
1. ✅ Check workflow is **ACTIVE** (not paused)
2. ✅ Verify trigger conditions match (SMS type, direction)
3. ✅ Check if contact has required tags (if using tag filters)
4. ✅ View GHL workflow logs for errors

### Problem 2: Webhook Returns 401 Unauthorized

**Symptoms:**
- Workflow logs show "401 Unauthorized" error
- No AI response sent

**Solutions:**
1. ✅ Verify Client ID is correct (copy from LeadSync Settings)
2. ✅ Check Client ID is in webhook headers OR body
3. ✅ Ensure your LeadSync account is active
4. ✅ Check LeadSync backend logs for authentication errors

### Problem 3: No AI Response Received

**Symptoms:**
- Webhook succeeds (200 OK) but no AI message sent
- Fallback message sent instead

**Solutions:**
1. ✅ Check you have AI Strategies configured in LeadSync
2. ✅ Verify contact tags match your AI Strategy tags
3. ✅ Check Claude API key is valid (LeadSync backend logs)
4. ✅ Verify you have Claude API credits remaining

### Problem 4: Response Too Slow

**Symptoms:**
- AI response takes more than 10 seconds
- Sometimes times out

**Solutions:**
1. ✅ Check your LeadSync backend response time in logs
2. ✅ Verify Claude API is responding quickly (should be < 2s)
3. ✅ Increase GHL webhook timeout to 30 seconds
4. ✅ Consider adding a "typing indicator" action before webhook

### Problem 5: Wrong AI Strategy Used

**Symptoms:**
- AI response doesn't match expected strategy
- Generic responses instead of specialized

**Solutions:**
1. ✅ Verify contact has correct tags in GHL
2. ✅ Check tag matching in LeadSync AI Strategies
3. ✅ Review LeadSync logs to see which strategy was matched
4. ✅ Ensure tag names match exactly (case-sensitive)

---

## 📈 Advanced Configuration

### Add Typing Indicator

Make conversations feel more natural:

1. **Add Action 1.5** (between webhook and response):
   - Type: Delay
   - Duration: 2 seconds
   - OR Type: Send Typing Indicator

### Multiple Response Messages

Split long AI responses:

1. **Add condition:** Check response length
2. **If > 160 characters:**
   - Split into multiple SMS messages
   - Send with 1-second delays

### Tag Contacts Based on Intent

Automatically tag contacts:

1. **Add Action 5:**
   - Type: Add Tag
   - Tag: Based on AI response intent
   - Example: If response mentions "booking" → Add tag "ready-to-book"

### Escalate to Human

Let AI hand off to human:

1. **Add condition:** Check for keywords like "speak to human"
2. **If detected:**
   - Stop AI workflow
   - Assign conversation to user
   - Send notification to team

---

## 📊 Monitoring & Analytics

### Track Performance

**In GHL:**
- Workflow execution count
- Success vs failure rate
- Average response time

**In LeadSync:**
- View webhook logs: `/api/webhook/logs`
- Check conversation history
- Monitor AI response quality

### Key Metrics to Watch

1. **Response Rate:** % of inbound messages that got AI reply
2. **Response Time:** Average time from message → AI reply
3. **Success Rate:** % of webhooks that succeeded
4. **Conversation Conversion:** % that led to booking/qualified lead

---

## 🔄 Updates & Maintenance

### Updating the Workflow

When LeadSync releases updates:

1. **Download new snapshot** from Settings
2. **Export your current workflow** (backup)
3. **Import new snapshot**
4. **Reconfigure** Client ID and webhook URL
5. **Test** before activating

### Regenerating API Key

If you regenerate your LeadSync API key:

1. **Old Client ID remains the same** (no changes needed)
2. **API Key changes** (only needed for API calls, not webhooks)
3. **No workflow updates required**

---

## 💡 Best Practices

### 1. Start with One Workflow

- ✅ Test with one simple workflow first
- ✅ Verify end-to-end flow works
- ❌ Don't create 10 workflows immediately

### 2. Use Descriptive Names

- ✅ "LeadSync AI - Sales Leads"
- ✅ "LeadSync AI - Support (Business Hours)"
- ❌ "Workflow 1", "Test Workflow"

### 3. Monitor Initially

First week:
- ✅ Check logs daily
- ✅ Review AI responses for quality
- ✅ Adjust AI Strategies as needed

### 4. Train Your AI Strategies

- ✅ Add FAQs based on common questions
- ✅ Update company information regularly
- ✅ Refine tone and objectives
- ✅ Test temperature settings (0.3-0.9)

### 5. Have a Backup Plan

- ✅ Always have fallback message action
- ✅ Set up error notifications
- ✅ Monitor for webhook failures

---

## 📞 Support

### Need Help?

**LeadSync Support:**
- 📧 Email: support@realassistagents.com
- 📖 Docs: https://api.realassistagents.com/public/SNAPSHOT_IMPORT_GUIDE.md
- 🌐 Website: https://realassistagents.com

**GHL Support:**
- 📖 GHL Docs: https://help.gohighlevel.com
- 💬 GHL Community: https://www.facebook.com/groups/gohighlevel

---

## ✅ Post-Import Checklist

After importing and configuring, verify:

- [ ] Snapshot imported successfully
- [ ] Webhook URL set to production (https://api.realassistagents.com/api/webhook/ghl)
- [ ] Client ID and API Key configured in Custom Values
- [ ] Trigger set to Inbound Message
- [ ] All message types selected (SMS, FB, etc)
- [ ] Workflow is ACTIVE
- [ ] Test SMS sent and AI response received
- [ ] LeadSync logs show successful webhook
- [ ] GHL logs show successful workflow execution
- [ ] Fallback message action configured
- [ ] Error notifications set up (optional)

---

## 🎉 You're All Set!

Your LeadSync AI Chat automation is now live! Your GHL contacts will automatically receive intelligent, context-aware responses powered by Claude AI.

**What's Next?**
1. Monitor performance for the first week
2. Refine your AI Strategies based on real conversations
3. Create additional workflows for different segments
4. Explore advanced features like escalation and tagging

**Happy Automating!** 🚀
