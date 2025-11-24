import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icons from './Icons';
import OrganizationSwitcher from './OrganizationSwitcher';
import './Sidebar.css';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/home', icon: Icons.Home, label: 'Home' },
    { path: '/strategies', icon: Icons.Target, label: 'Strategies' },
    { path: '/copilot', icon: Icons.CoPilot, label: 'Co-Pilot' },
    { path: '/test-ai', icon: Icons.TestAI, label: 'Test AI' },
    { path: '/analytics', icon: Icons.Analytics, label: 'Analytics' },
    { path: '/integrations', icon: Icons.Integrations, label: 'Integrations' }
  ];

  const enterpriseItems = [
    // Removed for now - will be implemented later
    // { path: '/team', icon: Icons.Team, label: 'Team Management', badge: 'NEW' },
    // { path: '/analytics/advanced', icon: Icons.AdvancedAnalytics, label: 'Advanced Analytics', badge: 'NEW' }
  ];

  return (
    <div
      className="sidebar"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '260px',
        height: '100vh',
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(20px)',
        borderRight: '2px solid rgba(139, 92, 246, 0.4)',
        boxShadow: '4px 0 20px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Logo Section */}
      <div
        className="logo-section"
        onClick={() => navigate('/home')}
        style={{
          flexShrink: 0,
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}
      >
        <div style={{
          width: '42px',
          height: '42px',
          background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
          borderRadius: '11px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(139, 92, 246, 0.5)',
          transition: 'all 0.3s'
        }}>
          <span style={{
            fontSize: '20px',
            fontWeight: 800,
            color: 'white'
          }}>LS</span>
        </div>
        <div style={{
          fontSize: '22px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          LeadSync
        </div>
      </div>

      {/* Organization Switcher */}
      <div style={{ padding: '0 20px 20px 20px', borderBottom: '1px solid rgba(139, 92, 246, 0.2)' }}>
        <OrganizationSwitcher />
      </div>

      {/* Scrollable Menu */}
      <div
        className="sidebar-menu"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '20px 0'
        }}
      >
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
