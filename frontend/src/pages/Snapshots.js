import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Snapshots.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Snapshots() {
  const navigate = useNavigate();
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployName, setDeployName] = useState('');
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/snapshots`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSnapshots(response.data);
    } catch (error) {
      console.error('Failed to load snapshots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!selectedSnapshot || deploying) return;

    setDeploying(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/snapshots/${selectedSnapshot.id}/deploy`,
        { customName: deployName || undefined },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      setShowDeployModal(false);
      setDeployName('');
      navigate('/strategies');
    } catch (error) {
      console.error('Failed to deploy snapshot:', error);
      alert('Failed to deploy snapshot. Please try again.');
    } finally {
      setDeploying(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this snapshot?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/snapshots/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadSnapshots();
    } catch (error) {
      console.error('Failed to delete snapshot:', error);
      alert('Failed to delete snapshot. Please try again.');
    }
  };

  const handleExport = async (snapshot) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/snapshots/${snapshot.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${snapshot.name.replace(/\s+/g, '-')}-snapshot.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export snapshot:', error);
      alert('Failed to export snapshot. Please try again.');
    }
  };

  const openDeployModal = (snapshot) => {
    setSelectedSnapshot(snapshot);
    setDeployName(`${snapshot.name} (Copy)`);
    setShowDeployModal(true);
  };

  if (loading) {
    return (
      <div className="snapshots-page">
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
          <div className="loading-spinner"></div>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '20px' }}>Loading snapshots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="snapshots-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon">📸</div>
          <div className="header-text">
            <h1>Snapshots</h1>
            <p>Save and deploy your best AI agent configurations</p>
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate('/strategies')}
        >
          <span>➕</span>
          Create Snapshot
        </button>
      </div>

      {/* Content */}
      <div className="page-content">
        {snapshots.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📸</div>
            <h2>No Snapshots Yet</h2>
            <p>Create your first snapshot by saving an AI agent configuration</p>
            <button
              className="btn-primary"
              onClick={() => navigate('/strategies')}
            >
              Go to Strategies
            </button>
          </div>
        ) : (
          <div className="snapshots-grid">
            {snapshots.map(snapshot => (
              <div key={snapshot.id} className="snapshot-card">
                <div className="snapshot-header">
                  <div className="snapshot-icon">📸</div>
                  <div className="snapshot-info">
                    <h3>{snapshot.name}</h3>
                    <p>{snapshot.description || 'No description'}</p>
                  </div>
                </div>

                {snapshot.tags && (
                  <div className="snapshot-tags">
                    {snapshot.tags.split(',').map((tag, i) => (
                      <span key={i} className="tag">{tag.trim()}</span>
                    ))}
                  </div>
                )}

                <div className="snapshot-meta">
                  <span className="meta-item">
                    <span className="meta-icon">📅</span>
                    {new Date(snapshot.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="snapshot-actions">
                  <button
                    className="btn-deploy"
                    onClick={() => openDeployModal(snapshot)}
                  >
                    <span>🚀</span>
                    Deploy
                  </button>
                  <button
                    className="btn-action"
                    onClick={() => handleExport(snapshot)}
                    title="Export"
                  >
                    📤
                  </button>
                  <button
                    className="btn-action btn-danger"
                    onClick={() => handleDelete(snapshot.id)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deploy Modal */}
      {showDeployModal && (
        <div className="modal-overlay" onClick={() => setShowDeployModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Deploy Snapshot</h2>
              <button
                className="modal-close"
                onClick={() => setShowDeployModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '24px', color: 'rgba(255,255,255,0.7)' }}>
                This will create a new AI agent from the snapshot: <strong>{selectedSnapshot?.name}</strong>
              </p>

              <div className="form-group">
                <label>New Agent Name</label>
                <input
                  type="text"
                  value={deployName}
                  onChange={(e) => setDeployName(e.target.value)}
                  placeholder="Enter name for new agent"
                  className="form-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowDeployModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleDeploy}
                disabled={deploying || !deployName.trim()}
              >
                {deploying ? 'Deploying...' : 'Deploy Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Snapshots;
