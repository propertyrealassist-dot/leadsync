import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Dashboard-Modern.css'
import '../styles/LeadSync-DesignSystem.css'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001'

function DashboardModern() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeStrategies: 0,
    leadsManaged: 0,
    appointmentsBooked: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const getToken = () => localStorage.getItem('token')

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Load real stats from API
      const [conversationsRes, strategiesRes, leadsRes, appointmentsRes] = await Promise.all([
        axios.get(`${API_URL}/api/conversations`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/templates`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/leads`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/appointments`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        }).catch(() => ({ data: [] }))
      ])

      setStats({
        totalConversations: conversationsRes.data?.length || 0,
        activeStrategies: strategiesRes.data?.filter(s => s.is_active)?.length || 0,
        leadsManaged: leadsRes.data?.length || 0,
        appointmentsBooked: appointmentsRes.data?.length || 0
      })

      // Load recent activity from API
      const activityRes = await axios.get(`${API_URL}/api/analytics/recent-activity`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      }).catch(() => ({ data: [] }))

      setRecentActivity(activityRes.data || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
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
      {loading ? (
        <div className="stats-grid">
          <div className="stat-card ls-card">
            <div className="stat-content">
              <div className="stat-value">Loading...</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="stats-grid">
          <div className="stat-card ls-card">
            <div className="stat-icon conversations">
              <span>💬</span>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalConversations.toLocaleString()}</div>
              <div className="stat-label">Total Conversations</div>
            </div>
          </div>

          <div className="stat-card ls-card">
            <div className="stat-icon strategies">
              <span>🤖</span>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.activeStrategies}</div>
              <div className="stat-label">Active Strategies</div>
            </div>
          </div>

          <div className="stat-card ls-card">
            <div className="stat-icon leads">
              <span>👥</span>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.leadsManaged.toLocaleString()}</div>
              <div className="stat-label">Leads Managed</div>
            </div>
          </div>

          <div className="stat-card ls-card">
            <div className="stat-icon appointments">
              <span>📅</span>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.appointmentsBooked}</div>
              <div className="stat-label">Appointments Booked</div>
            </div>
          </div>
        </div>
      )}

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
