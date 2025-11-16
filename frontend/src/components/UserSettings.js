import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UserSettings.css';

const UserSettings = () => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const [settings, setSettings] = useState({
    // Notifications
    emailNotifications: true,
    pushNotifications: false,
    conversationAlerts: true,
    weeklyReports: true,
    marketingEmails: false,

    // Privacy
    profileVisibility: 'private',
    dataSharing: false,
    analyticsTracking: true,

    // Preferences
    theme: 'dark',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    language: 'en',
    autoSave: true,

    // AI Settings
    aiResponseSpeed: 'balanced',
    aiTemperature: 0.7,
    aiMaxTokens: 1000,
    enableAIInsights: true
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleToggle = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/auth/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      setSettings({
        emailNotifications: true,
        pushNotifications: false,
        conversationAlerts: true,
        weeklyReports: true,
        marketingEmails: false,
        profileVisibility: 'private',
        dataSharing: false,
        analyticsTracking: true,
        theme: 'dark',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        language: 'en',
        autoSave: true,
        aiResponseSpeed: 'balanced',
        aiTemperature: 0.7,
        aiMaxTokens: 1000,
        enableAIInsights: true
      });
      setMessage({ type: 'success', text: 'Settings reset to defaults' });
    }
  };

  return (
    <div className="user-settings-page">
      <div className="settings-header">
        <h1>⚙️ Settings</h1>
        <p>Customize your preferences and privacy settings</p>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      <div className="settings-sections">
        {/* Notifications Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2>🔔 Notifications</h2>
            <p>Manage how you receive updates and alerts</p>
          </div>

          <div className="settings-group">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Email Notifications</h4>
                <p>Receive important updates via email</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={() => handleToggle('emailNotifications')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Push Notifications</h4>
                <p>Get instant browser notifications</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={() => handleToggle('pushNotifications')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Conversation Alerts</h4>
                <p>Get notified about new conversations</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.conversationAlerts}
                  onChange={() => handleToggle('conversationAlerts')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Weekly Reports</h4>
                <p>Receive weekly performance summaries</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.weeklyReports}
                  onChange={() => handleToggle('weeklyReports')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Marketing Emails</h4>
                <p>Receive product updates and tips</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.marketingEmails}
                  onChange={() => handleToggle('marketingEmails')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2>🔒 Privacy & Security</h2>
            <p>Control your data and privacy preferences</p>
          </div>

          <div className="settings-group">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Profile Visibility</h4>
                <p>Who can see your profile information</p>
              </div>
              <select
                value={settings.profileVisibility}
                onChange={(e) => handleChange('profileVisibility', e.target.value)}
                className="setting-select"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="team">Team Only</option>
              </select>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Data Sharing</h4>
                <p>Share anonymous usage data to improve LeadSync</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.dataSharing}
                  onChange={() => handleToggle('dataSharing')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Analytics Tracking</h4>
                <p>Allow analytics to improve your experience</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.analyticsTracking}
                  onChange={() => handleToggle('analyticsTracking')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2>🎨 Preferences</h2>
            <p>Customize your interface and experience</p>
          </div>

          <div className="settings-group">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Theme</h4>
                <p>Choose your preferred color scheme</p>
              </div>
              <select
                value={settings.theme}
                onChange={(e) => handleChange('theme', e.target.value)}
                className="setting-select"
              >
                <option value="dark">Dark Mode</option>
                <option value="light">Light Mode</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Date Format</h4>
                <p>How dates are displayed</p>
              </div>
              <select
                value={settings.dateFormat}
                onChange={(e) => handleChange('dateFormat', e.target.value)}
                className="setting-select"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Time Format</h4>
                <p>12-hour or 24-hour clock</p>
              </div>
              <select
                value={settings.timeFormat}
                onChange={(e) => handleChange('timeFormat', e.target.value)}
                className="setting-select"
              >
                <option value="12h">12-hour (AM/PM)</option>
                <option value="24h">24-hour</option>
              </select>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Language</h4>
                <p>Interface language</p>
              </div>
              <select
                value={settings.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="setting-select"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Auto-Save</h4>
                <p>Automatically save your work</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={() => handleToggle('autoSave')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* AI Settings Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2>🤖 AI Configuration</h2>
            <p>Fine-tune AI behavior and performance</p>
          </div>

          <div className="settings-group">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Response Speed</h4>
                <p>Balance between speed and quality</p>
              </div>
              <select
                value={settings.aiResponseSpeed}
                onChange={(e) => handleChange('aiResponseSpeed', e.target.value)}
                className="setting-select"
              >
                <option value="fast">Fast (Lower Quality)</option>
                <option value="balanced">Balanced</option>
                <option value="quality">Quality (Slower)</option>
              </select>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>AI Temperature</h4>
                <p>Creativity level: {settings.aiTemperature}</p>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.aiTemperature}
                onChange={(e) => handleChange('aiTemperature', parseFloat(e.target.value))}
                className="setting-slider"
              />
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Max Response Length</h4>
                <p>Maximum tokens: {settings.aiMaxTokens}</p>
              </div>
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={settings.aiMaxTokens}
                onChange={(e) => handleChange('aiMaxTokens', parseInt(e.target.value))}
                className="setting-slider"
              />
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>AI Insights</h4>
                <p>Get AI-powered suggestions and tips</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.enableAIInsights}
                  onChange={() => handleToggle('enableAIInsights')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="settings-actions">
        <button className="btn-reset" onClick={handleReset}>
          Reset to Defaults
        </button>
        <button className="btn-save" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default UserSettings;
