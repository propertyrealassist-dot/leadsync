import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('leadsync_token');
      const userJson = await AsyncStorage.getItem('leadsync_user');

      if (token && userJson) {
        const userData = JSON.parse(userJson);
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.auth.login(email, password);
      const { token, user: userData } = response.data.data;

      // Store token and user data
      await AsyncStorage.setItem('leadsync_token', token);
      await AsyncStorage.setItem('leadsync_user', JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const message =
        error.response?.data?.error || 'Login failed. Please try again.';
      return { success: false, error: message };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await api.auth.register(email, password, name);
      const { token, user: userData } = response.data.data;

      // Store token and user data
      await AsyncStorage.setItem('leadsync_token', token);
      await AsyncStorage.setItem('leadsync_user', JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      const message =
        error.response?.data?.error || 'Registration failed. Please try again.';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      // Clear storage
      await AsyncStorage.removeItem('leadsync_token');
      await AsyncStorage.removeItem('leadsync_user');

      // Clear state
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
