import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Icons from './Icons';
import { useToast } from './ToastContainer';
import './Analytics.css';
import '../styles/LeadSync-DesignSystem.css';
import '../styles/pages-modern.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const COLORS = {
  primary: '#8B5CF6',
  success: '#a855f7',
  warning: '#F59E0B',
  info: '#3B82F6',
  danger: '#EF4444',
  purple: '#A855F7',
  pink: '#EC4899',
  teal: '#14B8A6'
};

function Analytics() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [realTimeStats, setRealTimeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // 7, 30, 90 days
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    loadAnalytics();
    loadRealTimeStats();

    // Auto-refresh real-time stats every 30 seconds
    const interval = setInterval(() => {
      loadRealTimeStats();
    }, 30000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/analytics/dashboard?dateRange=${dateRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Backend now returns data directly (not wrapped in .data)
      const analyticsData = response.data;

      // Ensure all arrays exist
      const safeData = {
        leadMetrics: analyticsData.leadMetrics || { total: 0, new: 0, contacted: 0, qualified: 0, won: 0 },
        conversionRates: analyticsData.conversionRates || { leadToAppointment: 0, contactedToQualified: 0, qualifiedToWon: 0 },
        leadSources: Array.isArray(analyticsData.leadSources) ? analyticsData.leadSources : [],
        overTime: Array.isArray(analyticsData.overTime) ? analyticsData.overTime : [],
        appointments: analyticsData.appointments || { total: 0, completed: 0, pending: 0 },
        conversations: analyticsData.conversations || { totalMessages: 0, avgPerConversation: 0 },
        strategyPerformance: Array.isArray(analyticsData.strategyPerformance) ? analyticsData.strategyPerformance : []
      };

      setAnalytics(safeData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      showToast('Failed to load analytics data', 'error');
      // Set empty analytics on error
      setAnalytics({
        leadMetrics: { total: 0, new: 0, contacted: 0, qualified: 0, won: 0 },
        conversionRates: { leadToAppointment: 0, contactedToQualified: 0, qualifiedToWon: 0 },
        leadSources: [],
        overTime: [],
        appointments: { total: 0, completed: 0, pending: 0 },
        conversations: { totalMessages: 0, avgPerConversation: 0 },
        strategyPerformance: []
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRealTimeStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/analytics/realtime`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRealTimeStats(response.data);
    } catch (error) {
      console.error('Error loading real-time stats:', error);
    }
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setLoading(true);
  };

  if (loading || !analytics) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  // Safely destructure with defaults
  const {
    leadMetrics = { total: 0, new: 0, contacted: 0, qualified: 0, won: 0 },
    conversionRates = { leadToAppointment: 0, contactedToQualified: 0, qualifiedToWon: 0 },
    leadSources = [],
    overTime = [],
    appointments = { total: 0, completed: 0, pending: 0 },
    conversations = { totalMessages: 0, avgPerConversation: 0 },
    strategyPerformance = []
  } = analytics || {};

  // Prepare pie chart data for lead sources - ensure array
  const sourceChartData = Array.isArray(leadSources) ? leadSources.map(source => ({
    name: source.source,
    value: source.count
  })) : [];

  // Prepare line chart data for leads over time - ensure array
  const timeSeriesData = Array.isArray(overTime) ? overTime.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    leads: item.leads,
    appointments: item.appointments,
    conversations: item.conversations
  })) : [];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="modern-page-header">
        <div className="modern-page-title">
          <div className="modern-page-icon">📊</div>
          <div className="modern-page-title-text">
            <h1>Analytics Dashboard</h1>
            <p>Track your performance and metrics</p>
          </div>
        </div>
        <div className="modern-page-actions">
          <button
            className={dateRange === '7' ? 'active' : ''}
            onClick={() => handleDateRangeChange('7')}
          >
            7 Days
          </button>
          <button
            className={dateRange === '30' ? 'active' : ''}
            onClick={() => handleDateRangeChange('30')}
          >
            30 Days
          </button>
          <button
            className={dateRange === '90' ? 'active' : ''}
            onClick={() => handleDateRangeChange('90')}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Real-Time Stats Banner */}
      {realTimeStats && (
        <div className="realtime-banner">
          <div className="realtime-badge">
            <span className="pulse-dot"></span>
            LIVE
          </div>
          <div className="realtime-stats">
            <div className="realtime-stat">
              <span className="realtime-label">Today's Leads:</span>
              <span className="realtime-value">{realTimeStats.todayLeads}</span>
            </div>
            <div className="realtime-stat">
              <span className="realtime-label">Today's Appointments:</span>
              <span className="realtime-value">{realTimeStats.todayAppointments}</span>
            </div>
            <div className="realtime-stat">
              <span className="realtime-label">Pending Actions:</span>
              <span className="realtime-value">{realTimeStats.pendingLeads}</span>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
            <Icons.Users size={28} color={COLORS.primary} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{leadMetrics.total}</div>
            <div className="metric-label">Total Leads</div>
            <div className="metric-change positive">+{leadMetrics.new} this period</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
            <Icons.Check size={28} color={COLORS.success} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{conversionRates.leadToAppointment}%</div>
            <div className="metric-label">Conversion Rate</div>
            <div className="metric-sublabel">{leadMetrics.qualified} qualified leads</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
            <Icons.Calendar size={28} color={COLORS.info} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{appointments.total}</div>
            <div className="metric-label">Appointments</div>
            <div className="metric-sublabel">{appointments.completed} completed</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
            <Icons.Chat size={28} color={COLORS.warning} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{conversations.totalMessages}</div>
            <div className="metric-label">Total Messages</div>
            <div className="metric-sublabel">{conversations.avgPerConversation.toFixed(1)} avg per chat</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)' }}>
            <Icons.Target size={28} color={COLORS.pink} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{leadMetrics.contacted}</div>
            <div className="metric-label">Contacted</div>
            <div className="metric-sublabel">{conversionRates.contactedToQualified}% qualified</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            <Icons.Star size={28} color={COLORS.danger} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{leadMetrics.won}</div>
            <div className="metric-label">Won Deals</div>
            <div className="metric-sublabel">{conversionRates.qualifiedToWon}% close rate</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Leads Over Time */}
        <div className="chart-card full-width">
          <div className="chart-header">
            <h3>
              <Icons.Analytics size={20} color={COLORS.primary} />
              Activity Over Time
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
              <XAxis
                dataKey="date"
                stroke="rgba(255, 255, 255, 0.6)"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="rgba(255, 255, 255, 0.6)"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(26, 10, 46, 0.95)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend wrapperStyle={{ color: '#fff' }} />
              <Line
                type="monotone"
                dataKey="leads"
                stroke={COLORS.primary}
                strokeWidth={3}
                dot={{ fill: COLORS.primary, r: 4 }}
                activeDot={{ r: 6 }}
                name="Leads"
              />
              <Line
                type="monotone"
                dataKey="appointments"
                stroke={COLORS.success}
                strokeWidth={3}
                dot={{ fill: COLORS.success, r: 4 }}
                name="Appointments"
              />
              <Line
                type="monotone"
                dataKey="conversations"
                stroke={COLORS.info}
                strokeWidth={3}
                dot={{ fill: COLORS.info, r: 4 }}
                name="Conversations"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Sources Pie Chart */}
        {sourceChartData.length > 0 && (
          <div className="chart-card">
            <div className="chart-header">
              <h3>
                <Icons.Target size={20} color={COLORS.primary} />
                Lead Sources
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sourceChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sourceChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(26, 10, 46, 0.95)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Strategy Performance */}
        {Array.isArray(strategyPerformance) && strategyPerformance.length > 0 && (
          <div className="chart-card">
            <div className="chart-header">
              <h3>
                <Icons.Lightning size={20} color={COLORS.primary} />
                Strategy Performance
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={strategyPerformance.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
                <XAxis
                  dataKey="strategyName"
                  stroke="rgba(255, 255, 255, 0.6)"
                  style={{ fontSize: '11px' }}
                  angle={-15}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="rgba(255, 255, 255, 0.6)"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(26, 10, 46, 0.95)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend wrapperStyle={{ color: '#fff' }} />
                <Bar dataKey="conversationCount" fill={COLORS.primary} radius={[8, 8, 0, 0]} name="Conversations" />
                <Bar dataKey="appointmentCount" fill={COLORS.success} radius={[8, 8, 0, 0]} name="Appointments" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Strategy Performance Table */}
      {Array.isArray(strategyPerformance) && strategyPerformance.length > 0 && (
        <div className="table-card">
          <div className="table-header">
            <h3>
              <Icons.Target size={20} color={COLORS.primary} />
              Detailed Strategy Performance
            </h3>
          </div>
          <div className="table-wrapper">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Strategy Name</th>
                  <th>Conversations</th>
                  <th>Appointments</th>
                  <th>Conversion Rate</th>
                  <th>Avg Messages</th>
                </tr>
              </thead>
              <tbody>
                {strategyPerformance.map((strategy, index) => (
                  <tr key={index}>
                    <td className="strategy-name">{strategy.strategyName}</td>
                    <td>{strategy.conversationCount}</td>
                    <td>{strategy.appointmentCount}</td>
                    <td>
                      <span className="conversion-badge">
                        {strategy.conversionRate}%
                      </span>
                    </td>
                    <td>{strategy.avgMessagesPerConversation.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {leadMetrics.total === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            <Icons.Analytics size={64} color={COLORS.primary} />
          </div>
          <h3>No data yet</h3>
          <p>Start capturing leads and booking appointments to see analytics</p>
          <button className="btn-primary" onClick={() => navigate('/leads')}>
            Go to Leads
          </button>
        </div>
      )}
    </div>
  );
}

export default Analytics;
