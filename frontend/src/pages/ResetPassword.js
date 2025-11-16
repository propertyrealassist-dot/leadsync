import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setError('No reset token provided');
      setVerifying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/verify-reset-token/${token}`);
      setValidToken(response.data.valid);
      setEmail(response.data.email);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired reset link');
      setValidToken(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, {
        token,
        newPassword
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <div className="auth-logo">LeadSync</div>
          </div>
          <div className="loading-spinner"></div>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginTop: '20px' }}>
            Verifying reset link...
          </p>
        </div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <div className="auth-logo">LeadSync</div>
            <h1>Invalid Link</h1>
            <p>{error || 'This password reset link is invalid or has expired'}</p>
          </div>

          <div className="error-icon">⚠️</div>

          <div className="info-box error">
            <p style={{ margin: 0, fontSize: '14px' }}>
              Password reset links expire after 1 hour for security reasons.
              Please request a new link to continue.
            </p>
          </div>

          <div className="auth-footer" style={{ marginTop: '32px' }}>
            <button
              className="btn-primary"
              onClick={() => navigate('/forgot-password')}
              style={{ width: '100%' }}
            >
              Request New Link
            </button>
            <div style={{ marginTop: '16px' }}>
              <button
                className="btn-link"
                onClick={() => navigate('/login')}
              >
                ← Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <div className="auth-logo">LeadSync</div>
            <h1>Password Reset!</h1>
            <p>Your password has been successfully reset</p>
          </div>

          <div className="success-icon">✅</div>

          <div className="info-box success">
            <p style={{ margin: 0, fontSize: '14px' }}>
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">LeadSync</div>
          <h1>Create New Password</h1>
          <p>Resetting password for <strong>{email}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              disabled={loading}
              minLength={8}
              autoFocus
            />
            <small>At least 8 characters</small>
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-footer">
          <button
            className="btn-link"
            onClick={() => navigate('/login')}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
