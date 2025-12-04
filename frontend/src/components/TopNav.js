import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OrganizationSwitcher from './OrganizationSwitcher';
import { Icons } from './Icons';
import './TopNav.css';

// Additional icons not in Icons.js
const ChevronDown = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Logout = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const menuItems = [
    { path: '/home', icon: Icons.Home, label: 'Home' },
    { path: '/strategies', icon: Icons.Target, label: 'Strategies' },
    { path: '/copilot', icon: Icons.CoPilot, label: 'Co-Pilot' },
    { path: '/test-ai', icon: Icons.TestAI, label: 'Test AI' },
    { path: '/analytics', icon: Icons.Analytics, label: 'Analytics' },
    { path: '/integrations', icon: Icons.Integrations, label: 'Integrations' }
  ];

  const getUserInitials = () => {
    if (!user) return 'U';
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <nav className="top-nav">
      <div className="top-nav-container">
        {/* Logo Section */}
        <div className="top-nav-logo" onClick={() => navigate('/home')}>
          <div className="logo-icon-top">
            <span>LS</span>
          </div>
          <div className="logo-text-top">LeadSync</div>
        </div>

        {/* Navigation Links */}
        <div className="top-nav-links">
          {menuItems.map(item => {
            const IconComponent = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <IconComponent size={18} className="nav-link-icon" />
                <span className="nav-link-label">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right Section */}
        <div className="top-nav-right">
          {/* Organization Switcher */}
          <div className="top-nav-org">
            <OrganizationSwitcher />
          </div>

          {/* Search */}
          <div className="top-nav-search">
            <Icons.Search size={16} />
            <input
              type="text"
              placeholder="Search..."
              className="search-input-top"
            />
          </div>

          {/* User Menu */}
          <div className="top-nav-user">
            <button
              className="user-button-top"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="user-avatar-top">
                {getUserInitials()}
              </div>
              <div className="user-info-top">
                <span className="user-name-top">
                  {user?.firstName || user?.email || 'User'}
                </span>
                <ChevronDown size={14} />
              </div>
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <>
                <div
                  className="dropdown-overlay"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="user-dropdown-top">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      {getUserInitials()}
                    </div>
                    <div className="dropdown-user-details">
                      <div className="dropdown-user-name">
                        {user?.firstName && user?.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user?.email || 'User'}
                      </div>
                      <div className="dropdown-user-email">{user?.email}</div>
                    </div>
                  </div>

                  <div className="dropdown-divider" />

                  <button
                    className="dropdown-menu-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/settings');
                    }}
                  >
                    <Icons.Settings size={18} />
                    <span>Settings</span>
                  </button>

                  <button
                    className="dropdown-menu-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/account');
                    }}
                  >
                    <Icons.User size={18} />
                    <span>Account</span>
                  </button>

                  <div className="dropdown-divider" />

                  <button
                    className="dropdown-menu-item logout-item"
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                  >
                    <Logout size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default TopNav;
