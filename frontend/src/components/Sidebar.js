import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icons from './Icons';
import './Sidebar.css';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/home', icon: Icons.Home, label: 'Home' },
    { path: '/strategies', icon: Icons.Target, label: 'Strategies' },
    { path: '/copilot', icon: Icons.CoPilot, label: 'Co-Pilot' },
    { path: '/test', icon: Icons.TestAI, label: 'Test AI' },
    { path: '/analytics', icon: Icons.Analytics, label: 'Analytics' },
    { path: '/integrations', icon: Icons.Integrations, label: 'Integrations' }
  ];

  const enterpriseItems = [
    { path: '/team', icon: Icons.Team, label: 'Team Management', badge: 'NEW' },
    { path: '/analytics/advanced', icon: Icons.AdvancedAnalytics, label: 'Advanced Analytics', badge: 'NEW' },
    { path: '/white-label', icon: Icons.WhiteLabel, label: 'White Label', badge: 'PRO' }
  ];

  return (
    <div className="sidebar">
      {/* Logo Section */}
      <div
        className="logo-section"
        onClick={() => navigate('/home')}
      >
        <div className="logo-icon">
          <span className="logo-text-short">LS</span>
        </div>
        <div className="logo-text">
          LeadSync
        </div>
      </div>

      {/* Scrollable Menu */}
      <div className="sidebar-menu">
        {/* Main Menu */}
        <div className="menu-section">
          <div className="menu-section-header">MENU</div>
          {menuItems.map(item => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <IconComponent size={20} className="menu-icon" />
                <span className="menu-label">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Enterprise Menu */}
        <div className="menu-section">
          <div className="menu-section-header">ENTERPRISE</div>
          {enterpriseItems.map(item => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <IconComponent size={20} className="menu-icon" />
                <span className="menu-label">{item.label}</span>
                {item.badge && (
                  <span className={`menu-badge ${item.badge.toLowerCase()}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
