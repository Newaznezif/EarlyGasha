import axios from 'axios';

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '')
).replace(/\/+$/, '');

export const getWebSocketUrl = (path) => {
  const url = new URL(path, API_BASE_URL || window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT into all outgoing requests
api.interceptors.request.use((config) => {
  if (!API_BASE_URL && !import.meta.env.DEV) {
    return Promise.reject(new Error('The backend API is not configured. Set VITE_API_BASE_URL in Vercel project settings.'));
  }

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const authAPI = {
  login: async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // OAuth2 FastAPI compatibility
    formData.append('password', password);
    return api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  },
  googleLogin: async (credential, role) => {
    return api.post('/auth/google', { credential, role });
  },
  register: async (email, password, role) => {
    return api.post('/auth/register', { email, password, role });
  },
  getMe: async () => {
    return api.get('/auth/me');
  }
};

export default api;
