import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
// iOS Simulator: http://localhost:3001 works directly
// Android Emulator: Use http://10.0.2.2:3001
// Physical Device: Use http://YOUR_LOCAL_IP:3001
const API_URL = 'http://192.168.0.197:3001'; // ← UPDATED for physical device!

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to all requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('leadsync_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token from AsyncStorage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      if (status === 401) {
        // Unauthorized - token expired or invalid
        console.log('Unauthorized - clearing token');
        await AsyncStorage.removeItem('leadsync_token');
        // You can emit an event here to navigate to login screen
      }

      console.error('API Error:', status, data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }

    return Promise.reject(error);
  }
);

// API Methods
export const api = {
  // Auth endpoints
  auth: {
    login: (email, password) =>
      apiClient.post('/api/auth/login', { email, password }),
    register: (email, password, name) =>
      apiClient.post('/api/auth/register', { email, password, name }),
  },

  // Templates (Strategies/AI Agents)
  templates: {
    getAll: () => apiClient.get('/api/templates'),
    getOne: (id) => apiClient.get(`/api/templates/${id}`),
    create: (data) => apiClient.post('/api/templates', data),
    update: (id, data) => apiClient.put(`/api/templates/${id}`, data),
    delete: (id) => apiClient.delete(`/api/templates/${id}`),
  },

  // Conversations
  conversations: {
    getAll: () => apiClient.get('/api/conversations'),
    getOne: (id) => apiClient.get(`/api/conversations/${id}`),
    start: (templateId, contactName, contactPhone) =>
      apiClient.post('/api/conversations/start', {
        templateId,
        contactName,
        contactPhone,
      }),
    sendMessage: (conversationId, message) =>
      apiClient.post(`/api/conversations/${conversationId}/message`, {
        message,
      }),
  },

  // Appointments
  appointments: {
    getAll: () => apiClient.get('/api/appointments'),
    getOne: (id) => apiClient.get(`/api/appointments/${id}`),
    create: (data) => apiClient.post('/api/appointments', data),
  },

  // Health check
  health: () => apiClient.get('/api/health'),
};

export default apiClient;
