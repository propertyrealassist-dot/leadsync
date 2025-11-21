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

  // Logout function (defined early so we can use it in interceptor)
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    console.log('✅ Logged out successfully');
  };

  // Setup axios interceptor to handle auth errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Only logout on SPECIFIC auth-related errors, not general 401/403
        if (error.response) {
          const status = error.response.status;
          const errorMsg = error.response.data?.error || '';
          const errorMessage = error.response.data?.message || '';

          // Persistent debug logging
          const debugInfo = {
            timestamp: new Date().toISOString(),
            status,
            errorMsg,
            errorMessage,
            url: error.config?.url,
            fullData: error.response.data
          };

          console.log('🔍 Axios interceptor caught error:', debugInfo);

          // Store in localStorage so it persists across redirects
          const logs = JSON.parse(localStorage.getItem('AUTH_DEBUG_LOGS') || '[]');
          logs.push(debugInfo);
          // Keep only last 10 logs
          if (logs.length > 10) logs.shift();
          localStorage.setItem('AUTH_DEBUG_LOGS', JSON.stringify(logs));

          // TEMPORARILY DISABLED - Only logout on explicit token verification failures from /api/auth/me
          // This prevents unnecessary logouts while we debug the issue
          const isAuthError =
            (status === 401 || status === 403) &&
            error.config?.url?.includes('/api/auth/me');

          console.log('🔍 Is this an auth error?', isAuthError);

          if (isAuthError) {
            console.warn('⚠️ Auth token invalid or user not found - logging out');
            localStorage.setItem('LOGOUT_REASON', JSON.stringify(debugInfo));
            handleLogout();
            // Redirect to login
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      // Show debug info if available
      const logoutReason = localStorage.getItem('LOGOUT_REASON');
      if (logoutReason) {
        console.log('📋 Last logout reason:', JSON.parse(logoutReason));
        console.log('📋 To view all auth error logs, run: JSON.parse(localStorage.getItem("AUTH_DEBUG_LOGS"))');
      }

      if (token && userStr) {
        try {
          const userData = JSON.parse(userStr);

          // CRITICAL: Restore axios header on page load
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          setUser(userData);
          console.log('✅ Auth restored from storage');
        } catch (error) {
          console.error('Failed to restore auth:', error);
          localStorage.clear();
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  // Register new user
  const register = async (name, email, password) => {
    try {
      console.log('🔐 Sending register request...');

      const response = await axios.post(`${API_URL}/api/auth/register`, {
        name,
        email,
        password,
      });

      console.log('📥 Full register response:', JSON.stringify(response.data, null, 2));

      // Handle different response structures
      let token, userData;

      if (response.data.data) {
        console.log('📦 Using nested data structure');
        token = response.data.data.token;
        userData = response.data.data.user;
      } else if (response.data.token) {
        console.log('📦 Using flat structure');
        token = response.data.token;
        userData = response.data.user;
      } else {
        console.error('❌ Unknown response structure:', response.data);
        throw new Error('Invalid response - no token found');
      }

      console.log('🔑 Token extracted:', token ? '✅ YES' : '❌ NO');
      console.log('👤 User extracted:', userData ? '✅ YES' : '❌ NO');

      if (!token || !userData) {
        throw new Error('Invalid response structure');
      }

      // Store everything
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      // Set axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setUser(userData);
      console.log('✅ Registration complete!');

      return { success: true };
    } catch (error) {
      console.error('❌ Register error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Registration failed',
      };
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      console.log('🔐 Sending login request to:', `${API_URL}/api/auth/login`);

      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });

      console.log('📥 Full login response:', JSON.stringify(response.data, null, 2));

      // Handle different response structures
      let token, userData;

      if (response.data.data) {
        // Nested: { success: true, data: { token, user } }
        console.log('📦 Using nested data structure');
        token = response.data.data.token;
        userData = response.data.data.user;
      } else if (response.data.token) {
        // Flat: { token, user }
        console.log('📦 Using flat structure');
        token = response.data.token;
        userData = response.data.user;
      } else {
        console.error('❌ Unknown response structure:', response.data);
        throw new Error('Invalid response - no token found');
      }

      console.log('🔑 Token extracted:', token ? '✅ YES' : '❌ NO');
      console.log('👤 User extracted:', userData ? '✅ YES' : '❌ NO');
      console.log('👤 User data:', userData);

      if (!token) {
        throw new Error('No token in response');
      }

      if (!userData) {
        throw new Error('No user data in response');
      }

      // Store everything
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      // Set axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setUser(userData);
      console.log('✅ Login complete! Token and user saved.');

      return { success: true };
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('Error details:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Login failed',
      };
    }
  };

  // Logout user (use the handleLogout function)
  const logout = handleLogout;

  // Update user data (for API key regeneration, etc.)
  const updateUser = (updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    const storedToken = localStorage.getItem('token');
    return !!storedToken;
  };

  const value = {
    user,
    loading,
    register,
    login,
    logout,
    updateUser,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
