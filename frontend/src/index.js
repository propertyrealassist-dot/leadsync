import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import './styles/global.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Global axios interceptor to add organization header to ALL requests
axios.interceptors.request.use(
  (config) => {
    // Add auth token (use leadsync_token key)
    const token = localStorage.getItem('leadsync_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add organization ID to ALL requests
    const currentOrganizationId = localStorage.getItem('currentOrganizationId');
    if (currentOrganizationId) {
      config.headers['X-Organization-Id'] = currentOrganizationId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);