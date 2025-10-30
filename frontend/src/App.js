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
import './App.css';

function AppContent() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { navigate } = useNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Create animated stars and particles background
  useEffect(() => {
    // Create stars container
    const starsContainer = document.createElement('div');
    starsContainer.className = 'stars-container';
    document.body.insertBefore(starsContainer, document.body.firstChild);

    // Generate 100 stars
    for (let i = 0; i < 100; i++) {
      const star = document.createElement('div');
      const size = Math.random();

      star.className = size < 0.6 ? 'star star-small' :
                       size < 0.9 ? 'star star-medium' :
                       'star star-large';

      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 5}s`;

      starsContainer.appendChild(star);
    }

    // Generate 20 floating particles
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 15}s`;
      starsContainer.appendChild(particle);
    }

    return () => {
      if (starsContainer.parentNode) {
        starsContainer.parentNode.removeChild(starsContainer);
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
            <h1 className="logo" onClick={() => handleNavigation('/')} style={{ cursor: 'pointer', margin: 0 }}>
              <img
                src={`${process.env.PUBLIC_URL}/logo.png`}
                alt="LeadSync"
                className="logo-image"
                style={{
                  height: '50px',
                  width: 'auto',
                  transition: 'filter 0.3s ease, transform 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.filter = 'drop-shadow(0 0 12px rgba(139, 92, 246, 0.8))';
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.filter = 'none';
                  e.target.style.transform = 'scale(1)';
                }}
                onError={(e) => {
                  console.error('❌ Logo failed to load from:', e.target.src);
                  // Fallback to text if image fails
                  e.target.style.display = 'none';
                  const fallback = document.createElement('span');
                  fallback.textContent = 'LeadSync';
                  fallback.style.cssText = 'color: #EC4899; font-size: 24px; font-weight: bold; cursor: pointer;';
                  e.target.parentElement.appendChild(fallback);
                }}
              />
            </h1>
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
          <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-content">
              <div className="sidebar-section">
                <span className="sidebar-label">MENU</span>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/home'); }}
                  className={`sidebar-item ${isActive('/home') || isActive('/') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="sidebar-icon">🏠</span>
                  <span>Home</span>
                </a>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/strategies'); }}
                  className={`sidebar-item ${isActive('/strategies') || location.pathname.includes('/strategy') || location.pathname.includes('/agents') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="sidebar-icon">🎯</span>
                  <span>Strategies</span>
                </a>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/copilot'); }}
                  className={`sidebar-item ${isActive('/copilot') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="sidebar-icon">🤖</span>
                  <span>Co-Pilot</span>
                </a>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/test'); }}
                  className={`sidebar-item ${isActive('/test') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="sidebar-icon">✨</span>
                  <span>Test AI</span>
                </a>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/analytics'); }}
                  className={`sidebar-item ${isActive('/analytics') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="sidebar-icon">📊</span>
                  <span>Analytics</span>
                </a>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/integrations'); }}
                  className={`sidebar-item ${isActive('/integrations') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="sidebar-icon">🔗</span>
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
                  <span className="sidebar-icon">👥</span>
                  <span>Team Management</span>
                  <span className="badge-new">NEW</span>
                </a>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/analytics/advanced'); }}
                  className={`sidebar-item ${isActive('/analytics/advanced') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="sidebar-icon">📈</span>
                  <span>Advanced Analytics</span>
                  <span className="badge-new">NEW</span>
                </a>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/white-label'); }}
                  className={`sidebar-item ${isActive('/white-label') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="sidebar-icon">🎨</span>
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