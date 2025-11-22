const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');
const { db } = require('../config/database');

// Get comprehensive analytics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { dateRange = 30 } = req.query;
    const analytics = await analyticsService.getAnalytics(
      db,
      req.user.id,
      parseInt(dateRange)
    );

    // Ensure all required fields exist with defaults
    const safeAnalytics = {
      leadMetrics: analytics?.leadMetrics || { total: 0, new: 0, contacted: 0, qualified: 0, won: 0 },
      conversionRates: analytics?.conversionRates || { leadToAppointment: 0, contactedToQualified: 0, qualifiedToWon: 0 },
      leadSources: analytics?.leadSources || [],
      overTime: analytics?.overTime || [],
      appointments: analytics?.appointments || { total: 0, completed: 0, pending: 0 },
      conversations: analytics?.conversations || { totalMessages: 0, avgPerConversation: 0 },
      strategyPerformance: analytics?.strategyPerformance || []
    };

    res.json(safeAnalytics);
  } catch (error) {
    console.error('Analytics error:', error);
    // Return empty analytics instead of error
    res.json({
      leadMetrics: { total: 0, new: 0, contacted: 0, qualified: 0, won: 0 },
      conversionRates: { leadToAppointment: 0, contactedToQualified: 0, qualifiedToWon: 0 },
      leadSources: [],
      overTime: [],
      appointments: { total: 0, completed: 0, pending: 0 },
      conversations: { totalMessages: 0, avgPerConversation: 0 },
      strategyPerformance: []
    });
  }
});

// Get real-time stats
router.get('/realtime', authenticateToken, async (req, res) => {
  try {
    const stats = await analyticsService.getRealTimeStats(db, req.user.id);
    res.json(stats || { todayLeads: 0, todayAppointments: 0, pendingLeads: 0 });
  } catch (error) {
    console.error('Real-time stats error:', error);
    res.json({ todayLeads: 0, todayAppointments: 0, pendingLeads: 0 });
  }
});

module.exports = router;
