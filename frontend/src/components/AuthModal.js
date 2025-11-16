import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Icons from './Icons';
import './AuthModal.css';

function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    company: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let result;
      if (mode === 'login') {
        result = await login(formData.email, formData.password);
      } else {
        result = await register(
          formData.email,
          formData.password,
          formData.name,
          formData.company
        );
      }

      if (result.success) {
        onClose();
        navigate('/home');
      } else {
        setError(result.error || `${mode === 'login' ? 'Login' : 'Registration'} failed. Please try again.`);
      }
    } catch (err) {
      console.error(`${mode} error:`, err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    if (error) setError(null);
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
    setFormData({
      email: '',
      password: '',
      name: '',
      company: ''
    });
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <div className="auth-modal-gradient-bg">
          {[...Array(50)].map((_, i) => (
            <div key={i} className="star" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`
            }} />
          ))}
        </div>

        <div className="auth-modal-content">
          <div className="auth-modal-header">
            <div className="auth-logo">
              <Icons.CoPilot size={48} color="#8B5CF6" />
            </div>
            <h1>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
            <p>
              {mode === 'login'
                ? 'Sign in to access your AI agents and manage leads'
                : 'Get started with LeadSync AI automation'}
            </p>
          </div>

          {error && (
            <div className="auth-modal-error">
              <Icons.AlertCircle size={20} color="#ef4444" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-modal-form">
            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label>
                    <Icons.User size={18} color="#8B5CF6" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                    autoComplete="name"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Icons.Settings size={18} color="#8B5CF6" />
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Acme Inc."
                    required
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>
                <Icons.Mail size={18} color="#8B5CF6" />
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label>
                <Icons.Lock size={18} color="#8B5CF6" />
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn-gradient btn-large btn-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Icons.Loading size={20} color="#ffffff" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <Icons.ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="auth-modal-toggle">
            <p>
              {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
              <button onClick={toggleMode} className="toggle-link">
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          {mode === 'login' && (
            <div className="auth-modal-features">
              <div className="feature-item">
                <Icons.CheckCircle size={16} color="#10b981" />
                <span>AI Lead Management</span>
              </div>
              <div className="feature-item">
                <Icons.CheckCircle size={16} color="#10b981" />
                <span>Automated Conversations</span>
              </div>
              <div className="feature-item">
                <Icons.CheckCircle size={16} color="#10b981" />
                <span>GHL Integration</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
