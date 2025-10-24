import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function AIAgents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const res = await axios.get(`${API_URL}/templates`);
      setAgents(res.data);
      console.log('Loaded agents:', res.data);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();

    console.log('Attempting to delete agent with id:', id);

    if (!window.confirm('Are you sure you want to delete this AI agent?')) {
      return;
    }

    try {
      console.log('Sending delete request to:', `${API_URL}/templates/${id}`);
      const response = await axios.delete(`${API_URL}/templates/${id}`);
      console.log('Delete response:', response);
      alert('Agent deleted successfully!');
      loadAgents();
    } catch (error) {
      console.error('Delete error:', error);
      console.error('Error response:', error.response);
      alert('Error deleting agent: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEdit = (id, e) => {
    e.stopPropagation();
    navigate(`/strategy/edit/${id}`);
  };

  if (loading) {
    return <div className="loading">Loading AI agents...</div>;
  }

  return (
    <div className="ai-agents-page">
      <div className="page-header">
        <div>
          <h1>🤖 AI Agents</h1>
          <p className="page-subtitle">Manage your AI-powered conversation agents</p>
        </div>
        <button className="btn btn-mint" onClick={() => navigate('/strategy/new')}>
          + Create New Agent
        </button>
      </div>

      {agents.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🤖</div>
            <h3>No AI agents yet</h3>
            <p>Create your first AI agent to start automating conversations</p>
            <button className="btn btn-primary" onClick={() => navigate('/strategy/new')} style={{ marginTop: '1rem' }}>
              Create Your First Agent
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Your Agents</h2>
          </div>
          <div className="agents-table">
            <div className="table-header">
              <div className="th">Strategy Name</div>
              <div className="th">GHL Tag</div>
              <div className="th">Total Leads</div>
              <div className="th">Active Leads</div>
              <div className="th">Leads Won</div>
              <div className="th">Response Rate</div>
              <div className="th">Actions</div>
            </div>

            {agents.map(agent => (
              <div key={agent.id} className="table-row" onClick={() => navigate(`/strategy/edit/${agent.id}`)}>
                <div className="td">
                  <div className="agent-name">
                    <span className="agent-icon">A</span>
                    <span className="agent-text">
                      <strong>{agent.name}</strong>
                    </span>
                  </div>
                </div>
                <div className="td">
                  <span className="tag-badge">{agent.tag}</span>
                </div>
                <div className="td">
                  <span className="stat-value">0</span>
                </div>
                <div className="td">
                  <span className="stat-value">0</span>
                </div>
                <div className="td">
                  <span className="stat-value">0</span>
                </div>
                <div className="td">
                  <span className="stat-value">0%</span>
                </div>
                <div className="td actions-cell">
                  <button 
                    className="btn-icon" 
                    onClick={(e) => handleEdit(agent.id, e)} 
                    title="Edit"
                  >
                    ⚙️
                  </button>
                  <button 
                    className="btn-icon btn-icon-danger" 
                    onClick={(e) => handleDelete(agent.id, e)} 
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AIAgents;