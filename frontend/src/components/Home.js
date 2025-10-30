import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Home.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAgents: 0,
    totalConversations: 0,
    activeLeads: 0,
    appointmentsBooked: 0
  });
  const [recentAgents, setRecentAgents] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('leadsync_token');

      // Load agents
      const agentsRes = await axios.get(`${API_URL}/api/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Load conversations
      const convoRes = await axios.get(`${API_URL}/api/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const agents = agentsRes.data || [];
      const conversations = convoRes.data || [];

      setStats({
        totalAgents: agents.length,
        totalConversations: conversations.length,
        activeLeads: conversations.filter(c => c.status === 'active').length,
        appointmentsBooked: conversations.filter(c => c.status === 'booked').length
      });

      setRecentAgents(agents.slice(0, 3));

    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  return (
    <div className="home-container">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome to <span className="gradient-text">LeadSync</span>
          </h1>
          <p className="hero-subtitle">
            AI-Powered Lead Management & Automation Platform
          </p>
          <div className="hero-actions">
            <button
              className="btn-primary-large"
              onClick={() => navigate('/copilot')}
            >
              🤖 Create AI Agent
            </button>
            <button
              className="btn-secondary-large"
              onClick={() => navigate('/strategies')}
            >
              📊 View Strategies
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-card" onClick={() => navigate('/strategies')}>
          <div className="stat-icon">🎯</div>
          <div className="stat-value">{stats.totalAgents}</div>
          <div className="stat-label">AI Agents</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/analytics')}>
          <div className="stat-icon">💬</div>
          <div className="stat-value">{stats.totalConversations}</div>
          <div className="stat-label">Total Conversations</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/analytics?filter=active')}>
          <div className="stat-icon">⚡</div>
          <div className="stat-value">{stats.activeLeads}</div>
          <div className="stat-label">Active Leads</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/analytics?filter=appointments')}>
          <div className="stat-icon">📅</div>
          <div className="stat-value">{stats.appointmentsBooked}</div>
          <div className="stat-label">Appointments</div>
        </div>
      </div>

      {/* Recent Agents */}
      <div className="recent-section">
        <div className="section-header">
          <h2>Your AI Agents</h2>
          <button
            className="btn-link"
            onClick={() => navigate('/strategies')}
          >
            View All →
          </button>
        </div>
        <div className="agents-grid">
          {recentAgents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🤖</div>
              <h3>No AI Agents Yet</h3>
              <p>Create your first AI agent to start automating conversations</p>
              <button
                className="btn-primary"
                onClick={() => navigate('/copilot')}
              >
                Create First Agent
              </button>
            </div>
          ) : (
            recentAgents.map(agent => (
              <div
                key={agent.id}
                className="agent-card"
                onClick={() => navigate(`/ai-agents/edit/${agent.id}`)}
              >
                <div className="agent-header">
                  <h3>{agent.name}</h3>
                  <span className="agent-tag">{agent.tag}</span>
                </div>
                <p className="agent-tone">{agent.tone}</p>
                <div className="agent-stats">
                  <span>💬 {agent.total_leads || 0} leads</span>
                  <span>✅ {agent.leads_won || 0} won</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <div className="action-card" onClick={() => navigate('/copilot')}>
            <div className="action-icon">🤖</div>
            <h3>Build with Co-Pilot</h3>
            <p>Create AI strategies with guided wizard</p>
          </div>
          <div className="action-card" onClick={() => navigate('/test')}>
            <div className="action-icon">✨</div>
            <h3>Test Your AI</h3>
            <p>Simulate conversations in real-time</p>
          </div>
          <div className="action-card" onClick={() => navigate('/analytics')}>
            <div className="action-icon">📊</div>
            <h3>View Analytics</h3>
            <p>Track performance and metrics</p>
          </div>
          <div className="action-card" onClick={() => navigate('/integrations')}>
            <div className="action-icon">🔗</div>
            <h3>Integrations</h3>
            <p>Connect GHL and manage API keys</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
