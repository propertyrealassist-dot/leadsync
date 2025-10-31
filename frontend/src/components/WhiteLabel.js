import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Icons from './Icons';
import './WhiteLabel.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function WhiteLabel() {
  const [settings, setSettings] = useState({
    companyName: 'LeadSync',
    logoUrl: '',
    primaryColor: '#8B5CF6',
    secondaryColor: '#EC4899',
    accentColor: '#3B82F6',
    customDomain: '',
    supportEmail: 'support@leadsync.com',
    supportPhone: '',
    footerText: '© 2024 LeadSync. All rights reserved.',
    hideLeadSyncBranding: false,
    customCss: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('leadsync_token');
      const response = await axios.get(`${API_URL}/api/white-label/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.settings) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error loading white label settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('leadsync_token');
      await axios.put(
        `${API_URL}/api/white-label/settings`,
        settings,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to save settings');
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset to default branding?')) {
      setSettings({
        companyName: 'LeadSync',
        logoUrl: '',
        primaryColor: '#8B5CF6',
        secondaryColor: '#EC4899',
        accentColor: '#3B82F6',
        customDomain: '',
        supportEmail: 'support@leadsync.com',
        supportPhone: '',
        footerText: '© 2024 LeadSync. All rights reserved.',
        hideLeadSyncBranding: false,
        customCss: ''
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // In production, upload to S3 or CDN
    const reader = new FileReader();
    reader.onloadend = () => {
      setSettings({ ...settings, logoUrl: reader.result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="white-label">
      <div className="white-label-header">
        <div>
          <h1>
            <Icons.WhiteLabel size={32} style={{ marginRight: '12px', verticalAlign: 'middle' }} color="#8B5CF6" />
            White Label Settings
          </h1>
          <p className="white-label-subtitle">Customize the platform with your brand</p>
        </div>
        <div className="header-actions">
          <button
            className={`btn-preview ${previewMode ? 'active' : ''}`}
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? '⚙️ Edit' : '👁️ Preview'}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <div className="white-label-content">
        {/* Settings Panel */}
        {!previewMode && (
          <div className="settings-panel">
            {/* Company Information */}
            <div className="settings-section">
              <h2>Company Information</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Company Name</label>
                  <input
                    type="text"
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    placeholder="Your Company Name"
                  />
                </div>

                <div className="form-group">
                  <label>Support Email</label>
                  <input
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                    placeholder="support@yourcompany.com"
                  />
                </div>

                <div className="form-group">
                  <label>Support Phone</label>
                  <input
                    type="tel"
                    value={settings.supportPhone}
                    onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="form-group">
                  <label>Custom Domain</label>
                  <input
                    type="text"
                    value={settings.customDomain}
                    onChange={(e) => setSettings({ ...settings, customDomain: e.target.value })}
                    placeholder="app.yourcompany.com"
                  />
                  <span className="form-hint">Configure DNS CNAME record to enable</span>
                </div>
              </div>
            </div>

            {/* Branding */}
            <div className="settings-section">
              <h2>Branding</h2>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Company Logo</label>
                  <div className="logo-upload">
                    {settings.logoUrl ? (
                      <div className="logo-preview">
                        <img src={settings.logoUrl} alt="Logo" />
                        <button
                          className="btn-remove-logo"
                          onClick={() => setSettings({ ...settings, logoUrl: '' })}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="logo-placeholder">
                        <span>📷</span>
                        <p>No logo uploaded</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      id="logo-upload"
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="logo-upload" className="btn-upload">
                      Upload Logo
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Primary Color</label>
                  <div className="color-input-group">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    />
                    <input
                      type="text"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      placeholder="#8B5CF6"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Secondary Color</label>
                  <div className="color-input-group">
                    <input
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                    />
                    <input
                      type="text"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      placeholder="#EC4899"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Accent Color</label>
                  <div className="color-input-group">
                    <input
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                    />
                    <input
                      type="text"
                      value={settings.accentColor}
                      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Footer Text</label>
                  <input
                    type="text"
                    value={settings.footerText}
                    onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                    placeholder="© 2024 Your Company. All rights reserved."
                  />
                </div>

                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.hideLeadSyncBranding}
                      onChange={(e) => setSettings({ ...settings, hideLeadSyncBranding: e.target.checked })}
                    />
                    <span>Hide "Powered by LeadSync" branding</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Advanced Customization */}
            <div className="settings-section">
              <h2>Advanced Customization</h2>
              <div className="form-group full-width">
                <label>Custom CSS</label>
                <textarea
                  value={settings.customCss}
                  onChange={(e) => setSettings({ ...settings, customCss: e.target.value })}
                  placeholder="/* Add your custom CSS here */"
                  rows={8}
                  className="custom-css-textarea"
                />
                <span className="form-hint">Advanced users only - Custom CSS will be injected into all pages</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="settings-actions">
              <button className="btn-reset" onClick={handleReset}>
                Reset to Default
              </button>
              <button className="btn-save" onClick={handleSave}>
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Live Preview */}
        {previewMode && (
          <div className="preview-panel">
            <div className="preview-container">
              <h2>Live Preview</h2>
              <p className="preview-subtitle">See how your branding will look</p>

              <div
                className="preview-demo"
                style={{
                  '--primary-color': settings.primaryColor,
                  '--secondary-color': settings.secondaryColor,
                  '--accent-color': settings.accentColor
                }}
              >
                {/* Header Preview */}
                <div className="preview-header">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt={settings.companyName} className="preview-logo" />
                  ) : (
                    <div className="preview-logo-text">{settings.companyName}</div>
                  )}
                  <div className="preview-nav">
                    <span>Dashboard</span>
                    <span>Strategies</span>
                    <span>Analytics</span>
                  </div>
                </div>

                {/* Content Preview */}
                <div className="preview-content">
                  <h1>Welcome to {settings.companyName}</h1>
                  <p>AI-Powered Lead Management & Automation</p>

                  <div className="preview-cards">
                    <div className="preview-card">
                      <div className="preview-card-icon" style={{ background: settings.primaryColor }}>
                        📊
                      </div>
                      <h3>Total Leads</h3>
                      <div className="preview-value">1,234</div>
                    </div>

                    <div className="preview-card">
                      <div className="preview-card-icon" style={{ background: settings.secondaryColor }}>
                        🎯
                      </div>
                      <h3>Conversions</h3>
                      <div className="preview-value">567</div>
                    </div>

                    <div className="preview-card">
                      <div className="preview-card-icon" style={{ background: settings.accentColor }}>
                        ⚡
                      </div>
                      <h3>Active</h3>
                      <div className="preview-value">89</div>
                    </div>
                  </div>

                  <button
                    className="preview-button"
                    style={{
                      background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`
                    }}
                  >
                    Get Started
                  </button>
                </div>

                {/* Footer Preview */}
                <div className="preview-footer">
                  <p>{settings.footerText}</p>
                  {!settings.hideLeadSyncBranding && (
                    <p className="powered-by">Powered by LeadSync</p>
                  )}
                  {settings.supportEmail && (
                    <p>Contact: {settings.supportEmail}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WhiteLabel;
