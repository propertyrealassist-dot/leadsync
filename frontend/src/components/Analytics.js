import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './Analytics.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Analytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all');

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('leadsync_token');

      const [convoRes, agentsRes] = await Promise.all([
        axios.get(`${API_URL}/api/conversations`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/templates`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setConversations(convoRes.data || []);
      setAgents(agentsRes.data || []);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (filter === 'all') return true;
    if (filter === 'active') return conv.status === 'active';
    if (filter === 'appointments') return conv.status === 'booked';
    if (filter === 'completed') return conv.status === 'completed';
    return true;
  });

  const stats = {
    total: conversations.length,
    active: conversations.filter(c => c.status === 'active').length,
    booked: conversations.filter(c => c.status === 'booked').length,
    completed: conversations.filter(c => c.status === 'completed').length,
    conversionRate: conversations.length > 0
      ? Math.round((conversations.filter(c => c.status === 'booked').length / conversations.length) * 100)
      : 0
  };

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  return (
    <div className="analytics-container">
      <div className="page-header">
        <div>
          <h1>📊 Analytics</h1>
          <p className="page-subtitle">Track your performance and metrics</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="analytics-stats">
        <div className="analytics-stat-card" onClick={() => setFilter('all')}>
          <div className="stat-icon">💬</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Conversations</div>
        </div>
        <div className="analytics-stat-card" onClick={() => setFilter('active')}>
          <div className="stat-icon">⚡</div>
          <div className="stat-value">{stats.active}</div>
          <div className="stat-label">Active Leads</div>
        </div>
        <div className="analytics-stat-card" onClick={() => setFilter('appointments')}>
          <div className="stat-icon">📅</div>
          <div className="stat-value">{stats.booked}</div>
          <div className="stat-label">Appointments</div>
        </div>
        <div className="analytics-stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats.conversionRate}%</div>
          <div className="stat-label">Conversion Rate</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All ({conversations.length})
        </button>
        <button
          className={filter === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
        >
          Active ({stats.active})
        </button>
        <button
          className={filter === 'appointments' ? 'active' : ''}
          onClick={() => setFilter('appointments')}
        >
          Appointments ({stats.booked})
        </button>
        <button
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Completed ({stats.completed})
        </button>
      </div>

      {/* Conversations List */}
      <div className="conversations-list">
        {filteredConversations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No conversations yet</h3>
            <p>Start testing your AI agents to see analytics data</p>
            <button className="btn-primary" onClick={() => navigate('/test')}>
              Test AI Agent
            </button>
          </div>
        ) : (
          <table className="conversations-table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Agent</th>
                <th>Status</th>
                <th>Messages</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredConversations.map(conv => (
                <tr key={conv.id}>
                  <td>{conv.contact_name || conv.phone || 'Unknown'}</td>
                  <td>{conv.template_name || 'N/A'}</td>
                  <td>
                    <span className={`status-badge status-${conv.status}`}>
                      {conv.status}
                    </span>
                  </td>
                  <td>{conv.message_count || 0}</td>
                  <td>{new Date(conv.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn-view"
                      onClick={() => navigate(`/conversation/${conv.id}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Analytics;
