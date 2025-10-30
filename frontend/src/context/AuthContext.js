import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('leadsync_token'));

  // Check token expiry on mount and periodically
  useEffect(() => {
    const checkTokenExpiry = () => {
      const expiryTime = localStorage.getItem('leadsync_token_expiry');
      if (expiryTime && Date.now() > parseInt(expiryTime)) {
        console.log('⚠️ Token expired, logging out');
        logout();
        return false;
      }
      return true;
    };

    // Check immediately
    if (token && checkTokenExpiry()) {
      loadUser();
    } else {
      setLoading(false);
    }

    // Check every minute
    const interval = setInterval(() => {
      if (token) {
        checkTokenExpiry();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [token]);

  // Load user data from API
  const loadUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setUser(response.data.data.user);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      // If token is invalid, clear it
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  // Register new user
  const register = async (userData) => {
    try {
      console.log('Sending registration request to:', `${API_URL}/api/auth/register`);

      const response = await axios.post(
        `${API_URL}/api/auth/register`,
        userData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Registration response:', response.data);

      if (response.data.success) {
        const { user, token } = response.data.data;

        // Store token with 30-day expiry
        const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days in milliseconds
        localStorage.setItem('leadsync_token', token);
        localStorage.setItem('leadsync_token_expiry', expiryTime.toString());
        setToken(token);
        setUser(user);

        console.log('✅ Token stored with expiry:', new Date(expiryTime).toLocaleString());

        return { success: true, user };
      }
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Registration failed. Please try again.'
      };
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      console.log('Sending login request to:', `${API_URL}/api/auth/login`);
      console.log('Payload:', { email, password: '***' });

      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        {
          email,
          password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Login response:', response.data);

      if (response.data.success) {
        const { user, token } = response.data.data;

        // Store token with 30-day expiry
        const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days in milliseconds
        localStorage.setItem('leadsync_token', token);
        localStorage.setItem('leadsync_token_expiry', expiryTime.toString());
        setToken(token);
        setUser(user);

        console.log('✅ Token stored with expiry:', new Date(expiryTime).toLocaleString());

        return { success: true, user };
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Login failed. Please try again.'
      };
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('leadsync_token');
    localStorage.removeItem('leadsync_token_expiry');
    setToken(null);
    setUser(null);
  };

  // Update user data (for API key regeneration, etc.)
  const updateUser = (updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!user && !!token;
  };

  const value = {
    user,
    token,
    loading,
    register,
    login,
    logout,
    updateUser,
    isAuthenticated,
    loadUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
