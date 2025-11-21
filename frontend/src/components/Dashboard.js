import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import StrategyOptionModal from './StrategyOptionModal';
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Dashboard() {
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeLeads: 0,
    appointmentsBooked: 0,
    completed: 0
  });
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch conversations for stats
      const conversationsRes = await axios.get(`${API_URL}/api/conversations`);
      const conversations = conversationsRes.data;

      // Calculate stats
      const totalConversations = conversations.length;
      const activeLeads = conversations.filter(c => c.status === 'active').length;
      const appointmentsBooked = conversations.filter(c => c.status === 'booked').length;
      const completed = conversations.filter(c => c.status === 'completed').length;

      setStats({
        totalConversations,
        activeLeads,
        appointmentsBooked,
        completed
      });

      // Fetch AI agents/strategies
      const templatesRes = await axios.get(`${API_URL}/api/templates`);
      setAgents(templatesRes.data);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatCardClick = (path) => {
    navigate(path);
  };

  const handleAgentClick = (agentId) => {
    navigate(`/ai-agents/edit/${agentId}`);
  };

  const handleCreateAgent = () => {
    setShowStrategyModal(true);
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>📊 Dashboard</h1>
          <p className="page-subtitle">Overview of your LeadSync activity</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div
          className="stat-card"
          onClick={() => {
            console.log('📊 Navigating to: All conversations');
            handleStatCardClick('/conversations');
          }}
          title="View all conversations"
        >
          <div className="stat-icon-wrapper conversations">
            💬
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalConversations}</div>
            <div className="stat-label">Total Conversations</div>
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => {
            console.log('📊 Navigating to: Active leads');
            handleStatCardClick('/conversations?filter=active');
          }}
          title="View active leads"
        >
          <div className="stat-icon-wrapper leads">
            ⚡
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.activeLeads}</div>
            <div className="stat-label">Active Leads</div>
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => {
            console.log('📊 Navigating to: Appointments');
            handleStatCardClick('/conversations?filter=appointments');
          }}
          title="View appointments"
        >
          <div className="stat-icon-wrapper appointments">
            📅
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.appointmentsBooked}</div>
            <div className="stat-label">Appointments Booked</div>
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => {
            console.log('📊 Navigating to: Completed');
            handleStatCardClick('/conversations?filter=completed');
          }}
          title="View completed"
        >
          <div className="stat-icon-wrapper completed">
            ✓
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
      </div>

      {/* AI Agents Section */}
      <div className="agents-section">
        <div className="section-header">
          <h2 className="section-title">
            🤖 Your AI Agents
          </h2>
          <button
            className="btn-primary"
            onClick={handleCreateAgent}
          >
            ✨ Create New Agent
          </button>
        </div>

        {agents.length === 0 ? (
          <div className="create-agent-card" onClick={handleCreateAgent}>
            <div className="create-agent-icon">🤖</div>
            <div className="create-agent-text">Create Your First AI Agent</div>
            <div className="create-agent-subtext">
              Set up an intelligent assistant to handle conversations automatically
            </div>
          </div>
        ) : (
          <div className="agents-grid">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="agent-card"
                onClick={() => handleAgentClick(agent.id)}
              >
                <div className="agent-card-header">
                  <div className="agent-icon">
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="agent-info">
                    <h3 className="agent-name">{agent.name}</h3>
                    <span className="agent-tag">{agent.tag}</span>
                  </div>
                </div>
                <div className="agent-meta">
                  <div className="agent-meta-item">
                    <span>🎭</span>
                    <span><strong>Tone:</strong> {agent.tone}</span>
                  </div>
                  <div className="agent-meta-item">
                    <span>🎯</span>
                    <span><strong>Goal:</strong> {agent.goal || 'Book appointments'}</span>
                  </div>
                  {agent.context && (
                    <div className="agent-meta-item">
                      <span>💡</span>
                      <span><strong>Context:</strong> {agent.context.substring(0, 50)}...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Create New Agent Card */}
            <div className="create-agent-card" onClick={handleCreateAgent}>
              <div className="create-agent-icon">➕</div>
              <div className="create-agent-text">Create New Agent</div>
              <div className="create-agent-subtext">
                Add another AI assistant
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Strategy Option Modal */}
      <StrategyOptionModal
        isOpen={showStrategyModal}
        onClose={() => setShowStrategyModal(false)}
      />
    </div>
  );
}

export default Dashboard;
