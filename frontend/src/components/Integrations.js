import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Icons from './Icons';
import './Integrations.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Integrations() {
  const { user, isAuthenticated, updateUser } = useAuth();
  const navigate = useNavigate();
  const [ghlConnected, setGhlConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showClientId, setShowClientId] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showGHLForm, setShowGHLForm] = useState(false);
  const [ghlLocationId, setGhlLocationId] = useState('');
  const [ghlAccessToken, setGhlAccessToken] = useState('');
  const [connecting, setConnecting] = useState(false);

  const snapshotUrl = 'https://api.realassistagents.com/public/ghl-snapshot-template.json';

  // Get token from localStorage
  const getToken = () => localStorage.getItem('token');

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
        headers: { Authorization: `Bearer ${getToken()}` }
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
          headers: { Authorization: `Bearer ${getToken()}` }
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

  const handleConnectGHL = async () => {
    if (!ghlLocationId || !ghlAccessToken) {
      alert('Please enter both Location ID and Access Token');
      return;
    }

    setConnecting(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/ghl/connect`,
        {
          locationId: ghlLocationId.trim(),
          accessToken: ghlAccessToken.trim()
        },
        {
          headers: { Authorization: `Bearer ${getToken()}` }
        }
      );

      if (response.data.success) {
        setGhlConnected(true);
        setShowGHLForm(false);
        setGhlLocationId('');
        setGhlAccessToken('');
        alert('GoHighLevel connected successfully!');
      }
    } catch (error) {
      console.error('Error connecting GHL:', error);
      alert(error.response?.data?.error || 'Failed to connect to GoHighLevel. Please check your credentials.');
    } finally {
      setConnecting(false);
    }
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
          headers: { Authorization: `Bearer ${getToken()}` }
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

  const handleTestWebhook = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/api/webhook/test`,
        {
          clientId: user?.clientId,
          message: 'Test message from LeadSync UI',
          contactName: 'Test Contact',
          contactPhone: '+1234567890',
          tag: 'test-tag'
        },
        {
          headers: { Authorization: `Bearer ${getToken()}` }
        }
      );

      if (response.data.success) {
        alert('✅ Webhook is working!\n\nThe AI processed your test message successfully. Check the Conversations page to see the result.');
      } else {
        alert('⚠️ Webhook responded but with an issue:\n\n' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Webhook test error:', error);
      alert('❌ Webhook test failed:\n\n' + (error.response?.data?.error || error.message || 'Network error'));
    }
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
            Use the snapshot method below - no connection needed here!
          </p>

          <div className="connection-status">
            <div className="status-indicator">
              <span className="status-dot" style={{ backgroundColor: '#f59e0b' }}></span>
              <span className="status-text">
                Use Snapshot Method ⬇️
              </span>
            </div>
            <div className="connection-info">
              <p className="info-text" style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px' }}>
                <Icons.Info size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#f59e0b" />
                The snapshot method (below) connects GHL via webhooks. No OAuth needed!
              </p>
            </div>
          </div>

          <div className="card-actions" style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', margin: 0 }}>
              👇 Import the snapshot below to connect GHL
            </p>
          </div>
        </div>

        {/* Card 4: Snapshot */}
        <div className="integration-card">
          <div className="card-icon-wrapper snapshot">
            <span className="card-icon">
              <Icons.Download size={32} color="#8B5CF6" />
            </span>
          </div>
          <h3 className="card-title">🚀 GHL Snapshot - 5 Minute Setup!</h3>
          <p className="card-description">
            <strong>NO Developer Account Needed!</strong> Just import the snapshot and paste your Client ID.
          </p>

          <div className="snapshot-info">
            <div className="info-box" style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#8B5CF6' }}>
                ⚡ Super Simple Setup:
              </p>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Copy your Client ID</strong> from the card above ⬆️
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Import snapshot</strong> into GHL (click button below)
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Paste Client ID</strong> in GHL Custom Values
                </li>
                <li>
                  <strong>Done!</strong> 🎉 AI will handle all messages
                </li>
              </ol>
            </div>
            <div className="info-box">
              <p><strong>Includes everything:</strong></p>
              <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '14px' }}>
                <li>✅ 2 AI workflows (auto-activated)</li>
                <li>✅ 5 custom fields for tracking</li>
                <li>✅ 6 smart tags</li>
                <li>✅ Error handling with fallbacks</li>
                <li>✅ Booking detection</li>
                <li>✅ Multi-channel support (SMS, FB, IG, GMB)</li>
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

          <div className="card-actions" style={{ flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-primary"
                onClick={handleMigrateSnapshot}
                style={{ flex: 1 }}
              >
                <Icons.Download size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#ffffff" />
                Get Snapshot
              </button>
              <button
                className="btn-secondary"
                onClick={() => window.open('https://github.com/propertyrealassist-dot/leadsync/blob/main/GHL_SNAPSHOT_SETUP.md', '_blank')}
                style={{ flex: 1 }}
              >
                <Icons.Info size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#8B5CF6" />
                Setup Guide
              </button>
            </div>
            <button
              className="btn-secondary full-width"
              onClick={handleTestWebhook}
              style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}
            >
              <Icons.Check size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#10b981" />
              Test Webhook Connection
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
