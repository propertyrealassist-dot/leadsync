import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import Dashboard from './components/Dashboard';
import AIAgents from './components/AIAgents';
import StrategyEditor from './components/StrategyEditor';
import ConversationViewer from './components/ConversationViewer';
import ConversationTest from './components/ConversationTest';
import Conversations from './components/Conversations';
import Appointments from './components/Appointments';
import Integrations from './components/Integrations';
import Settings from './components/Settings';
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
            <h1 className="logo">
              <img src="/logo.png" alt="LeadSync" className="logo-image" />
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
                  onClick={(e) => { e.preventDefault(); handleNavigation('/'); }}
                  className={`sidebar-item ${isActive('/') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="sidebar-icon">📊</span>
                  <span>Dashboard</span>
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
                  onClick={(e) => { e.preventDefault(); handleNavigation('/test'); }}
                  className={`sidebar-item ${isActive('/test') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="sidebar-icon">✨</span>
                  <span>Test AI</span>
                </a>
              </div>

              <div className="sidebar-section">
                <span className="sidebar-label">APPOINTMENTS</span>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/appointments'); }}
                  className={`sidebar-item ${isActive('/appointments') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="sidebar-icon">📅</span>
                  <span>Appointments</span>
                </a>
              </div>

              <div className="sidebar-section">
                <span className="sidebar-label">SETTINGS</span>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/integrations'); }}
                  className={`sidebar-item ${isActive('/integrations') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="sidebar-icon">🔗</span>
                  <span>Integrations</span>
                </a>
                <a
                  onClick={(e) => { e.preventDefault(); handleNavigation('/settings'); }}
                  className={`sidebar-item ${isActive('/settings') ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="sidebar-icon">⚙️</span>
                  <span>Settings</span>
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/strategies" element={<AIAgents />} />
            <Route path="/strategy/new" element={<StrategyEditor />} />
            <Route path="/strategy/edit/:id" element={<StrategyEditor />} />
            <Route path="/ai-agents/edit/:id" element={<StrategyEditor />} />
            <Route path="/conversation/:id" element={<ConversationViewer />} />
            <Route path="/test" element={<ConversationTest />} />
            <Route path="/appointments" element={<Appointments />} />
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