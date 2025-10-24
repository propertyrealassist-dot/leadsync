import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Settings.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Settings() {
  const { user, updateUser, token } = useAuth();
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [copiedClientId, setCopiedClientId] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [ghlStatus, setGhlStatus] = useState({ connected: false, locationId: null });
  const [calendars, setCalendars] = useState([]);
  const [settings, setSettings] = useState({
    defaultCalendarId: '',
    syncEnabled: true,
    autoSyncInterval: 15,
    reminderSmsEnabled: true,
    reminderEmailEnabled: true,
    reminderHoursBefore: 24,
    businessHoursStart: '09:00',
    businessHoursEnd: '17:00',
    timezone: 'America/New_York'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    checkGHLStatus();

    // Check for OAuth callback success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ghl_connected') === 'true') {
      alert('GoHighLevel connected successfully!');
      checkGHLStatus();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('ghl_error') === 'true') {
      alert('Failed to connect GoHighLevel. Please try again.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkGHLStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ghl/status?userId=default_user`);
      setGhlStatus(response.data);

      if (response.data.connected) {
        loadCalendars();
      }
    } catch (error) {
      console.error('Error checking GHL status:', error);
    }
  };

  const loadCalendars = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ghl/calendars?userId=default_user`);
      setCalendars(response.data.calendars || []);
    } catch (error) {
      console.error('Error loading calendars:', error);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      // In a real app, you'd load saved settings from the database
      // For now, we'll use default values
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGHL = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ghl/auth/start?userId=default_user`);
      if (response.data.authUrl) {
        window.location.href = response.data.authUrl;
      }
    } catch (error) {
      console.error('Error connecting to GHL:', error);
      alert('Failed to initiate GHL connection');
    }
  };

  const handleDisconnectGHL = async () => {
    if (!window.confirm('Are you sure you want to disconnect GoHighLevel?')) {
      return;
    }

    try {
      await axios.post(`${API_URL}/api/ghl/disconnect`, { userId: 'default_user' });
      setGhlStatus({ connected: false, locationId: null });
      setCalendars([]);
      alert('GoHighLevel disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting GHL:', error);
      alert('Failed to disconnect GoHighLevel');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      // In a real app, you'd save settings to the database
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'apiKey') {
        setCopiedApiKey(true);
        setTimeout(() => setCopiedApiKey(false), 2000);
      } else if (type === 'clientId') {
        setCopiedClientId(true);
        setTimeout(() => setCopiedClientId(false), 2000);
      } else if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!window.confirm('Are you sure you want to regenerate your API key? This will invalidate the old key and you will need to update your integrations.')) {
      return;
    }

    try {
      setRegenerating(true);
      const response = await axios.post(
        `${API_URL}/api/auth/regenerate-api-key`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Update user in context
        updateUser({ apiKey: response.data.data.apiKey });
        alert('API key regenerated successfully!');
      }
    } catch (error) {
      console.error('Error regenerating API key:', error);
      alert('Failed to regenerate API key');
    } finally {
      setRegenerating(false);
    }
  };

  const maskApiKey = (key) => {
    if (!key) return '';
    return '•'.repeat(40);
  };

  const handleDownloadSnapshot = () => {
    // Download the GHL snapshot template using the download endpoint
    // This forces download instead of opening in browser
    window.location.href = `${API_URL}/api/download/ghl-snapshot`;
  };

  const handleDownloadGuide = () => {
    // Download the import guide
    window.location.href = `${API_URL}/api/download/import-guide`;
  };

  const handleViewGuide = () => {
    // Open the import guide in a new tab
    window.open(`${API_URL}/public/SNAPSHOT_IMPORT_GUIDE.md`, '_blank');
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-subtitle">Configure your LeadSync settings and integrations</p>
        </div>
      </div>

      {/* API Credentials Section */}
      {user && (
        <div className="settings-section">
          <div className="section-header">
            <h2>API Credentials</h2>
            <p>Your unique credentials for integrating LeadSync with external platforms</p>
          </div>

          <div className="settings-card">
            {/* Connection Status */}
            <div className="credentials-status">
              <div className="connection-status">
                <div className="status-indicator status-connected"></div>
                <div>
                  <h3>Connected</h3>
                  <p>{user.email} {user.companyName && `• ${user.companyName}`}</p>
                </div>
              </div>
              <div className="plan-badge">
                {user.planType?.toUpperCase() || 'FREE'} PLAN
              </div>
            </div>

            {/* API Key */}
            <div className="credential-item">
              <div className="credential-header">
                <label>API Key</label>
                <button
                  className="btn-text btn-regenerate"
                  onClick={handleRegenerateApiKey}
                  disabled={regenerating}
                >
                  {regenerating ? 'Regenerating...' : '🔄 Regenerate'}
                </button>
              </div>
              <div className="credential-input-group">
                <div className="credential-value">
                  {showApiKey ? user.apiKey : maskApiKey(user.apiKey)}
                </div>
                <button
                  className="btn-icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                  title={showApiKey ? 'Hide API Key' : 'Show API Key'}
                >
                  {showApiKey ? '👁️' : '👁️‍🗨️'}
                </button>
                <button
                  className="btn-icon"
                  onClick={() => copyToClipboard(user.apiKey, 'apiKey')}
                  title="Copy API Key"
                >
                  {copiedApiKey ? '✅' : '📋'}
                </button>
              </div>
              <span className="help-text">
                Use this API key to authenticate webhook requests from GoHighLevel
              </span>
            </div>

            {/* Client ID */}
            <div className="credential-item">
              <label>Client ID</label>
              <div className="credential-input-group">
                <div className="credential-value">{user.clientId}</div>
                <button
                  className="btn-icon"
                  onClick={() => copyToClipboard(user.clientId, 'clientId')}
                  title="Copy Client ID"
                >
                  {copiedClientId ? '✅' : '📋'}
                </button>
              </div>
              <span className="help-text">
                Your unique client identifier for webhook routing
              </span>
            </div>

            {/* Setup Instructions */}
            <div className="setup-instructions">
              <h4>📚 GoHighLevel Integration Setup</h4>
              <ol>
                <li>
                  <strong>Download Snapshot:</strong> Download our pre-configured GoHighLevel workflow template
                </li>
                <li>
                  <strong>Import to GHL:</strong> In GoHighLevel, go to Settings → Snapshots → Import
                </li>
                <li>
                  <strong>Configure Webhook URL:</strong> Update the webhook URL to:
                  <code className="code-block">
                    {window.location.origin}/api/webhook/ghl
                  </code>
                </li>
                <li>
                  <strong>Add Your Client ID:</strong> Copy your Client ID above and paste it in the workflow configuration
                </li>
                <li>
                  <strong>Activate Workflow:</strong> Enable the workflow in GHL to start receiving AI responses
                </li>
                <li>
                  <strong>Test:</strong> Send a test SMS to verify your integration is working
                </li>
              </ol>
              <div className="setup-actions">
                <button onClick={handleDownloadSnapshot} className="btn-primary btn-small">
                  📥 Download GHL Snapshot
                </button>
                <button onClick={handleViewGuide} className="btn-secondary btn-small">
                  📖 View Complete Guide
                </button>
              </div>
              <p className="help-text" style={{ marginTop: '12px' }}>
                Need help? Check out the complete import guide for step-by-step instructions.
              </p>
            </div>

            {/* Import from URL Section */}
            <div className="import-url-section">
              <h4>🔗 Import to GoHighLevel</h4>
              <p className="help-text" style={{ marginBottom: '12px' }}>
                Copy this URL and paste it into GHL's "Import Snapshot from URL" field
              </p>

              <div className="url-input-group">
                <input
                  type="text"
                  className="url-input"
                  value={`${API_URL}/public/ghl-snapshot-template.json`}
                  readOnly
                  onClick={(e) => e.target.select()}
                />
                <button
                  className="btn-copy"
                  onClick={() => copyToClipboard(`${API_URL}/public/ghl-snapshot-template.json`, 'url')}
                  title="Copy URL"
                >
                  {copiedUrl ? '✅ Copied!' : '📋 Copy URL'}
                </button>
              </div>

              <div className="warning-box">
                ⚠️ <strong>Local URL:</strong> This URL works on your local machine. Deploy to production for public access.
              </div>

              <p className="help-text" style={{ marginTop: '12px' }}>
                <strong>Alternative:</strong> Use the download button above if URL import doesn't work
              </p>
            </div>
          </div>
        </div>
      )}


      {/* GoHighLevel Integration */}
      <div className="settings-section">
        <div className="section-header">
          <h2>GoHighLevel Integration</h2>
          <p>Connect your GoHighLevel account to sync contacts and appointments</p>
        </div>

        <div className="settings-card">
          {ghlStatus.connected ? (
            <div className="integration-connected">
              <div className="connection-status">
                <div className="status-indicator status-connected"></div>
                <div>
                  <h3>Connected to GoHighLevel</h3>
                  <p>Location ID: {ghlStatus.locationId}</p>
                </div>
              </div>
              <button className="btn-danger" onClick={handleDisconnectGHL}>
                Disconnect
              </button>
            </div>
          ) : (
            <div className="integration-disconnected">
              <div className="connection-status">
                <div className="status-indicator status-disconnected"></div>
                <div>
                  <h3>Not Connected</h3>
                  <p>Connect your GoHighLevel account to enable two-way sync with LeadSync</p>
                </div>
              </div>
              <button className="btn-primary" onClick={handleConnectGHL}>
                Connect to GoHighLevel
              </button>
            </div>
          )}

          {ghlStatus.connected && calendars.length > 0 && (
            <div className="calendars-list">
              <h4>Available Calendars</h4>
              <div className="calendar-items">
                {calendars.map(cal => (
                  <div key={cal.id} className="calendar-item">
                    <span>📅 {cal.name}</span>
                    {cal.description && <span className="calendar-desc">{cal.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Settings */}
      <div className="settings-section">
        <div className="section-header">
          <h2>Calendar Settings</h2>
          <p>Configure your appointment scheduling preferences</p>
        </div>

        <div className="settings-card">
          {ghlStatus.connected && calendars.length > 0 && (
            <div className="form-group">
              <label>Default Calendar</label>
              <select
                value={settings.defaultCalendarId}
                onChange={(e) => setSettings({ ...settings, defaultCalendarId: e.target.value })}
              >
                <option value="">Select a default calendar</option>
                {calendars.map(cal => (
                  <option key={cal.id} value={cal.id}>{cal.name}</option>
                ))}
              </select>
              <span className="help-text">
                New appointments will be created in this calendar by default
              </span>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Business Hours Start</label>
              <input
                type="time"
                value={settings.businessHoursStart}
                onChange={(e) => setSettings({ ...settings, businessHoursStart: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Business Hours End</label>
              <input
                type="time"
                value={settings.businessHoursEnd}
                onChange={(e) => setSettings({ ...settings, businessHoursEnd: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="America/Phoenix">Arizona Time</option>
              <option value="America/Anchorage">Alaska Time</option>
              <option value="Pacific/Honolulu">Hawaii Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sync Settings */}
      {ghlStatus.connected && (
        <div className="settings-section">
          <div className="section-header">
            <h2>Sync Settings</h2>
            <p>Configure how appointments sync with GoHighLevel</p>
          </div>

          <div className="settings-card">
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.syncEnabled}
                  onChange={(e) => setSettings({ ...settings, syncEnabled: e.target.checked })}
                />
                <span>Enable automatic sync</span>
              </label>
              <span className="help-text">
                Automatically sync appointments between LeadSync and GoHighLevel
              </span>
            </div>

            {settings.syncEnabled && (
              <div className="form-group">
                <label>Auto-sync Interval (minutes)</label>
                <input
                  type="number"
                  value={settings.autoSyncInterval}
                  onChange={(e) => setSettings({ ...settings, autoSyncInterval: parseInt(e.target.value) })}
                  min={5}
                  max={60}
                />
                <span className="help-text">
                  How often to sync appointments (5-60 minutes)
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reminder Settings */}
      <div className="settings-section">
        <div className="section-header">
          <h2>Reminder Settings</h2>
          <p>Configure appointment reminder notifications</p>
        </div>

        <div className="settings-card">
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.reminderSmsEnabled}
                onChange={(e) => setSettings({ ...settings, reminderSmsEnabled: e.target.checked })}
              />
              <span>Send SMS reminders</span>
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.reminderEmailEnabled}
                onChange={(e) => setSettings({ ...settings, reminderEmailEnabled: e.target.checked })}
              />
              <span>Send email reminders</span>
            </label>
          </div>

          {(settings.reminderSmsEnabled || settings.reminderEmailEnabled) && (
            <div className="form-group">
              <label>Send reminders (hours before appointment)</label>
              <input
                type="number"
                value={settings.reminderHoursBefore}
                onChange={(e) => setSettings({ ...settings, reminderHoursBefore: parseInt(e.target.value) })}
                min={1}
                max={168}
              />
              <span className="help-text">
                Default reminder time (1-168 hours)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="settings-actions">
        <button
          className="btn-primary btn-large"
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

export default Settings;
