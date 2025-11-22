import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Icons from './Icons';
import './AdvancedAnalytics.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function AdvancedAnalytics() {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState({
    totalLeads: 0,
    conversionRate: 0,
    avgResponseTime: 0,
    appointmentsBooked: 0,
    revenue: 0,
    customerLifetimeValue: 0
  });
  const [chartData, setChartData] = useState({
    conversions: [],
    engagement: [],
    performance: []
  });
  const [funnel, setFunnel] = useState([
    { stage: 'Leads Generated', count: 1250, percentage: 100 },
    { stage: 'Engaged', count: 875, percentage: 70 },
    { stage: 'Qualified', count: 500, percentage: 40 },
    { stage: 'Appointments Booked', count: 250, percentage: 20 },
    { stage: 'Closed', count: 125, percentage: 10 }
  ]);
  const [aiInsights, setAiInsights] = useState([
    {
      type: 'success',
      icon: 'Target',
      title: 'Peak Performance Time',
      message: 'Your conversion rate is 35% higher between 2-4 PM. Consider scheduling more outreach during this window.'
    },
    {
      type: 'warning',
      icon: 'AlertCircle',
      title: 'Drop-Off Alert',
      message: 'There\'s a 23% drop-off rate at the qualification stage. Review your qualification criteria.'
    },
    {
      type: 'info',
      icon: 'Info',
      title: 'Optimization Opportunity',
      message: 'Leads from referrals convert 2.3x better. Consider implementing a referral program.'
    },
    {
      type: 'success',
      icon: 'TrendingUp',
      title: 'Growth Trend',
      message: 'Your appointment booking rate increased 18% this week. Keep up the momentum!'
    }
  ]);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token'); // FIXED: was 'leadsync_token'

      // In production, fetch real analytics data
      const response = await axios.get(`${API_URL}/api/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // FIXED: Handle response.data.data structure properly
      const conversationsData = response.data?.data || response.data || [];
      const conversations = Array.isArray(conversationsData) ? conversationsData : [];

      // Calculate KPIs from real data
      const totalLeads = conversations.length;
      const booked = Array.isArray(conversations) ? conversations.filter(c => c.status === 'booked').length : 0;
      const conversionRate = totalLeads > 0 ? (booked / totalLeads * 100).toFixed(1) : 0;

      setKpis({
        totalLeads,
        conversionRate,
        avgResponseTime: 0,
        appointmentsBooked: booked,
        revenue: booked * 150,
        customerLifetimeValue: 0
      });

      // Generate chart data from real data (empty for now)
      setChartData({
        conversions: [],
        engagement: [],
        performance: []
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
      // Set REAL zeros instead of fake data
      setKpis({
        totalLeads: 0,
        conversionRate: 0,
        avgResponseTime: 0,
        appointmentsBooked: 0,
        revenue: 0,
        customerLifetimeValue: 0
      });
      setChartData({
        conversions: [],
        engagement: [],
        performance: []
      });
    } finally {
      setLoading(false);
    }
  };

  const generateConversionData = (range) => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const data = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: Math.floor(Math.random() * 50) + 20
      });
    }
    return data;
  };

  const generateEngagementData = (range) => {
    const hours = ['12AM', '3AM', '6AM', '9AM', '12PM', '3PM', '6PM', '9PM'];
    return hours.map(hour => ({
      hour,
      value: Math.floor(Math.random() * 100) + 20
    }));
  };

  const generatePerformanceData = (range) => {
    return [
      { strategy: 'Real Estate Follow-up', conversions: 145, rate: 32 },
      { strategy: 'Lead Qualifier', conversions: 98, rate: 28 },
      { strategy: 'Appointment Setter', conversions: 76, rate: 24 },
      { strategy: 'Lead Nurture', conversions: 37, rate: 18 }
    ];
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="advanced-analytics">
      <div className="analytics-header">
        <div className="page-header">
          <Icons.AdvancedAnalytics size={48} color="#8B5CF6" />
          <div>
            <h1>Advanced Analytics</h1>
            <p className="analytics-subtitle">Deep insights and performance metrics</p>
          </div>
        </div>
        <div className="time-range-selector">
          <button
            className={`range-btn ${timeRange === '7d' ? 'active' : ''}`}
            onClick={() => setTimeRange('7d')}
          >
            7 Days
          </button>
          <button
            className={`range-btn ${timeRange === '30d' ? 'active' : ''}`}
            onClick={() => setTimeRange('30d')}
          >
            30 Days
          </button>
          <button
            className={`range-btn ${timeRange === '90d' ? 'active' : ''}`}
            onClick={() => setTimeRange('90d')}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
            <Icons.Analytics size={32} color="#ffffff" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Total Leads</div>
            <div className="kpi-value">{kpis.totalLeads.toLocaleString()}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
            <Icons.Target size={32} color="#ffffff" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Conversion Rate</div>
            <div className="kpi-value">{kpis.conversionRate}%</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #EC4899, #F59E0B)' }}>
            <Icons.Zap size={32} color="#ffffff" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Avg Response Time</div>
            <div className="kpi-value">{kpis.avgResponseTime}min</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #10B981, #3B82F6)' }}>
            <Icons.Calendar size={32} color="#ffffff" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Appointments Booked</div>
            <div className="kpi-value">{kpis.appointmentsBooked}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}>
            <Icons.TrendingUp size={32} color="#ffffff" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Revenue</div>
            <div className="kpi-value">{formatCurrency(kpis.revenue)}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)' }}>
            <Icons.Users size={32} color="#ffffff" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Customer LTV</div>
            <div className="kpi-value">{formatCurrency(kpis.customerLifetimeValue)}</div>
          </div>
        </div>
      </div>

      {/* AI Insights - DISABLED: Shows fake data */}
      {false && (
      <div className="insights-section">
        <h2>
          <Icons.CoPilot size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#8B5CF6" />
          AI-Powered Insights
        </h2>
        <div className="insights-grid">
          {aiInsights.map((insight, idx) => {
            const IconComponent = Icons[insight.icon];
            const iconColor = insight.type === 'success' ? '#10b981' :
                            insight.type === 'warning' ? '#f59e0b' : '#3b82f6';
            return (
              <div key={idx} className={`insight-card insight-${insight.type}`}>
                <div className="insight-icon">
                  {IconComponent && <IconComponent size={24} color={iconColor} />}
                </div>
                <div className="insight-content">
                  <h3>{insight.title}</h3>
                  <p>{insight.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Conversion Funnel - DISABLED: Shows fake data */}
      {false && (
      <div className="funnel-section">
        <h2>
          <Icons.AdvancedAnalytics size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#8B5CF6" />
          Conversion Funnel
        </h2>
        <div className="funnel-container">
          {funnel.map((stage, idx) => (
            <div key={idx} className="funnel-stage">
              <div
                className="funnel-bar"
                style={{ width: `${stage.percentage}%` }}
              >
                <div className="funnel-bar-inner"></div>
              </div>
              <div className="funnel-details">
                <div className="funnel-label">{stage.stage}</div>
                <div className="funnel-stats">
                  <span className="funnel-count">{stage.count.toLocaleString()}</span>
                  <span className="funnel-percentage">{stage.percentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Charts - DISABLED: Shows fake data */}
      {false && (
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Conversion Trend</h3>
          <div className="chart-placeholder">
            <div className="bar-chart">
              {chartData.conversions.slice(0, 7).map((point, idx) => (
                <div key={idx} className="bar-item">
                  <div
                    className="bar"
                    style={{ height: `${point.value * 2}px` }}
                  ></div>
                  <div className="bar-label">{point.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h3>Engagement by Time</h3>
          <div className="chart-placeholder">
            <div className="line-chart">
              {chartData.engagement.map((point, idx) => (
                <div key={idx} className="line-item">
                  <div
                    className="line-bar"
                    style={{ height: `${point.value}%` }}
                  ></div>
                  <div className="line-label">{point.hour}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Performance */}
      <div className="performance-section">
        <h2>
          <Icons.Target size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#8B5CF6" />
          Strategy Performance
        </h2>
        <div className="performance-table">
          <div className="table-header">
            <div>Strategy</div>
            <div>Conversions</div>
            <div>Rate</div>
            <div>Performance</div>
          </div>
          {chartData.performance.map((item, idx) => (
            <div key={idx} className="table-row">
              <div className="strategy-name">{item.strategy}</div>
              <div className="strategy-conversions">{item.conversions}</div>
              <div className="strategy-rate">{item.rate}%</div>
              <div className="strategy-performance">
                <div className="performance-bar-container">
                  <div
                    className="performance-bar"
                    style={{ width: `${item.rate * 3}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}

export default AdvancedAnalytics;
