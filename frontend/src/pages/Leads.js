import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Leads.css';
import '../styles/LeadSync-DesignSystem.css';
import '../styles/pages-modern.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Leads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });

  useEffect(() => {
    loadLeads();
    loadStats();
  }, [filter, search]);

  const loadLeads = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (search) params.append('search', search);

      const response = await axios.get(`${API_URL}/api/leads?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeads(response.data.data || []);
    } catch (error) {
      console.error('Failed to load leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/leads/stats/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/leads/${leadId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      loadLeads();
      loadStats();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      new: '#3b82f6',
      contacted: '#f59e0b',
      qualified: '#8b5cf6',
      interested: '#a855f7',
      won: '#22c55e',
      lost: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getSourceIcon = (source) => {
    const icons = {
      gohighlevel: '🎯',
      zapier: '⚡',
      typeform: '📋',
      calendly: '📅',
      booking_widget: '🔖',
      webhook: '🔗',
      manual: '✍️'
    };
    return icons[source] || '📥';
  };

  if (loading) {
    return (
      <div className="leads-page">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="modern-page-header">
        <div className="modern-page-title">
          <div className="modern-page-icon">👥</div>
          <div className="header-text">
            <h1>Leads</h1>
            <p>Manage and track your leads</p>
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowAddLead(true)}
        >
          <span>➕</span>
          Add Lead
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="leads-stats">
          <div className="stat-card" onClick={() => setFilter('all')}>
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{stats.total || 0}</div>
              <div className="stat-label">Total Leads</div>
            </div>
          </div>
          <div className="stat-card" onClick={() => setFilter('new')}>
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>🆕</div>
            <div className="stat-content">
              <div className="stat-value">{stats.new || 0}</div>
              <div className="stat-label">New</div>
            </div>
          </div>
          <div className="stat-card" onClick={() => setFilter('contacted')}>
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>💬</div>
            <div className="stat-content">
              <div className="stat-value">{stats.contacted || 0}</div>
              <div className="stat-label">Contacted</div>
            </div>
          </div>
          <div className="stat-card" onClick={() => setFilter('qualified')}>
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>⭐</div>
            <div className="stat-content">
              <div className="stat-value">{stats.qualified || 0}</div>
              <div className="stat-label">Qualified</div>
            </div>
          </div>
          <div className="stat-card" onClick={() => setFilter('won')}>
            <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.2)' }}>✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.won || 0}</div>
              <div className="stat-label">Won</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="leads-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          {['all', 'new', 'contacted', 'qualified', 'interested', 'won', 'lost'].map(status => (
            <button
              key={status}
              className={`filter-tab ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Leads List */}
      <div className="leads-content">
        {leads.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h2>No Leads Yet</h2>
            <p>Start capturing leads through your AI agents or webhooks</p>
          </div>
        ) : (
          <div className="leads-grid">
            {leads.map(lead => (
              <div key={lead.id} className="lead-card">
                <div className="lead-header">
                  <div className="lead-avatar">
                    {lead.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="lead-info">
                    <h3>{lead.name}</h3>
                    <p>{lead.email || 'No email'}</p>
                  </div>
                  <div
                    className="lead-status"
                    style={{ backgroundColor: `${getStatusColor(lead.status)}33`, color: getStatusColor(lead.status) }}
                  >
                    {lead.status}
                  </div>
                </div>

                <div className="lead-details">
                  {lead.phone && (
                    <div className="detail-item">
                      <span className="detail-icon">📱</span>
                      <span>{lead.phone}</span>
                    </div>
                  )}
                  {lead.company && (
                    <div className="detail-item">
                      <span className="detail-icon">🏢</span>
                      <span>{lead.company}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-icon">{getSourceIcon(lead.source)}</span>
                    <span>{lead.source}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon">📅</span>
                    <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="lead-actions">
                  <button
                    className="action-btn"
                    onClick={() => handleStatusChange(lead.id, 'contacted')}
                    title="Mark as Contacted"
                  >
                    💬
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => handleStatusChange(lead.id, 'qualified')}
                    title="Mark as Qualified"
                  >
                    ⭐
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => handleStatusChange(lead.id, 'won')}
                    title="Mark as Won"
                  >
                    ✅
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {showAddLead && (
        <div className="modal-overlay" onClick={() => setShowAddLead(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Lead</h2>
              <button className="modal-close" onClick={() => setShowAddLead(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={newLead.name}
                  onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                  placeholder="jane@company.com"
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                  placeholder="555-123-4567"
                />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input
                  type="text"
                  value={newLead.company}
                  onChange={(e) => setNewLead({...newLead, company: e.target.value})}
                  placeholder="Company Name"
                />
              </div>
              <button
                className="btn-primary"
                onClick={async () => {
                  try {
                    if (!newLead.name.trim()) {
                      alert('Name is required');
                      return;
                    }

                    const token = localStorage.getItem('token');
                    await axios.post(`${API_URL}/api/leads`, {
                      ...newLead,
                      source: 'manual'
                    }, {
                      headers: { Authorization: `Bearer ${token}` }
                    });

                    setShowAddLead(false);
                    setNewLead({ name: '', email: '', phone: '', company: '' });
                    loadLeads();
                    loadStats();
                    alert('Lead added successfully!');
                  } catch (error) {
                    console.error('Failed to add lead:', error);
                    alert('Failed to add lead: ' + (error.response?.data?.error || error.message));
                  }
                }}
                disabled={!newLead.name.trim()}
              >
                Add Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Leads;
