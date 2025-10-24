import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function Dashboard() {
  const [conversations, setConversations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [convRes, tempRes] = await Promise.all([
        axios.get(`${API_URL}/conversations`),
        axios.get(`${API_URL}/templates`)
      ]);
      setConversations(convRes.data);
      setTemplates(tempRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    const active = conversations.filter(c => c.status === 'active').length;
    const booked = conversations.filter(c => c.status === 'booked').length;
    const completed = conversations.filter(c => c.status === 'completed').length;
    
    return { total: conversations.length, active, booked, completed };
  };

  const stats = getStats();

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

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💬</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Conversations</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active Leads</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.booked}</div>
            <div className="stat-label">Appointments Booked</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Conversations</h2>
        </div>
        {conversations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <h3>No conversations yet</h3>
            <p>Start a test conversation to see it here</p>
            <button className="btn btn-primary" onClick={() => navigate('/test')}>
              Start Test Conversation
            </button>
          </div>
        ) : (
          <ul className="list">
            {conversations.slice(0, 10).map(conv => (
              <li
                key={conv.id}
                className="list-item"
                onClick={() => navigate(`/conversation/${conv.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                      {conv.contact_name || 'Unknown'}
                    </strong>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Template: {conv.template_name}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge badge-${conv.status === 'active' ? 'primary' : conv.status === 'booked' ? 'success' : 'secondary'}`}>
                      {conv.status}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {new Date(conv.last_message_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">AI Agents</h2>
        </div>
        {templates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🤖</div>
            <h3>No AI agents yet</h3>
            <p>Create your first AI agent to get started</p>
            <button className="btn btn-primary" onClick={() => navigate('/strategies')}>
              Create AI Agent
            </button>
          </div>
        ) : (
          <ul className="list">
            {templates.map(template => (
              <li key={template.id} className="list-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--primary-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    color: 'white'
                  }}>
                    A
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                      {template.name}
                    </strong>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Tag: {template.tag} | Tone: {template.tone}
                    </div>
                  </div>
                  <span className="badge badge-primary">{template.tag}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Dashboard;