import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Icons from './Icons';
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
              <Icons.CoPilot size={22} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Create AI Agent
            </button>
            <button
              className="btn-secondary-large"
              onClick={() => navigate('/strategies')}
            >
              <Icons.Analytics size={22} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              View Strategies
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-card" onClick={() => navigate('/strategies')}>
          <Icons.Target size={48} className="stat-icon" color="#8B5CF6" />
          <div className="stat-value">{stats.totalAgents}</div>
          <div className="stat-label">AI Agents</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/analytics')}>
          <Icons.Chat size={48} className="stat-icon" color="#EC4899" />
          <div className="stat-value">{stats.totalConversations}</div>
          <div className="stat-label">Total Conversations</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/analytics?filter=active')}>
          <Icons.Lightning size={48} className="stat-icon" color="#f59e0b" />
          <div className="stat-value">{stats.activeLeads}</div>
          <div className="stat-label">Active Leads</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/analytics?filter=appointments')}>
          <Icons.Calendar size={48} className="stat-icon" color="#3b82f6" />
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
              <Icons.CoPilot size={80} className="empty-icon" color="#8B5CF6" />
              <h3>No AI Agents Yet</h3>
              <p>Create your first AI agent to start automating conversations</p>
              <button
                className="btn-primary"
                onClick={() => navigate('/copilot')}
              >
                <Icons.Plus size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
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
                  <span><Icons.Chat size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {agent.total_leads || 0} leads</span>
                  <span><Icons.CheckCircle size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {agent.leads_won || 0} won</span>
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
            <Icons.CoPilot size={48} className="action-icon" color="#8B5CF6" />
            <h3>Build with Co-Pilot</h3>
            <p>Create AI strategies with guided wizard</p>
          </div>
          <div className="action-card" onClick={() => navigate('/test')}>
            <Icons.TestAI size={48} className="action-icon" color="#EC4899" />
            <h3>Test Your AI</h3>
            <p>Simulate conversations in real-time</p>
          </div>
          <div className="action-card" onClick={() => navigate('/analytics')}>
            <Icons.Analytics size={48} className="action-icon" color="#10b981" />
            <h3>View Analytics</h3>
            <p>Track performance and metrics</p>
          </div>
          <div className="action-card" onClick={() => navigate('/integrations')}>
            <Icons.Integrations size={48} className="action-icon" color="#3b82f6" />
            <h3>Integrations</h3>
            <p>Connect GHL and manage API keys</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
