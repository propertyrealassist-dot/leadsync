import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './APIKeys.css';

const APIKeys = () => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState([]);
  const [createdKey, setCreatedKey] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      const token = localStorage.getItem('token');
      // Simulated API keys - replace with real API call
      setTimeout(() => {
        setApiKeys([
          {
            id: '1',
            name: 'Production API Key',
            key: 'sk_live_••••••••••••••••••••4242',
            created: '2024-01-15',
            lastUsed: '2 hours ago',
            permissions: ['read', 'write']
          },
          {
            id: '2',
            name: 'Development API Key',
            key: 'sk_test_••••••••••••••••••••8888',
            created: '2024-02-01',
            lastUsed: '1 day ago',
            permissions: ['read']
          }
        ]);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      setMessage({ type: 'error', text: 'Failed to load API keys' });
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a key name' });
      return;
    }

    if (newKeyPermissions.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one permission' });
      return;
    }

    try {
      // Simulated API key creation - replace with real API call
      const newKey = {
        id: Date.now().toString(),
        name: newKeyName,
        key: `sk_live_${Math.random().toString(36).substring(2, 34)}`,
        created: new Date().toISOString().split('T')[0],
        lastUsed: 'Never',
        permissions: newKeyPermissions
      };

      setCreatedKey(newKey);
      setApiKeys([...apiKeys, { ...newKey, key: newKey.key.substring(0, 28) + '••••' }]);
      setMessage({ type: 'success', text: 'API key created successfully!' });
      setNewKeyName('');
      setNewKeyPermissions([]);
    } catch (error) {
      console.error('Failed to create API key:', error);
      setMessage({ type: 'error', text: 'Failed to create API key' });
    }
  };

  const handleDeleteKey = async (keyId) => {
    if (!window.confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      setApiKeys(apiKeys.filter(key => key.id !== keyId));
      setMessage({ type: 'success', text: 'API key deleted successfully' });
    } catch (error) {
      console.error('Failed to delete API key:', error);
      setMessage({ type: 'error', text: 'Failed to delete API key' });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'API key copied to clipboard!' });
  };

  const togglePermission = (permission) => {
    setNewKeyPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  if (loading) {
    return (
      <div className="api-keys-page">
        <div className="api-keys-loading">
          <div className="spinner"></div>
          <p>Loading API keys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="api-keys-page">
      <div className="api-keys-header">
        <div>
          <h1>🔑 API Keys</h1>
          <p>Manage your API keys and integrations</p>
        </div>
        <button className="btn-create" onClick={() => setShowCreateModal(true)}>
          + Create New Key
        </button>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      {/* API Documentation Banner */}
      <div className="api-docs-banner">
        <div className="banner-content">
          <span className="banner-icon">📚</span>
          <div>
            <h3>API Documentation</h3>
            <p>Learn how to integrate LeadSync with your applications</p>
          </div>
        </div>
        <button className="btn-secondary">View Docs</button>
      </div>

      {/* API Keys List */}
      <div className="api-keys-list">
        <h2>Your API Keys</h2>
        {apiKeys.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔑</span>
            <h3>No API Keys Yet</h3>
            <p>Create your first API key to start integrating with LeadSync</p>
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              Create API Key
            </button>
          </div>
        ) : (
          <div className="keys-grid">
            {apiKeys.map(key => (
              <div key={key.id} className="key-card">
                <div className="key-header">
                  <h3>{key.name}</h3>
                  <div className="key-actions">
                    <button
                      className="btn-icon"
                      onClick={() => copyToClipboard(key.key)}
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                    <button
                      className="btn-icon delete"
                      onClick={() => handleDeleteKey(key.id)}
                      title="Delete key"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="key-value">
                  <code>{key.key}</code>
                </div>

                <div className="key-meta">
                  <div className="meta-item">
                    <span className="meta-label">Created:</span>
                    <span className="meta-value">{key.created}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Last Used:</span>
                    <span className="meta-value">{key.lastUsed}</span>
                  </div>
                </div>

                <div className="key-permissions">
                  {key.permissions.map(permission => (
                    <span key={permission} className="permission-badge">
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New API Key</h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            {createdKey ? (
              <div className="key-created-success">
                <span className="success-icon">✅</span>
                <h3>API Key Created Successfully!</h3>
                <p>Make sure to copy your API key now. You won't be able to see it again!</p>

                <div className="created-key-display">
                  <code>{createdKey.key}</code>
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(createdKey.key)}
                  >
                    Copy
                  </button>
                </div>

                <button
                  className="btn-primary"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreatedKey(null);
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Key Name</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production API Key"
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>Permissions</label>
                  <div className="permissions-grid">
                    <label className="permission-checkbox">
                      <input
                        type="checkbox"
                        checked={newKeyPermissions.includes('read')}
                        onChange={() => togglePermission('read')}
                      />
                      <span>Read Access</span>
                    </label>
                    <label className="permission-checkbox">
                      <input
                        type="checkbox"
                        checked={newKeyPermissions.includes('write')}
                        onChange={() => togglePermission('write')}
                      />
                      <span>Write Access</span>
                    </label>
                    <label className="permission-checkbox">
                      <input
                        type="checkbox"
                        checked={newKeyPermissions.includes('delete')}
                        onChange={() => togglePermission('delete')}
                      />
                      <span>Delete Access</span>
                    </label>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button className="btn-primary" onClick={handleCreateKey}>
                    Create API Key
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default APIKeys;
