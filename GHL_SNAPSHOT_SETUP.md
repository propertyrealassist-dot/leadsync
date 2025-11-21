# 🚀 GoHighLevel Integration - Super Simple Setup

## Total Time: 5 Minutes | NO Developer Account Needed!

---

## ✅ Step 1: Get Your LeadSync Client ID (1 minute)

1. Go to https://leadsync.realassistagents.com
2. Log in to your account
3. Click **"Integrations"** in the sidebar
4. Find the **"Client ID"** card
5. Click the 👁️ eye icon to show your Client ID
6. Click **"Copy Client ID"** button
7. **SAVE IT** - you'll need it in Step 3!

---

## ✅ Step 2: Import the Snapshot into GHL (2 minutes)

### Option A: Use the Snapshot Link (Easiest)
1. Click this link: **https://api.realassistagents.com/public/ghl-snapshot-template.json**
2. Copy the entire JSON content
3. In GHL: **Settings** → **Snapshots** → **Import**
4. Click **"Import from URL"** or paste the JSON
5. Click **"Import"**
6. Wait for it to finish (30-60 seconds)

### Option B: Download and Upload
1. Go to LeadSync **Integrations** page
2. Click **"View Snapshot"** button
3. Save the JSON file to your computer
4. In GHL: **Settings** → **Snapshots** → **Import**
5. Upload the file
6. Click **"Import"**

---

## ✅ Step 3: Configure Your Client ID in GHL (2 minutes)

This is the MOST IMPORTANT step!

1. In GHL, go to **Settings** → **Custom Values**
2. Find **"LeadSync Client ID"** (should be near the top)
3. **Paste your Client ID** from Step 1
4. Click **"Save"**

That's it! Your LeadSync is now connected to GHL! 🎉

---

## ✅ Step 4: Test It! (1 minute - Optional but Recommended)

1. In GHL, go to **Contacts**
2. Create a test contact or pick an existing one
3. Add the tag **"AI Connected"** to that contact
4. Send an SMS to your GHL number from that contact's phone
5. Within 5-10 seconds, you should get an AI response!

---

## 🎯 What You Just Got:

After importing the snapshot, you automatically have:

### ✅ Workflows:
- **LeadSync / Trigger AI** - Automatically responds to all inbound messages (SMS, Facebook, Instagram, GMB, Email)
- **LeadSync / Connect To AI** - Initializes new contacts when you add the "AI Connected" tag

### ✅ Custom Fields (Automatically Created):
- **Turn_AI_OFF_ON** - Toggle AI on/off per contact
- **LeadSync_Status** - Track AI status (Active/Paused/Completed)
- **AI_Error_Message** - See if anything went wrong
- **Last_AI_Response_Date** - When AI last responded
- **AI_Conversation_Count** - How many AI interactions per contact

### ✅ Tags (Automatically Created):
- **AI Active** - Contact is being handled by AI
- **AI Error Encountered** - Something went wrong (check the custom field for details)
- **AI Paused** - AI responses temporarily stopped
- **Booking Requested** - Contact wants to book an appointment
- **AI Connected** - Contact is connected to LeadSync

### ✅ Smart Features:
- **Error Handling** - If AI fails, sends friendly fallback message
- **Booking Detection** - Detects when someone wants to book and notifies your team
- **Individual Control** - Turn AI on/off for specific contacts
- **Multi-Channel** - Works with SMS, Facebook Messenger, Instagram DM, GMB messages, Email

---

## 🔥 How to Use It:

### For Existing Contacts:
Just add the **"AI Connected"** tag to any contact, and they're ready!

### For New Leads:
1. When a new lead comes in, add the **"AI Connected"** tag
2. AI will automatically handle all their messages
3. Watch the **AI_Conversation_Count** increase as they chat

### To Pause AI for a Contact:
1. Edit the contact
2. Change **Turn_AI_OFF_ON** custom field to **"OFF"**
3. AI will stop responding to that contact

### To Stop AI Permanently:
1. Edit the contact
2. Change **LeadSync_Status** to **"Paused"** or **"Completed"**
3. Remove the **"AI Active"** tag

---

## 🛠️ Troubleshooting:

### AI Not Responding?

**Check #1: Is the workflow activated?**
- Go to **Automation** → **Workflows**
- Find **"LeadSync / Trigger AI"**
- Make sure it says **"Active"** (green)

**Check #2: Is your Client ID configured?**
- Go to **Settings** → **Custom Values**
- Verify **"LeadSync Client ID"** has your actual Client ID
- If empty, paste it again and save

**Check #3: Is the contact set up correctly?**
- Check if **"AI Connected"** tag is applied
- Check if **Turn_AI_OFF_ON** is set to **"ON"** (or empty)
- Check if **LeadSync_Status** is **"Active"** (or empty)

**Check #4: Look for errors**
- On the contact, look for **"AI Error Encountered"** tag
- Check the **AI_Error_Message** custom field
- This will tell you exactly what went wrong

### Still Not Working?

1. **Test the webhook directly**:
   - Go to LeadSync **Integrations** page
   - Scroll to **"GHL Webhook Testing"** section (if available)
   - Try sending a test message

2. **Check workflow execution logs**:
   - Go to **Automation** → **Workflows**
   - Open **"LeadSync / Trigger AI"**
   - Click **"Executions"** tab
   - Look for recent runs and any errors

3. **Verify the webhook URL**:
   - Should be: `https://api.realassistagents.com/api/webhook/ghl`
   - Check in workflow action settings

---

## 🎓 Pro Tips:

### Tip #1: Bulk Enable AI
Want to enable AI for many contacts at once?
1. Go to **Contacts** → **Smart Lists**
2. Create a filter for your target contacts
3. Select all → **Bulk Actions** → **Add Tag** → **"AI Connected"**
4. Done! All contacts will now be handled by AI

### Tip #2: Monitor Performance
Create a **Smart List** to track AI performance:
- Filter by tag: **"AI Active"**
- Sort by: **Last_AI_Response_Date** (most recent first)
- Add column: **AI_Conversation_Count**
- Now you can see which contacts are most engaged!

### Tip #3: Find Errors Quickly
Create a **Smart List** for errors:
- Filter by tag: **"AI Error Encountered"**
- Add column: **AI_Error_Message**
- Check this list daily to fix any issues

### Tip #4: Priority Leads
When AI detects booking intent:
- Contact automatically gets **"Booking Requested"** tag
- Your team gets an email notification
- Create a pipeline view filtered by this tag
- Never miss a hot lead!

---

## 📊 What Gets Tracked:

Every time AI interacts with a contact, LeadSync logs:
- ✅ Full conversation history
- ✅ Qualification answers
- ✅ Lead scores (if you set up qualification questions)
- ✅ Booking requests
- ✅ Response times
- ✅ Error details

View all this in your LeadSync dashboard:
- **Conversations** → See all AI chats
- **Leads** → See qualified leads with scores
- **Appointments** → See booking requests
- **Analytics** → See performance metrics

---

## 🔒 Security:

- Your Client ID is **NOT** sensitive like an API key
- It's safe to use in webhooks
- LeadSync validates it server-side
- No one can access your data with just the Client ID
- You can regenerate it anytime from LeadSync settings

---

## ✅ You're Done!

That's literally it. You now have a **fully automated AI agent** handling all your GHL conversations!

### What Happens Now:

1. When someone messages your GHL number → **AI responds automatically**
2. When you tag a contact **"AI Connected"** → **AI starts handling them**
3. When AI detects booking intent → **Your team gets notified**
4. When there's an error → **AI sends a friendly fallback message**

**No more manual responses. No more missed leads. Just pure automation.** 🚀

---

## Need Help?

- **LeadSync Dashboard**: https://leadsync.realassistagents.com
- **Integration Status**: Check the Integrations page
- **Conversation Logs**: Check Conversations page
- **Webhook Logs**: Available in Integrations → View Logs

---

**Created by LeadSync** | https://realassistagents.com
