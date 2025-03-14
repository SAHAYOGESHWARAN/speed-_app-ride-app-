import axios from 'axios';
import { refreshToken } from './authService';
import { getCookie } from './cookieUtils';

// Configuration
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000, // 10 seconds timeout
  withCredentials: process.env.NODE_ENV === 'production', // For CSRF cookies
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Security Middleware
let authInterceptor = null;
let errorInterceptor = null;
let csrfToken = null;
let logoutHandler = () => {};

// Request Interceptor
API.interceptors.request.use(
  async (config) => {
    // Add CSRF token for mutating operations
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      csrfToken = csrfToken || getCookie('XSRF-TOKEN');
      if (csrfToken) {
        config.headers['X-XSRF-TOKEN'] = csrfToken;
      }
    }

    // Add Authorization token
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request fingerprint
    config.headers['X-Client-ID'] = localStorage.getItem('deviceId') || 'unknown';

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

API.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', response);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle network errors
    if (!error.response) {
      error.response = { 
        data: { 
          code: 'NETWORK_ERROR',
          message: 'Unable to connect to the server' 
        } 
      };
    }

    // Handle token expiration (401 errors)
    if (error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => API(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { accessToken, refreshToken: newRefreshToken } = await refreshToken();
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        API.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        
        processQueue(null, accessToken);
        return API(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logoutHandler();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    const errorData = error.response.data || {};
    const normalizedError = {
      code: errorData.code || 'UNKNOWN_ERROR',
      message: errorData.message || 'An unexpected error occurred',
      status: error.response.status,
      timestamp: new Date().toISOString(),
      path: originalRequest.url
    };

    // Log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', normalizedError);
    }

    return Promise.reject(normalizedError);
  }
);

// Security Functions
export const setLogoutHandler = (logout) => {
  logoutHandler = logout;
};

export const setCSRFToken = (token) => {
  csrfToken = token;
};

// Request Cancellation
export const createCancelToken = () => {
  return axios.CancelToken.source();
};

// Error Types
export const API_ERRORS = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
};

export default API;