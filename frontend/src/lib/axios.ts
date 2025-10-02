/**
 * Axios configuration with JWT interceptors
 * SECURITY: Uses httpOnly cookies for refresh tokens and in-memory storage for access tokens
 * This prevents XSS attacks from accessing sensitive tokens
 */
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// API base URL from environment variable or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/**
 * Axios instance with default configuration
 * withCredentials: true enables sending cookies with cross-origin requests
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required for cookie-based authentication
});

/**
 * In-memory token storage for access tokens
 * SECURITY: Access tokens are never persisted to localStorage or sessionStorage
 * This provides XSS protection - even if an attacker injects malicious code,
 * they cannot access tokens from localStorage
 */
let accessTokenMemory: string | null = null;

/**
 * Secure token storage utilities
 * Refresh tokens are stored in httpOnly cookies (managed by backend)
 * Access tokens are stored in memory only
 */
export const tokenStorage = {
  /**
   * Get access token from memory
   */
  getAccessToken: (): string | null => {
    return accessTokenMemory;
  },

  /**
   * Set access token in memory
   */
  setAccessToken: (token: string): void => {
    accessTokenMemory = token;
  },

  /**
   * Clear access token from memory
   * Refresh token is cleared by backend when logout endpoint is called
   */
  clearTokens: (): void => {
    accessTokenMemory = null;
  },

  /**
   * Check if user has an access token
   */
  hasAccessToken: (): boolean => {
    return accessTokenMemory !== null;
  },
};

/**
 * Flag to prevent multiple simultaneous refresh requests
 */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
}> = [];

/**
 * Process queued requests after token refresh
 */
const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

/**
 * Request interceptor: Add Authorization header with JWT token
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor: Handle 401 errors and refresh tokens
 * SECURITY: Uses httpOnly cookies for refresh tokens (sent automatically by browser)
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the access token
        // Refresh token is sent automatically via httpOnly cookie
        const response = await axios.post(
          `${API_BASE_URL}/v1/auth/refresh`,
          {},
          {
            withCredentials: true, // Send cookies with request
          }
        );

        const { accessToken } = response.data;

        // Store new access token in memory
        tokenStorage.setAccessToken(accessToken);

        // Update Authorization header and retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Refresh failed, clear tokens and redirect to login
        tokenStorage.clearTokens();
        window.location.href = '/login';

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Helper function to check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return tokenStorage.hasAccessToken();
};

/**
 * Helper function to logout user
 * Calls backend logout endpoint to clear httpOnly cookie
 */
export const logout = async (): Promise<void> => {
  try {
    // Call backend to clear refresh token cookie
    await apiClient.post('/v1/auth/logout');
  } catch (error) {
    // Even if backend call fails, clear local token
    console.error('Logout error:', error);
  } finally {
    // Clear access token from memory
    tokenStorage.clearTokens();
    window.location.href = '/login';
  }
};
