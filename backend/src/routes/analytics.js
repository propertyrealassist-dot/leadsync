const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');
const { db } = require('../config/database');

// Get comprehensive analytics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { dateRange = 30 } = req.query;
    const analytics = analyticsService.getAnalytics(
      db,
      req.user.id,
      parseInt(dateRange)
    );
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

// Get real-time stats
router.get('/realtime', authenticateToken, async (req, res) => {
  try {
    const stats = analyticsService.getRealTimeStats(db, req.user.id);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Real-time stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

module.exports = router;
