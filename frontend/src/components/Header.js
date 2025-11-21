import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [user, setUser] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        console.log('No token found');
        return;
      }

      console.log('Loading user data with token...');

      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('User data loaded:', response.data);
      setUser(response.data);

    } catch (error) {
      console.error('Failed to load user data:', error);
      // Don't auto-logout - let user stay logged in
      // Pages will handle auth errors individually if needed
    }
  };

  const handleLogout = () => {
    console.log('Logout clicked in Header');
    setShowDropdown(false);
    logout();
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getBadge = () => {
    return { text: 'FREE', color: '#6b7280' };
  };

  // Only show search bar on specific pages
  const showSearchBar = location.pathname === '/conversations' ||
                        location.pathname === '/strategies' ||
                        location.pathname.startsWith('/ai-agents');

  if (!user) {
    return (
      <div className="header">
        {showSearchBar && (
          <div className="header-search">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search strategies, conversations..."
              className="search-input"
            />
          </div>
        )}
        <div className="header-actions">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  const badge = getBadge();

  return (
    <div className="header">
      {showSearchBar && (
        <div className="header-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search strategies, conversations..."
            className="search-input"
          />
        </div>
      )}

      <div className="header-actions">
        <div className="header-user" ref={dropdownRef}>
          <button
            className="user-button"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="user-avatar">
              {getInitials(user.name)}
            </div>
            <div className="user-info">
              <span className="user-name">{user.name || user.email}</span>
              <span className="user-badge" style={{ backgroundColor: badge.color }}>
                {badge.text}
              </span>
            </div>
            <span className="dropdown-arrow">▼</span>
          </button>

          {showDropdown && (
            <div className="user-dropdown-menu">
              {/* Header Section */}
              <div className="dropdown-section">
                <div className="dropdown-user-info">
                  <div className="dropdown-avatar">
                    {getInitials(user.name)}
                  </div>
                  <div className="dropdown-user-details">
                    <div className="dropdown-user-name">{user.name || 'User'}</div>
                    <div className="dropdown-user-email">{user.email}</div>
                    <span className="dropdown-badge" style={{ backgroundColor: badge.color }}>
                      {badge.text} PLAN
                    </span>
                  </div>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              {/* Menu Items */}
              <div className="dropdown-section">
                <button
                  className="dropdown-menu-item"
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/account');
                  }}
                >
                  <span className="menu-item-icon">👤</span>
                  <div className="menu-item-content">
                    <div className="menu-item-title">Account Settings</div>
                    <div className="menu-item-subtitle">Manage your profile</div>
                  </div>
                </button>

                <button
                  className="dropdown-menu-item"
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/billing');
                  }}
                >
                  <span className="menu-item-icon">💳</span>
                  <div className="menu-item-content">
                    <div className="menu-item-title">Billing & Subscription</div>
                    <div className="menu-item-subtitle">Manage your {badge.text} plan</div>
                  </div>
                </button>

                <button
                  className="dropdown-menu-item"
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/integrations');
                  }}
                >
                  <span className="menu-item-icon">🔑</span>
                  <div className="menu-item-content">
                    <div className="menu-item-title">API Keys</div>
                    <div className="menu-item-subtitle">Manage integrations</div>
                  </div>
                </button>

                <button
                  className="dropdown-menu-item"
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/settings');
                  }}
                >
                  <span className="menu-item-icon">⚙️</span>
                  <div className="menu-item-content">
                    <div className="menu-item-title">Settings</div>
                    <div className="menu-item-subtitle">Preferences & privacy</div>
                  </div>
                </button>
              </div>

              <div className="dropdown-divider"></div>

              {/* Upgrade Section */}
              <div className="dropdown-section">
                <div className="dropdown-upgrade">
                  <div className="upgrade-content">
                    <div className="upgrade-title">Upgrade to Pro</div>
                    <div className="upgrade-subtitle">Unlock advanced features</div>
                  </div>
                  <button
                    className="upgrade-button"
                    onClick={() => {
                      setShowDropdown(false);
                      navigate('/billing');
                    }}
                  >
                    Upgrade
                  </button>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              {/* Logout */}
              <div className="dropdown-section">
                <button
                  className="dropdown-logout"
                  onClick={handleLogout}
                >
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Header;
