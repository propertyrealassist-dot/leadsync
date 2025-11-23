import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Settings.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Settings() {
  const { user } = useAuth();
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
      const token = localStorage.getItem('leadsync_token');
      const response = await axios.get(`${API_URL}/api/ghl/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      const token = localStorage.getItem('leadsync_token');
      const response = await axios.get(`${API_URL}/api/ghl/calendars`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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

  const handleConnectGHL = () => {
    // Use the marketplace install link directly
    // This redirects to GHL marketplace for OAuth authorization
    const marketplaceUrl = 'https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&redirect_uri=https%3A%2F%2Fapi.realassistagents.com%2Fapi%2Foauth%2Fredirect&client_id=69218dacd101d3222ff1708c-mic4vq7j&scope=contacts.readonly+contacts.write+conversations.readonly+conversations.write+calendars%2Fevents.readonly+calendars%2Fevents.write+opportunities.readonly+opportunities.write+locations.readonly&version_id=69218dacd101d3ab25f1708d';

    // Store current user in session for callback (optional)
    if (user?.id) {
      sessionStorage.setItem('ghl_connecting_user', user.id);
    }

    // Redirect to GHL marketplace
    window.location.href = marketplaceUrl;
  };

  const handleDisconnectGHL = async () => {
    if (!window.confirm('Are you sure you want to disconnect GoHighLevel?')) {
      return;
    }

    try {
      const token = localStorage.getItem('leadsync_token');
      await axios.post(`${API_URL}/api/ghl/disconnect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
          <h1>⚙️ Settings</h1>
          <p className="page-subtitle">Configure your preferences and account settings</p>
        </div>
      </div>

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
