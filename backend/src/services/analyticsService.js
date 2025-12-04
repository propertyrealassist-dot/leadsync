class AnalyticsService {
  // Get comprehensive analytics
  getAnalytics(db, userId, dateRange = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);
    const startDateStr = startDate.toISOString();

    // Lead metrics
    const leadMetrics = db.prepare(`
      SELECT
        COUNT(*) as total_leads,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_leads,
        SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted_leads,
        SUM(CASE WHEN status = 'qualified' THEN 1 ELSE 0 END) as qualified_leads,
        SUM(CASE WHEN status = 'interested' THEN 1 ELSE 0 END) as interested_leads,
        SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_leads,
        SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_leads
      FROM leads
      WHERE user_id = ? AND created_at >= ?
    `).get(userId, startDateStr);

    // Conversion rate
    const conversionRate = leadMetrics.total_leads > 0
      ? ((leadMetrics.won_leads / leadMetrics.total_leads) * 100).toFixed(1)
      : 0;

    // Lead sources
    const leadSources = db.prepare(`
      SELECT source, COUNT(*) as count
      FROM leads
      WHERE user_id = ? AND created_at >= ?
      GROUP BY source
      ORDER BY count DESC
    `).all(userId, startDateStr);

    // Leads over time (daily)
    const leadsOverTime = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM leads
      WHERE user_id = ? AND created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(userId, startDateStr);

    // Appointment metrics
    const appointmentMetrics = db.prepare(`
      SELECT
        COUNT(*) as total_appointments,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM appointments
      WHERE user_id = ? AND created_at >= ?
    `).get(userId, startDateStr);

    // AI conversation metrics
    const conversationMetrics = db.prepare(`
      SELECT
        COUNT(DISTINCT CASE WHEN message_count > 0 THEN id END) as leads_with_conversations,
        AVG(CASE WHEN message_count > 0 THEN message_count END) as avg_messages_per_lead
      FROM leads
      WHERE user_id = ? AND created_at >= ?
    `).get(userId, startDateStr);

    // Strategy performance
    const strategyPerformance = db.prepare(`
      SELECT
        t.id,
        t.name,
        COUNT(l.id) as lead_count,
        SUM(CASE WHEN l.status = 'won' THEN 1 ELSE 0 END) as conversions
      FROM templates t
      LEFT JOIN leads l ON t.id = l.template_id AND l.created_at >= ?
      WHERE t.user_id = ?
      GROUP BY t.id, t.name
      HAVING COUNT(l.id) > 0
      ORDER BY COUNT(l.id) DESC
      LIMIT 5
    `).all(startDateStr, userId);

    // Recent activity
    const recentActivity = db.prepare(`
      SELECT
        'lead' as type,
        id,
        name as title,
        created_at as timestamp
      FROM leads
      WHERE user_id = ?
      UNION ALL
      SELECT
        'appointment' as type,
        id,
        contact_name as title,
        created_at as timestamp
      FROM appointments
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT 10
    `).all(userId, userId);

    return {
      leadMetrics: {
        ...leadMetrics,
        conversionRate: parseFloat(conversionRate)
      },
      appointmentMetrics: appointmentMetrics || {
        total_appointments: 0,
        scheduled: 0,
        completed: 0,
        cancelled: 0
      },
      conversationMetrics: {
        leads_with_conversations: conversationMetrics.leads_with_conversations || 0,
        avg_messages_per_lead: conversationMetrics.avg_messages_per_lead || 0
      },
      leadSources,
      leadsOverTime,
      strategyPerformance,
      recentActivity,
      dateRange
    };
  }

  // Get real-time stats
  getRealTimeStats(db, userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM leads WHERE user_id = ? AND created_at >= ?) as leads_today,
        (SELECT COUNT(*) FROM appointments WHERE user_id = ? AND created_at >= ?) as appointments_today,
        (SELECT COUNT(*) FROM leads WHERE user_id = ? AND status = 'new') as leads_pending
    `).get(userId, todayStr, userId, todayStr, userId);

    return stats || {
      leads_today: 0,
      appointments_today: 0,
      leads_pending: 0
    };
  }
}

module.exports = new AnalyticsService();
