import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NavigationProvider } from './context/NavigationContext';
import Sidebar from './components/Sidebar';
import Home from './components/Home';
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
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import TestAI from './pages/TestAI';
import Snapshots from './pages/Snapshots';
import Calendar from './pages/Calendar';
import Leads from './pages/Leads';
import Header from './components/Header';
import AccountSettings from './components/AccountSettings';
import Billing from './components/Billing';
import APIKeys from './components/APIKeys';
import UserSettings from './components/UserSettings';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ToastProvider } from './components/ToastContainer';
import './fonts.css';
import './App.css';

function AppContent() {
  const { isAuthenticated } = useAuth();

  // Create animated background elements ONCE
  useEffect(() => {
    if (!isAuthenticated()) return;

    // Check if stars already exist
    if (document.querySelector('.stars-container')) return;

    const starsContainer = document.createElement('div');
    starsContainer.className = 'stars-container';
    document.body.insertBefore(starsContainer, document.body.firstChild);

    // Generate stars
    for (let i = 0; i < 100; i++) {
      const star = document.createElement('div');
      const size = Math.random();
      star.className = 'star ' + (size < 0.5 ? 'star-small' : size < 0.85 ? 'star-medium' : 'star-large');
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 5}s`;
      starsContainer.appendChild(star);
    }

    // Generate particles
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      const size = Math.random();
      particle.className = 'particle ' + (size < 0.4 ? 'particle-small' : size < 0.8 ? 'particle-medium' : 'particle-large');
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 30}s`;
      starsContainer.appendChild(particle);
    }

    // Generate shooting stars
    for (let i = 0; i < 5; i++) {
      const shootingStar = document.createElement('div');
      shootingStar.className = 'shooting-star';
      shootingStar.style.top = `${Math.random() * 50}%`;
      shootingStar.style.left = `${Math.random() * 50}%`;
      shootingStar.style.animationDelay = `${Math.random() * 10}s`;
      starsContainer.appendChild(shootingStar);
    }

    return () => {
      if (starsContainer && starsContainer.parentNode) {
        starsContainer.parentNode.removeChild(starsContainer);
      }
    };
  }, [isAuthenticated]);

  // If not authenticated, show login page
  if (!isAuthenticated()) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Main authenticated layout
  return (
    <div className="App">
      <Sidebar />
      <main
        className="main-content"
        style={{
          marginLeft: '260px',
          width: 'calc(100% - 260px)',
          minHeight: '100vh',
          position: 'relative'
        }}
      >
        <Header />
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/strategies" element={<AIAgents />} />
          <Route path="/strategy/new" element={<StrategyEditor />} />
          <Route path="/strategy/edit/:id" element={<StrategyEditor />} />
          <Route path="/ai-agents/edit/:id" element={<StrategyEditor />} />
          <Route path="/conversation/:id" element={<ConversationViewer />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/copilot" element={<CoPilot />} />
          <Route path="/test" element={<ConversationTest />} />
          <Route path="/test-ai" element={<TestAI />} />
          <Route path="/snapshots" element={<Snapshots />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/analytics" element={<Analytics />} />
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
                <UserSettings />
              </ProtectedRoute>
            }
          />
          <Route path="/account" element={<AccountSettings />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/api-keys" element={<APIKeys />} />
          <Route path="/login" element={<Navigate to="/home" replace />} />
          <Route path="/register" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <NavigationProvider>
            <AppContent />
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={true}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="dark"
            />
          </NavigationProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
