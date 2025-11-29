// api/client.js - Enhanced API client with improved token management
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

export const api = axios.create({ 
  baseURL: `${API_BASE_URL}/api/users`,
  timeout: 15000, // Increased timeout for better reliability
  headers: {
    'Content-Type': 'application/json',
  }
});

// Track if we're currently refreshing to avoid multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    // Get token from AsyncStorage if not already in headers
    if (!config.headers.Authorization) {
      const token = await AsyncStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Enhanced response interceptor for robust token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem("refreshToken");
        
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        console.log('API Client: Attempting token refresh...');
        
        // Make refresh request
        const response = await axios.post(`${API_BASE_URL}/api/users/refresh/`, {
          refresh: refreshToken
        });
        
        const { access } = response.data;
        
        if (!access) {
          throw new Error("No access token received from refresh");
        }
        
        // Store new access token
        await AsyncStorage.setItem("accessToken", access);
        
        // Update default headers for future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        
        // Process queued requests
        processQueue(null, access);
        
        console.log('API Client: Token refreshed successfully');
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        console.error('API Client: Token refresh failed:', refreshError);
        
        // Process queued requests with error
        processQueue(refreshError, null);
        
        // Clear tokens and auth headers
        await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
        delete api.defaults.headers.common['Authorization'];
        
        // You might want to emit an event here to redirect to login
        // or you can handle this in your app's error boundary
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Handle network errors gracefully
    if (!error.response) {
      console.warn('API Client: Network error:', error.message);
      // Don't clear tokens for network errors
      return Promise.reject({
        ...error,
        message: 'Network error. Please check your connection.',
        isNetworkError: true
      });
    }
    
    return Promise.reject(error);
  }
);

// Helper function to set auth header manually if needed
export const setAuthHeader = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Helper function to clear auth header
export const clearAuthHeader = () => {
  delete api.defaults.headers.common['Authorization'];
};

export default api;