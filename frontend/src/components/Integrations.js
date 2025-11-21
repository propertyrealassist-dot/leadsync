import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Icons from './Icons';
import './Integrations.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Integrations() {
  const { user, token, isAuthenticated, updateUser } = useAuth();
  const navigate = useNavigate();
  const [ghlConnected, setGhlConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showClientId, setShowClientId] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const snapshotUrl = 'https://api.realassistagents.com/public/ghl-snapshot-template.json';

  useEffect(() => {
    // Don't check auth on initial mount - let ProtectedRoute handle it
    // This prevents false redirects during auth initialization
    checkGHLConnection();
    setLoading(false);
  }, []);

  // No need for separate loadCredentials - user data comes from AuthContext

  const checkGHLConnection = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ghl/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGhlConnected(response.data.connected || false);
    } catch (error) {
      console.error('Error checking GHL connection:', error);
      setGhlConnected(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!window.confirm('Are you sure you want to regenerate your API key? This will invalidate the old key and you will need to update your integrations.')) {
      return;
    }

    setRegenerating(true);
    try {
      const response = await axios.post(
        `${API_URL}/auth/regenerate-api-key`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        // Update user context with new API key
        updateUser({ apiKey: response.data.data.apiKey });
        alert('API key regenerated successfully!');
      }
    } catch (error) {
      console.error('Error regenerating API key:', error);
      alert('Failed to regenerate API key. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopy = (text, label) => {
    if (!text) {
      alert(`No ${label} to copy`);
      return;
    }
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  const maskCredential = (credential) => {
    if (!credential) return '••••••••••••••••••••••••••••••••••••••••';
    return '•'.repeat(40);
  };

  const handleConnectGHL = () => {
    // Redirect to GHL OAuth with token
    window.location.href = `${API_URL}/api/ghl/auth?token=${token}`;
  };

  const handleDisconnectGHL = async () => {
    if (!window.confirm('Are you sure you want to disconnect GoHighLevel?')) {
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/ghl/disconnect`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setGhlConnected(false);
      alert('Disconnected from GoHighLevel');
    } catch (error) {
      console.error('Error disconnecting GHL:', error);
      alert('Failed to disconnect from GoHighLevel');
    }
  };

  const handleMigrateSnapshot = () => {
    window.open(snapshotUrl, '_blank');
  };

  // Show loading state while data is being fetched
  if (loading) {
    return (
      <div className="integrations-container">
        <div className="loading">Loading integrations...</div>
      </div>
    );
  }

  return (
    <div className="integrations-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>
            <Icons.Integrations size={32} style={{ marginRight: '12px', verticalAlign: 'middle' }} color="#8B5CF6" />
            Integrations
          </h1>
          <p className="page-subtitle">Connect your tools and manage API credentials</p>
        </div>
      </div>

      {/* Integration Cards Grid */}
      <div className="integrations-grid">
        {/* Card 1: API Credentials */}
        <div className="integration-card">
          <div className="card-icon-wrapper api">
            <span className="card-icon">
              <Icons.Settings size={32} color="#8B5CF6" />
            </span>
          </div>
          <h3 className="card-title">API Credentials</h3>
          <p className="card-description">
            Your API key for authenticating requests to LeadSync
          </p>

          <div className="credential-field">
            <label>API Key</label>
            <div className="credential-input-group">
              <input
                type="text"
                value={showApiKey ? (user?.apiKey || 'No API key available') : maskCredential(user?.apiKey)}
                readOnly
                className="credential-input"
              />
              <button
                className="btn-toggle-visibility"
                onClick={() => setShowApiKey(!showApiKey)}
                title={showApiKey ? 'Hide' : 'Show'}
              >
                <Icons.Eye size={16} color="#8B5CF6" />
              </button>
            </div>
          </div>

          <div className="card-actions">
            <button
              className="btn-secondary"
              onClick={() => handleCopy(user?.apiKey, 'API Key')}
              disabled={!user?.apiKey}
            >
              <Icons.Copy size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#8B5CF6" />
              Copy
            </button>
            <button
              className="btn-danger"
              onClick={handleRegenerateApiKey}
              disabled={regenerating}
            >
              {regenerating ? 'Regenerating...' : (
                <>
                  <Icons.Settings size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#ffffff" />
                  Regenerate
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 2: Client ID */}
        <div className="integration-card">
          <div className="card-icon-wrapper client">
            <span className="card-icon">
              <Icons.Info size={32} color="#8B5CF6" />
            </span>
          </div>
          <h3 className="card-title">Client ID</h3>
          <p className="card-description">
            Your unique identifier for LeadSync integration
          </p>

          <div className="credential-field">
            <label>Client ID</label>
            <div className="credential-input-group">
              <input
                type="text"
                value={showClientId ? (user?.clientId || 'No client ID available') : maskCredential(user?.clientId)}
                readOnly
                className="credential-input"
              />
              <button
                className="btn-toggle-visibility"
                onClick={() => setShowClientId(!showClientId)}
                title={showClientId ? 'Hide' : 'Show'}
              >
                <Icons.Eye size={16} color="#8B5CF6" />
              </button>
            </div>
          </div>

          <div className="card-actions">
            <button
              className="btn-secondary full-width"
              onClick={() => handleCopy(user?.clientId, 'Client ID')}
              disabled={!user?.clientId}
            >
              <Icons.Copy size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#8B5CF6" />
              Copy Client ID
            </button>
          </div>
        </div>

        {/* Card 3: GHL Integration */}
        <div className="integration-card">
          <div className="card-icon-wrapper ghl">
            <span className="card-icon">
              <Icons.Integrations size={32} color="#8B5CF6" />
            </span>
          </div>
          <h3 className="card-title">GoHighLevel Integration</h3>
          <p className="card-description">
            Connect your GHL account to enable AI automation
          </p>

          <div className="connection-status">
            <div className="status-indicator">
              <span className={`status-dot ${ghlConnected ? 'connected' : 'disconnected'}`}></span>
              <span className="status-text">
                {ghlConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            {ghlConnected && (
              <div className="connection-info">
                <p className="info-text">
                  <Icons.Check size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#10b981" />
                  Your GHL account is connected and ready
                </p>
              </div>
            )}
          </div>

          <div className="card-actions">
            {ghlConnected ? (
              <button
                className="btn-danger full-width"
                onClick={handleDisconnectGHL}
              >
                <Icons.X size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#ffffff" />
                Disconnect
              </button>
            ) : (
              <button
                className="btn-primary full-width"
                onClick={handleConnectGHL}
              >
                <Icons.Integrations size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#ffffff" />
                Connect GHL Account
              </button>
            )}
          </div>
        </div>

        {/* Card 4: Snapshot */}
        <div className="integration-card">
          <div className="card-icon-wrapper snapshot">
            <span className="card-icon">
              <Icons.Download size={32} color="#8B5CF6" />
            </span>
          </div>
          <h3 className="card-title">GHL Snapshot</h3>
          <p className="card-description">
            Import LeadSync workflows and settings into GHL
          </p>

          <div className="snapshot-info">
            <div className="info-box">
              <p><strong>What's included:</strong></p>
              <ul>
                <li>
                  <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#10b981" />
                  Custom fields and values
                </li>
                <li>
                  <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#10b981" />
                  AI automation workflows
                </li>
                <li>
                  <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#10b981" />
                  Tags and status tracking
                </li>
                <li>
                  <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#10b981" />
                  Error handling setup
                </li>
              </ul>
            </div>
          </div>

          <div className="snapshot-url-section">
            <label>Snapshot URL</label>
            <div className="credential-input-group">
              <input
                type="text"
                value={snapshotUrl}
                readOnly
                className="credential-input"
              />
              <button
                className="btn-toggle-visibility"
                onClick={() => handleCopy(snapshotUrl, 'Snapshot URL')}
                title="Copy URL"
              >
                <Icons.Copy size={16} color="#8B5CF6" />
              </button>
            </div>
          </div>

          <div className="card-actions">
            <button
              className="btn-primary full-width"
              onClick={handleMigrateSnapshot}
            >
              <Icons.Download size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#ffffff" />
              View Snapshot
            </button>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="integrations-info">
        <div className="info-card">
          <h3>
            <Icons.Settings size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#8B5CF6" />
            Security Best Practices
          </h3>
          <ul>
            <li>Never share your API key or Client ID publicly</li>
            <li>Regenerate your API key if you suspect it has been compromised</li>
            <li>Use HTTPS for all API requests</li>
            <li>Store credentials securely in environment variables</li>
          </ul>
        </div>

        <div className="info-card">
          <h3>
            <Icons.Info size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#8B5CF6" />
            Documentation
          </h3>
          <ul>
            <li><a href="/public/SNAPSHOT_IMPORT_GUIDE.md" target="_blank">Snapshot Import Guide</a></li>
            <li><a href="#" target="_blank">API Documentation</a></li>
            <li><a href="#" target="_blank">GHL Integration Setup</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Integrations;
