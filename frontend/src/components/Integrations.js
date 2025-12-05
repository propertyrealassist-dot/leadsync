import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Icons from './Icons';
import GHLIntegrationCard from './GHLIntegrationCard';
import './Integrations.css';
import '../styles/LeadSync-DesignSystem.css';
import '../styles/pages-modern.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Integrations() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showClientId, setShowClientId] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const snapshotUrl = 'https://affiliates.gohighlevel.com/?fp_ref=leadsync28&share=JX2MEycBcwJJBn9cea5r';

  // Get token from localStorage
  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    // Just set loading to false - no need to check GHL connection
    // since GHLIntegrationCard handles its own connection status
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="page-wrapper">
      {/* Header */}
      <div className="modern-page-header">
        <div className="modern-page-title">
          <div className="modern-page-icon">🔗</div>
          <div className="modern-page-title-text">
            <h1>Integrations</h1>
            <p>Connect your tools and manage API credentials</p>
          </div>
        </div>
      </div>

      {/* LeadConnector Integration Card */}
      <div style={{ marginBottom: '32px' }}>
        <GHLIntegrationCard />
      </div>

      {/* Integration Cards Grid */}
      <div className="integrations-grid">
        {/* Card 1: API Credentials */}
        <div className="integration-card compact">
          <div className="card-header">
            <div className="card-icon-wrapper-compact api">
              <Icons.Settings size={20} color="#8B5CF6" />
            </div>
            <h3 className="card-title-compact">API Key</h3>
          </div>

          <div className="credential-field-compact">
            <div className="credential-input-group">
              <input
                type="text"
                value={showApiKey ? (user?.apiKey || 'No API key available') : maskCredential(user?.apiKey)}
                readOnly
                className="credential-input-compact"
              />
              <button
                className="btn-icon"
                onClick={() => setShowApiKey(!showApiKey)}
                title={showApiKey ? 'Hide' : 'Show'}
              >
                <Icons.Eye size={14} color="#8B5CF6" />
              </button>
              <button
                className="btn-icon"
                onClick={() => handleCopy(user?.apiKey, 'API Key')}
                title="Copy"
              >
                <Icons.Copy size={14} color="#8B5CF6" />
              </button>
            </div>
          </div>

          <button
            className="btn-compact btn-danger-compact"
            onClick={handleRegenerateApiKey}
            disabled={regenerating}
          >
            {regenerating ? 'Regenerating...' : 'Regenerate Key'}
          </button>
        </div>

        {/* Card 2: Client ID */}
        <div className="integration-card compact">
          <div className="card-header">
            <div className="card-icon-wrapper-compact client">
              <Icons.Info size={20} color="#8B5CF6" />
            </div>
            <h3 className="card-title-compact">Client ID</h3>
          </div>

          <div className="credential-field-compact">
            <div className="credential-input-group">
              <input
                type="text"
                value={showClientId ? (user?.clientId || 'No client ID available') : maskCredential(user?.clientId)}
                readOnly
                className="credential-input-compact"
              />
              <button
                className="btn-icon"
                onClick={() => setShowClientId(!showClientId)}
                title={showClientId ? 'Hide' : 'Show'}
              >
                <Icons.Eye size={14} color="#8B5CF6" />
              </button>
              <button
                className="btn-icon"
                onClick={() => handleCopy(user?.clientId, 'Client ID')}
                title="Copy"
              >
                <Icons.Copy size={14} color="#8B5CF6" />
              </button>
            </div>
          </div>

          <button
            className="btn-compact btn-secondary-compact"
            onClick={() => handleCopy(user?.clientId, 'Client ID')}
            disabled={!user?.clientId}
          >
            Copy to Clipboard
          </button>
        </div>

        {/* Card 3: LeadConnector Snapshot */}
        <div className="integration-card">
          <div className="card-icon-wrapper snapshot">
            <span className="card-icon">
              <Icons.Download size={32} color="#8B5CF6" />
            </span>
          </div>
          <h3 className="card-title">🚀 LeadConnector Snapshot - 5 Minute Setup!</h3>
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
                  <strong>Import snapshot into LeadConnector</strong> (click button below)
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Paste Client ID</strong> in LeadConnector Custom Values
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
                onClick={() => window.open('https://github.com/propertyrealassist-dot/leadsync/blob/main/LEADCONNECTOR_SETUP.md', '_blank')}
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
            <li><a href="https://github.com/propertyrealassist-dot/leadsync/blob/main/LEADCONNECTOR_SETUP.md" target="_blank" rel="noopener noreferrer">Snapshot Import Guide</a></li>
            <li><a href="https://api.realassistagents.com/docs" target="_blank" rel="noopener noreferrer">API Documentation</a></li>
            <li><a href="https://github.com/propertyrealassist-dot/leadsync" target="_blank" rel="noopener noreferrer">LeadConnector Integration Setup</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Integrations;
