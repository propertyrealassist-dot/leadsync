/**
 * Calendar Routes - Placeholder
 *
 * This file is a placeholder for calendar API routes.
 * The full Google Calendar routes implementation is available in:
 * - backend/src/routes/calendar.js
 *
 * Planned routes:
 * - GET /api/calendar/auth - Start OAuth flow
 * - GET /api/calendar/callback - OAuth callback handler
 * - GET /api/calendar/availability - Get available slots
 * - POST /api/calendar/book - Book appointment
 * - GET /api/calendar/events - List appointments
 * - DELETE /api/calendar/events/:id - Cancel appointment
 */

const express = require('express');
const router = express.Router();

// Placeholder route
router.get('/status', (req, res) => {
  res.json({
    message: 'Calendar routes placeholder',
    note: 'Full implementation available in backend/src/routes/calendar.js'
  });
});

module.exports = router;
