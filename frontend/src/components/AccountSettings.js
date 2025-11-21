import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AccountSettings.css';

const AccountSettings = () => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    timezone: 'America/New_York',
    language: 'en'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [profileImage, setProfileImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        console.error('No token found in AccountSettings');
        setLoading(false);
        return;
      }

      console.log('AccountSettings: Loading user data with token...');

      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('AccountSettings: User data loaded:', response.data);

      const userData = response.data;
      setUser(userData);

      // Format the name properly
      const fullName = userData.name ||
                       [userData.firstName, userData.lastName].filter(Boolean).join(' ') ||
                       'User';

      console.log('AccountSettings: Setting form data with name:', fullName);

      setFormData({
        name: fullName,
        email: userData.email || '',
        phone: userData.phone || '',
        company: userData.companyName || userData.company || '',
        timezone: userData.timezone || 'America/New_York',
        language: userData.language || 'en'
      });

      // Load images if they exist
      setProfileImage(userData.profileImage || null);
      setBannerImage(userData.bannerImage || null);
    } catch (error) {
      console.error('AccountSettings: Failed to load user data:', error);
      console.error('AccountSettings: Error status:', error.response?.status);
      console.error('AccountSettings: Error message:', error.response?.data);

      // If 401 or 403, token is invalid - redirect to login
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('AccountSettings: Token invalid or expired, redirecting to login...');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }

      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to load user data' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/auth/update-profile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      loadUserData();
    } catch (error) {
      console.error('Failed to update profile:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/auth/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Failed to change password:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 5MB' });
      return;
    }

    setUploadingProfile(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/auth/upload-profile-image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setProfileImage(response.data.profileImage);
      setMessage({ type: 'success', text: 'Profile picture updated!' });
    } catch (error) {
      console.error('Failed to upload profile image:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to upload image' });
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleBannerImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 10MB' });
      return;
    }

    setUploadingBanner(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('bannerImage', file);

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/auth/upload-banner-image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setBannerImage(response.data.bannerImage);
      setMessage({ type: 'success', text: 'Banner image updated!' });
    } catch (error) {
      console.error('Failed to upload banner image:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to upload image' });
    } finally {
      setUploadingBanner(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
  };

  if (loading) {
    return (
      <div className="account-settings">
        <div className="settings-loading">
          <div className="spinner"></div>
          <p>Loading account settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-settings">
      <div className="settings-header">
        <h1>👤 Account Settings</h1>
        <p>Manage your personal information and preferences</p>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      <div className="settings-grid">
        {/* Banner Image Section */}
        {bannerImage && (
          <div className="settings-card banner-card">
            <div className="banner-image-container">
              <img src={bannerImage} alt="Banner" className="banner-image" />
              <label className="banner-upload-overlay">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerImageUpload}
                  style={{ display: 'none' }}
                  disabled={uploadingBanner}
                />
                <span>{uploadingBanner ? 'Uploading...' : 'Change Banner'}</span>
              </label>
            </div>
          </div>
        )}

        {/* Profile Picture Section */}
        <div className="settings-card profile-card">
          {!bannerImage && (
            <div className="profile-banner-upload">
              <label className="banner-upload-button">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerImageUpload}
                  style={{ display: 'none' }}
                  disabled={uploadingBanner}
                />
                {uploadingBanner ? 'Uploading Banner...' : '📷 Add Banner Image'}
              </label>
            </div>
          )}
          {profileImage ? (
            <img src={profileImage} alt="Profile" className="profile-avatar-large" />
          ) : (
            <div className="profile-avatar-large">
              {getInitials(user?.name)}
            </div>
          )}
          <h3>{user?.name || 'User'}</h3>
          <p className="profile-email">{user?.email}</p>
          <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleProfileImageUpload}
              style={{ display: 'none' }}
              disabled={uploadingProfile}
            />
            {uploadingProfile ? 'Uploading...' : '📷 Upload Photo'}
          </label>
        </div>

        {/* Personal Information */}
        <div className="settings-card">
          <h2>Personal Information</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="form-group">
              <label>Company</label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Your company name"
              />
            </div>

            <div className="form-group">
              <label>Timezone</label>
              <select name="timezone" value={formData.timezone} onChange={handleChange}>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Language</label>
              <select name="language" value={formData.language} onChange={handleChange}>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Password Change */}
        <div className="settings-card">
          <h2>Change Password</h2>
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                placeholder="Enter current password"
                required
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder="Enter new password (min 6 characters)"
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Confirm new password"
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Account Actions */}
        <div className="settings-card danger-card">
          <h2>⚠️ Danger Zone</h2>
          <p>These actions are permanent and cannot be undone.</p>

          <button className="btn-danger" disabled>
            Delete Account (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
