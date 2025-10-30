import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import AIAgents from './components/AIAgents';
import StrategyEditor from './components/StrategyEditor';
import ConversationViewer from './components/ConversationViewer';
import ConversationTest from './components/ConversationTest';
import Conversations from './components/Conversations';
import Appointments from './components/Appointments';
import Analytics from './components/Analytics';
import CoPilot from './components/CoPilot';
import Integrations from './components/Integrations';
import Settings from './components/Settings';
import TeamManagement from './components/TeamManagement';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import WhiteLabel from './components/WhiteLabel';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import Icons from './components/Icons';
import './App.css';

function AppContent() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { navigate } = useNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Track scroll position for sidebar effects
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Create animated stars and particles background
  useEffect(() => {
    // Create stars container
    const starsContainer = document.createElement('div');
    starsContainer.className = 'stars-container';
    document.body.insertBefore(starsContainer, document.body.firstChild);

    // Generate 150 stars (more than before)
    for (let i = 0; i < 150; i++) {
      const star = document.createElement('div');
      const size = Math.random();

      star.className = 'star ' + (
        size < 0.5 ? 'star-small' :
        size < 0.85 ? 'star-medium' :
        'star-large'
      );

      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 5}s`;

      starsContainer.appendChild(star);
    }

    // Generate 40 floating particles (more than before)
    for (let i = 0; i < 40; i++) {
      const particle = document.createElement('div');
      const size = Math.random();

      particle.className = 'particle ' + (
        size < 0.4 ? 'particle-small' :
        size < 0.8 ? 'particle-medium' :
        'particle-large'
      );

      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 30}s`;

      starsContainer.appendChild(particle);
    }

    // Create 5 shooting stars
    for (let i = 0; i < 5; i++) {
      const shootingStar = document.createElement('div');
      shootingStar.className = 'shooting-star';
      shootingStar.style.top = `${Math.random() * 50}%`;
      shootingStar.style.left = `${Math.random() * 50}%`;
      shootingStar.style.animationDelay = `${Math.random() * 10}s`;
      starsContainer.appendChild(shootingStar);
    }

    // Create energy wave effect
    const energyWave = document.createElement('div');
    energyWave.className = 'energy-wave';
    document.body.insertBefore(energyWave, document.body.firstChild);

    // Cleanup
    return () => {
      if (starsContainer.parentNode) {
        starsContainer.parentNode.removeChild(starsContainer);
      }
      if (energyWave.parentNode) {
        energyWave.parentNode.removeChild(energyWave);
      }
    };
  }, []);

  const isActive = (path) => location.pathname === path;

  // Check if current page is login or register (hide navbar/sidebar)
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const handleLogout = () => {
    logout();
    routerNavigate('/login');
    setShowUserMenu(false);
  };

  // Close sidebar on mobile after navigation
  const handleNavigation = (path) => {
    navigate(path);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Get user initials for badge
  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="App">
      {/* Top Navbar - Hidden on auth pages */}
      {!isAuthPage && (
        <nav className="navbar">
          <div className="nav-container">
            <button
              className="hamburger-menu"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div
              className="logo-container"
              onClick={() => handleNavigation('/')}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px',
                margin: 0,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                const iconBox = e.currentTarget.querySelector('.logo-icon-box');
                if (iconBox) {
                  iconBox.style.transform = 'scale(1.1) rotate(5deg)';
                  iconBox.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.6)';
                }
              }}
              onMouseLeave={(e) => {
                const iconBox = e.currentTarget.querySelector('.logo-icon-box');
                if (iconBox) {
                  iconBox.style.transform = 'scale(1) rotate(0deg)';
                  iconBox.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
                }
              }}
            >
              {/* Simple LS Icon */}
              <div
                className="logo-icon-box"
                style={{
                  width: '42px',
                  height: '42px',
                  background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                  transition: 'all 0.3s ease'
                }}
              >
                LS
              </div>

              {/* Text Logo */}
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.5px'
                }}
              >
                LeadSync
              </span>
            </div>
            <div className="nav-right">
              {isAuthenticated() ? (
                <div className="user-menu-container">
                  <button
                    className="user-badge"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                  >
                    {getUserInitials()}
                  </button>
                  {showUserMenu && (
                    <div className="user-dropdown">
                      <div className="user-info">
                        <div className="user-name">
                          {user?.firstName && user?.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user?.email}
                        </div>
                        <div className="user-email">{user?.email}</div>
                      </div>
                      <div className="dropdown-divider"></div>
                      <button className="dropdown-item" onClick={() => { handleNavigation('/settings'); setShowUserMenu(false); }}>
                        ⚙️ Settings
                      </button>
                      <button className="dropdown-item" onClick={handleLogout}>
                        🚪 Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="btn-login">
                  Login
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}

      <div className="app-layout">
        {/* Mobile overlay */}
        {!isAuthPage && sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
        )}

        {/* Sidebar - Hidden on auth pages */}
        {!isAuthPage && (
          <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'} ${scrolled ? 'scrolled' : ''}`}>
            {/* Logo Section - Fixed at top */}
            <div
              className="sidebar-logo-section"
              onClick={() => handleNavigation('/home')}
              style={{
                padding: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
                flexShrink: 0,
                transition: 'all 0.3s ease',
                background: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                  transition: 'all 0.3s'
                }}
              >
                LS
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.5px'
                }}
              >
                LeadSync
              </div>
            </div>

            {/* Scrollable Menu Content */}
            <div className="sidebar-content">
              <div className="sidebar-section">
                <span className="sidebar-label">MENU</span>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/home'); }}
                  className={`sidebar-item ${isActive('/home') || isActive('/') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <Icons.Home size={20} className="sidebar-icon" />
                  <span>Home</span>
                </a>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/strategies'); }}
                  className={`sidebar-item ${isActive('/strategies') || location.pathname.includes('/strategy') || location.pathname.includes('/agents') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <Icons.Strategies size={20} className="sidebar-icon" />
                  <span>Strategies</span>
                </a>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/copilot'); }}
                  className={`sidebar-item ${isActive('/copilot') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <Icons.CoPilot size={20} className="sidebar-icon" />
                  <span>Co-Pilot</span>
                </a>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/test'); }}
                  className={`sidebar-item ${isActive('/test') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <Icons.TestAI size={20} className="sidebar-icon" />
                  <span>Test AI</span>
                </a>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/analytics'); }}
                  className={`sidebar-item ${isActive('/analytics') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <Icons.Analytics size={20} className="sidebar-icon" />
                  <span>Analytics</span>
                </a>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/integrations'); }}
                  className={`sidebar-item ${isActive('/integrations') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <Icons.Integrations size={20} className="sidebar-icon" />
                  <span>Integrations</span>
                </a>
              </div>

              <div className="sidebar-section">
                <span className="sidebar-label">ENTERPRISE</span>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/team'); }}
                  className={`sidebar-item ${isActive('/team') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <Icons.Team size={20} className="sidebar-icon" />
                  <span>Team Management</span>
                  <span className="badge-new">NEW</span>
                </a>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/analytics/advanced'); }}
                  className={`sidebar-item ${isActive('/analytics/advanced') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <Icons.AdvancedAnalytics size={20} className="sidebar-icon" />
                  <span>Advanced Analytics</span>
                  <span className="badge-new">NEW</span>
                </a>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/white-label'); }}
                  className={`sidebar-item ${isActive('/white-label') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <Icons.WhiteLabel size={20} className="sidebar-icon" />
                  <span>White Label</span>
                  <span className="badge-new">NEW</span>
                </a>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className={`main-content ${isAuthPage ? 'auth-page' : ''}`}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/strategies" element={<AIAgents />} />
            <Route path="/strategy/new" element={<StrategyEditor />} />
            <Route path="/strategy/edit/:id" element={<StrategyEditor />} />
            <Route path="/ai-agents/edit/:id" element={<StrategyEditor />} />
            <Route path="/conversation/:id" element={<ConversationViewer />} />
            <Route path="/copilot" element={<CoPilot />} />
            <Route path="/test" element={<ConversationTest />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route
              path="/team"
              element={
                <ProtectedRoute>
                  <TeamManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics/advanced"
              element={
                <ProtectedRoute>
                  <AdvancedAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/white-label"
              element={
                <ProtectedRoute>
                  <WhiteLabel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/integrations"
              element={
                <ProtectedRoute>
                  <Integrations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <NavigationProvider>
          <AppContent />
        </NavigationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;