import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './Conversations.css';
import '../styles/LeadSync-DesignSystem.css';
import '../styles/pages-modern.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Conversations() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [timeFrame, setTimeFrame] = useState('all');
  const [showTestLeads, setShowTestLeads] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [earliestDate, setEarliestDate] = useState(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    filterConversations();
  }, [conversations, searchTerm, statusFilter, timeFrame, showTestLeads]);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) {
      setStatusFilter(status);
    }
  }, [searchParams]);

  const loadConversations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/conversations`);
      const convos = response.data;
      setConversations(convos);

      // Find earliest conversation date
      if (convos.length > 0) {
        const dates = convos.map(c => new Date(c.started_at));
        const earliest = new Date(Math.min(...dates));
        setEarliestDate(earliest);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterConversations = () => {
    let filtered = [...conversations];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.contact_name?.toLowerCase().includes(term) ||
        c.contact_phone?.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term)
      );
    }

    // Filter by time frame
    if (timeFrame !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();

      switch(timeFrame) {
        case '1d':
          cutoffDate.setDate(now.getDate() - 1);
          break;
        case '1w':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case '1m':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case '6m':
          cutoffDate.setMonth(now.getMonth() - 6);
          break;
        case '1y':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          break;
      }

      filtered = filtered.filter(c => new Date(c.started_at) >= cutoffDate);
    }

    setFilteredConversations(filtered);
    setCurrentPage(1);
  };

  const getStats = () => {
    return {
      total: filteredConversations.length,
      completed: filteredConversations.filter(c => c.status === 'completed').length,
      inProgress: filteredConversations.filter(c => c.status === 'active').length,
      failed: filteredConversations.filter(c => c.status === 'failed').length,
    };
  };

  const handleViewConversation = (conversationId) => {
    navigate(`/conversation/${conversationId}`);
  };

  const handleRefreshConversation = async (conversationId) => {
    // Reload specific conversation
    await loadConversations();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'active':
        return 'status-badge status-in-progress';
      case 'completed':
        return 'status-badge status-completed';
      case 'failed':
        return 'status-badge status-failed';
      case 'booked':
        return 'status-badge status-booked';
      default:
        return 'status-badge';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'active':
        return 'IN PROGRESS';
      case 'completed':
        return 'COMPLETED';
      case 'failed':
        return 'FAILED';
      case 'booked':
        return 'BOOKED';
      default:
        return status?.toUpperCase() || 'UNKNOWN';
    }
  };

  const stats = getStats();

  // Pagination
  const totalPages = Math.ceil(filteredConversations.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedConversations = filteredConversations.slice(startIndex, endIndex);

  if (loading) {
    return <div className="loading">Loading conversations...</div>;
  }

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="modern-page-header">
        <div className="modern-page-title">
          <div className="modern-page-icon">💬</div>
          <div className="modern-page-title-text">
            <h1>Lead Dashboard</h1>
            <p>
              {earliestDate
                ? `Data available from ${earliestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : 'No data available yet'}
            </p>
          </div>
        </div>

        {/* Time Frame Selector */}
        <div className="modern-page-actions">
          {['1d', '1w', '1m', '6m', '1y', 'all'].map((tf) => (
            <button
              key={tf}
              className={`modern-btn ${timeFrame === tf ? 'modern-btn-primary' : 'modern-btn-secondary'}`}
              onClick={() => setTimeFrame(tf)}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="leads-stats-grid">
        <div className="lead-stat-card total">
          <div className="lead-stat-icon">📊</div>
          <div className="lead-stat-content">
            <div className="lead-stat-value">{stats.total}</div>
            <div className="lead-stat-label">Total Leads</div>
          </div>
        </div>

        <div className="lead-stat-card completed">
          <div className="lead-stat-icon">✓</div>
          <div className="lead-stat-content">
            <div className="lead-stat-value">{stats.completed}</div>
            <div className="lead-stat-label">Completed</div>
          </div>
        </div>

        <div className="lead-stat-card in-progress">
          <div className="lead-stat-icon">⚡</div>
          <div className="lead-stat-content">
            <div className="lead-stat-value">{stats.inProgress}</div>
            <div className="lead-stat-label">In Progress</div>
          </div>
        </div>

        <div className="lead-stat-card failed">
          <div className="lead-stat-icon">✗</div>
          <div className="lead-stat-content">
            <div className="lead-stat-value">{stats.failed}</div>
            <div className="lead-stat-label">Failed</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="table-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="control-buttons">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">In Progress</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="booked">Booked</option>
          </select>

          <button
            className={`test-leads-toggle ${showTestLeads ? 'active' : ''}`}
            onClick={() => setShowTestLeads(!showTestLeads)}
          >
            {showTestLeads ? '✓ ' : ''}Test Leads
          </button>
        </div>
      </div>

      {/* Conversations Table */}
      {paginatedConversations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💬</div>
          <h3>Waiting for New Leads</h3>
          <p>No conversations found. Start a test conversation or wait for incoming leads.</p>
          <button className="btn-primary" onClick={() => navigate('/test')}>
            Start Test Conversation
          </button>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="conversations-table">
              <thead>
                <tr>
                  <th>Lead ID</th>
                  <th>Name</th>
                  <th>Error</th>
                  <th>Status</th>
                  <th>Strategy</th>
                  <th>Contact ID</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedConversations.map((conversation) => (
                  <tr
                    key={conversation.id}
                    className="conversation-row"
                    onClick={() => handleViewConversation(conversation.id)}
                  >
                    <td className="lead-id">{conversation.id.substring(0, 8)}...</td>
                    <td className="contact-name">{conversation.contact_name || 'Unknown'}</td>
                    <td className="error-cell">{conversation.error || '-'}</td>
                    <td>
                      <span className={getStatusBadgeClass(conversation.status)}>
                        {getStatusText(conversation.status)}
                      </span>
                    </td>
                    <td className="strategy">{conversation.template_name || '-'}</td>
                    <td className="ghl-id">{conversation.leadconnector_contact_id || '-'}</td>
                    <td className="created-at">{formatDate(conversation.started_at)}</td>
                    <td className="actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="action-btn view-btn"
                        onClick={() => handleViewConversation(conversation.id)}
                        title="View conversation"
                      >
                        👁️
                      </button>
                      <button
                        className="action-btn refresh-btn"
                        onClick={() => handleRefreshConversation(conversation.id)}
                        title="Refresh"
                      >
                        🔄
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="table-footer">
            <div className="rows-per-page">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="pagination-info">
              {startIndex + 1}-{Math.min(endIndex, filteredConversations.length)} of {filteredConversations.length}
            </div>

            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                ‹
              </button>
              <span className="page-number">{currentPage}</span>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                ›
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Conversations;
