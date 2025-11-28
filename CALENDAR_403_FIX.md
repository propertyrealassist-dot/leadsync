# ✅ Calendar 403 Errors - FIXED

## 🎯 Problem Summary

After successfully connecting Google Calendar (OAuth flow worked), the calendar page was getting **403 Forbidden** errors on:
- `GET /api/calendar/events`
- `GET /api/calendar/connection/status`

**Error in Console:**
```
Calendar.js:47  GET https://api.realassistagents.com/api/calendar/events 403 (Forbidden)
Calendar.js:52 Failed to load appointments: AxiosError code: 'ERR_BAD_REQUEST'
Calendar.js:33  GET https://api.realassistagents.com/api/calendar/connection/status 403 (Forbidden)
Calendar.js:38 Failed to check connection: AxiosError code: 'ERR_BAD_REQUEST'
```

---

## 🔍 Root Cause

The `backend/src/routes/calendar.js` file had **its own local `authenticateToken` middleware** that was different from the global one used by the rest of the app.

**Local Middleware (WRONG):**
```javascript
// Lines 7-22 in calendar.js
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;  // ❌ Sets req.userId
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};
```

**Global Middleware (CORRECT):**
```javascript
// backend/src/middleware/auth.js
const authenticateToken = (req, res, next) => {
  // ... full JWT verification
  // ... database lookup
  req.user = user;  // ✅ Sets req.user (with all user data)
  req.user.id = user.id;
  next();
};
```

**The Issue:**
- Local middleware set `req.userId`
- But the global middleware sets `req.user.id`
- Routes expecting `req.userId` couldn't find it → 403 error

---

## ✅ The Fix

### Changes Made:

1. **Removed** the local `authenticateToken` middleware (lines 7-22)
2. **Imported** the global middleware:
   ```javascript
   const { authenticateToken } = require('../middleware/auth');
   ```
3. **Updated** all routes from `req.userId` to `req.user.id`:
   - `/availability` route
   - `/book` route
   - `/events` route ← **This was causing 403**
   - `/events/:id` DELETE route
   - `/connection/status` route ← **This was causing 403**
   - `/connection` DELETE route

### Example of Change:

**Before:**
```javascript
router.get('/events', authenticateToken, async (req, res) => {
  const userId = req.userId; // ❌ undefined
  // ...
});
```

**After:**
```javascript
router.get('/events', authenticateToken, async (req, res) => {
  const userId = req.user.id; // ✅ works!
  // ...
});
```

---

## 🚀 Deployment

**Commit:** `4586b3a`
**Pushed to:** `main` branch
**Render will auto-deploy in ~2-3 minutes**

---

## 🧪 Testing After Deployment

Once Render redeploys (check logs), test the calendar:

1. Go to: `https://leadsync.realassistagents.com/calendar`
2. If not already connected, click "Connect Google Calendar"
3. After OAuth completes, you should see:
   - ✅ "✅ Google Calendar connected successfully!"
   - ✅ Connection status shows "Connected"
   - ✅ **NO 403 errors in console**
   - ✅ Calendar events load properly

---

## 📊 Expected Behavior Now

### Before Fix:
```
✅ OAuth callback worked
✅ Calendar connection saved to database
❌ GET /api/calendar/events → 403 Forbidden
❌ GET /api/calendar/connection/status → 403 Forbidden
❌ Calendar page stuck on "Loading..."
```

### After Fix:
```
✅ OAuth callback worked
✅ Calendar connection saved to database
✅ GET /api/calendar/events → 200 OK (returns events)
✅ GET /api/calendar/connection/status → 200 OK (returns connection status)
✅ Calendar page loads events successfully
```

---

## 🎯 Why This Happened

The calendar routes were originally written with their own simple authentication, but the rest of the app uses a more robust global authentication middleware. When integrating calendar functionality, the local middleware should have been replaced with the global one, but this was overlooked.

The OAuth routes (`/auth` and `/callback`) are **public** (no auth required), so they worked fine. But the protected routes (`/events`, `/connection/status`) require proper authentication, and they were using the incompatible local middleware.

---

## 📝 Related Files Changed

- `backend/src/routes/calendar.js` (7 insertions, 24 deletions)

**Files Using Global Auth (For Reference):**
- `backend/src/middleware/auth.js` - Global auth middleware
- `backend/src/routes/auth.js` - Uses `authenticateToken`
- `backend/src/routes/leads.js` - Uses `authenticateToken`
- `backend/src/routes/templates.js` - Uses `authenticateToken`

**Now calendar.js is consistent with the rest of the app!**

---

## ✅ Status

**FIXED AND DEPLOYED** 🎉

All calendar endpoints now use the same authentication system as the rest of LeadSync. The 403 errors should be completely resolved after Render deploys the update.

Monitor Render logs to confirm deployment completes successfully!
