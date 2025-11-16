import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        const response = await axios.post(`${API_URL}/api/auth/register`, {
          name: formData.name,
          email: formData.email,
          password: formData.password
        });

        localStorage.setItem('token', response.data.token);
        await login(formData.email, formData.password);
        toast.success('Account created successfully! Welcome to LeadSync!');
        navigate('/home');
      } else {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
        navigate('/home');
      }
    } catch (error) {
      console.error('Auth error:', error);
      const errorMsg = error.response?.data?.error || 'Authentication failed. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-animated-background">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="login-star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-logo">
            <div className="logo-icon">LS</div>
            <h1>LeadSync</h1>
          </div>

          <div className="login-content">
            <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="login-subtitle">
              {mode === 'login'
                ? 'Sign in to access your AI lead management'
                : 'Start your journey with LeadSync'
              }
            </p>

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Smith"
                    required
                    autoFocus
                  />
                </div>
              )}

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  autoFocus={mode === 'login'}
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                />
              </div>

              {mode === 'register' && (
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                className="btn-login"
                disabled={loading}
              >
                {loading ? '⏳ Loading...' : mode === 'login' ? '🚀 Sign In' : '✨ Create Account'}
              </button>

              {mode === 'login' && (
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => navigate('/forgot-password')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#8B5CF6',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      padding: '0'
                    }}
                    onMouseOver={(e) => e.target.style.color = '#EC4899'}
                    onMouseOut={(e) => e.target.style.color = '#8B5CF6'}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </form>

            <div className="login-switch">
              {mode === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <button onClick={() => setMode('register')} type="button">
                    Sign Up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button onClick={() => setMode('login')} type="button">
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
