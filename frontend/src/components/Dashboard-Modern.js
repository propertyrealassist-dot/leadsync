import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Dashboard-Modern.css'
import '../styles/LeadSync-DesignSystem.css'

function DashboardModern() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeStrategies: 0,
    leadsManaged: 0,
    appointmentsBooked: 0
  })
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    // Mock data - replace with actual API calls
    setStats({
      totalConversations: 1247,
      activeStrategies: 8,
      leadsManaged: 532,
      appointmentsBooked: 89
    })

    setRecentActivity([
      {
        id: 1,
        type: 'conversation',
        title: 'New lead conversation started',
        description: 'John Doe - Professional Coaching',
        time: '2 minutes ago',
        icon: '💬'
      },
      {
        id: 2,
        type: 'appointment',
        title: 'Appointment booked',
        description: 'Sarah Johnson - Discovery Call',
        time: '15 minutes ago',
        icon: '📅'
      },
      {
        id: 3,
        type: 'strategy',
        title: 'Strategy activated',
        description: 'Real Estate Lead Gen v2',
        time: '1 hour ago',
        icon: '🚀'
      },
    ])
  }

  const quickActions = [
    {
      title: 'Create AI Agent',
      description: 'Build a new conversation strategy',
      icon: '🤖',
      color: 'primary',
      action: () => navigate('/strategy/new')
    },
    {
      title: 'View Conversations',
      description: 'Monitor live conversations',
      icon: '💬',
      color: 'cyan',
      action: () => navigate('/conversations')
    },
    {
      title: 'Test AI',
      description: 'Try your agents in real-time',
      icon: '⚡',
      color: 'purple',
      action: () => navigate('/test-ai')
    },
    {
      title: 'Analytics',
      description: 'View performance metrics',
      icon: '📊',
      color: 'success',
      action: () => navigate('/analytics')
    },
  ]

  return (
    <div className="dashboard-modern">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <h1 className="ls-gradient-text">Welcome to LeadSync</h1>
          <p>Your AI-powered lead management command center</p>
        </div>
        <div className="hero-action">
          <button className="ls-btn ls-btn-primary" onClick={() => navigate('/strategy/new')}>
            <span>✨</span> Create New Agent
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card ls-card">
          <div className="stat-icon conversations">
            <span>💬</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalConversations.toLocaleString()}</div>
            <div className="stat-label">Total Conversations</div>
            <div className="stat-change positive">+12% this month</div>
          </div>
        </div>

        <div className="stat-card ls-card">
          <div className="stat-icon strategies">
            <span>🤖</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.activeStrategies}</div>
            <div className="stat-label">Active Strategies</div>
            <div className="stat-change positive">+2 this week</div>
          </div>
        </div>

        <div className="stat-card ls-card">
          <div className="stat-icon leads">
            <span>👥</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.leadsManaged.toLocaleString()}</div>
            <div className="stat-label">Leads Managed</div>
            <div className="stat-change positive">+8% this month</div>
          </div>
        </div>

        <div className="stat-card ls-card">
          <div className="stat-icon appointments">
            <span>📅</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.appointmentsBooked}</div>
            <div className="stat-label">Appointments Booked</div>
            <div className="stat-change positive">+15% this month</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-main-grid">
        {/* Quick Actions */}
        <div className="dashboard-section">
          <div className="section-header">
            <h3>Quick Actions</h3>
            <p>Get started with common tasks</p>
          </div>
          <div className="quick-actions-grid">
            {quickActions.map((action, index) => (
              <div
                key={index}
                className={`quick-action-card ls-card action-${action.color}`}
                onClick={action.action}
              >
                <div className="action-icon">
                  <span>{action.icon}</span>
                </div>
                <div className="action-content">
                  <h4>{action.title}</h4>
                  <p>{action.description}</p>
                </div>
                <div className="action-arrow">→</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard-section">
          <div className="section-header">
            <h3>Recent Activity</h3>
            <button className="ls-btn-ghost">View All</button>
          </div>
          <div className="activity-list">
            {recentActivity.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <p>No recent activity</p>
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="activity-item ls-card-flat">
                  <div className="activity-icon">
                    <span>{activity.icon}</span>
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-description">{activity.description}</div>
                  </div>
                  <div className="activity-time">{activity.time}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Performance Chart Placeholder */}
        <div className="dashboard-section full-width">
          <div className="section-header">
            <h3>Performance Overview</h3>
            <div className="chart-filters">
              <button className="ls-badge ls-badge-primary active">7 Days</button>
              <button className="ls-badge ls-badge-primary">30 Days</button>
              <button className="ls-badge ls-badge-primary">90 Days</button>
            </div>
          </div>
          <div className="chart-container ls-card">
            <div className="chart-placeholder">
              <span className="chart-icon">📈</span>
              <p>Performance chart coming soon</p>
              <p className="chart-hint">Track conversations, bookings, and conversion rates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="ls-fab" onClick={() => navigate('/strategy/new')}>
        <span>+</span>
      </div>
    </div>
  )
}

export default DashboardModern
