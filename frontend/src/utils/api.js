import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Create axios instance with interceptors
const api = axios.create({
  baseURL: API_URL
});

// Request interceptor to add auth token and organization ID
api.interceptors.request.use(
  (config) => {
    // Add auth token (use leadsync_token key)
    const token = localStorage.getItem('leadsync_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add organization ID
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
