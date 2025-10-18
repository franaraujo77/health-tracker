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
 * Navigation callback for axios interceptors
 * Since interceptors can't use React hooks, we provide a callback
 * that the App component sets up with useNavigate()
 */
type NavigationCallback = (path: string, options?: { replace?: boolean; state?: unknown }) => void;
let navigationCallback: NavigationCallback | null = null;

export const setNavigationCallback = (callback: NavigationCallback) => {
  navigationCallback = callback;
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
 * Extract CSRF token from cookie
 * SECURITY: Spring Security sends CSRF token in XSRF-TOKEN cookie
 * Frontend must read this and send it back in X-XSRF-TOKEN header
 */
const getCsrfToken = (): string | null => {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

/**
 * Request interceptor: Add Authorization header with JWT token and CSRF token
 * SECURITY: CSRF token is required for state-changing operations (POST, PUT, DELETE, PATCH)
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    const csrfToken = getCsrfToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token for state-changing requests
    // Spring Security checks for X-XSRF-TOKEN header on POST/PUT/DELETE/PATCH
    if (csrfToken && config.headers && config.method) {
      const method = config.method.toUpperCase();
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        config.headers['X-XSRF-TOKEN'] = csrfToken;
      }
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

        // Use SPA navigation if available, fallback to window.location for safety
        if (navigationCallback) {
          navigationCallback('/login', { replace: true });
        } else {
          // Fallback for cases where navigation isn't initialized yet
          window.location.href = '/login';
        }

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
 * Initialize CSRF protection on app startup
 * SECURITY: Makes a GET request to trigger CSRF cookie generation
 * Spring Security will set XSRF-TOKEN cookie which we'll use in subsequent requests
 */
export const initializeCsrf = async (): Promise<void> => {
  try {
    // Make a simple GET request to trigger CSRF cookie generation
    // Backend will set the XSRF-TOKEN cookie in the response
    await apiClient.get('/v1/auth/csrf');
  } catch (error) {
    // CSRF initialization is not critical for GET requests
    // Log but don't block app initialization
    console.debug('CSRF initialization failed:', error);
  }
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

    // Use SPA navigation if available, fallback to window.location for safety
    if (navigationCallback) {
      navigationCallback('/login', { replace: true });
    } else {
      // Fallback for cases where navigation isn't initialized yet
      window.location.href = '/login';
    }
  }
};
