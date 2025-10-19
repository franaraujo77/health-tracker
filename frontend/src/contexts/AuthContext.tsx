/**
 * Authentication Context Provider
 * Manages user authentication state and provides auth methods
 * SECURITY: Uses httpOnly cookies for refresh tokens and in-memory storage for access tokens
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { tokenStorage, logout as apiLogout, apiClient } from '../lib/axios';

interface User {
  id: string;
  email: string;
  name?: string;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount and attempt to refresh
  useEffect(() => {
    const initializeAuth = async () => {
      // SECURITY: Try to refresh token from httpOnly cookie
      // If user has a valid refresh token cookie, we'll get a new access token
      try {
        const response = await apiClient.post('/v1/auth/refresh', {});
        const { accessToken } = response.data;

        if (accessToken) {
          tokenStorage.setAccessToken(accessToken);

          // Fetch user profile
          if (import.meta.env.DEV) {
            // Development mode: use mock user profile
            const { mockUserProfile } = await import('../mocks/auth');
            setUser(mockUserProfile);
          } else {
            // Production mode: fetch from /auth/me endpoint
            const userResponse = await apiClient.get('/v1/auth/me');
            setUser(userResponse.data);
          }
        }
      } catch (error) {
        // No valid refresh token or it expired
        // User needs to login again
        console.debug('Token refresh failed during initialization:', error);
        tokenStorage.clearTokens();
        setUser(null);
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    // SECURITY: Use mocks only in development mode
    // Production builds will use real API endpoints
    if (import.meta.env.DEV) {
      // Development mode: use mock authentication
      const { mockLogin } = await import('../mocks/auth');
      const response = await mockLogin(email, password);

      tokenStorage.setAccessToken(response.accessToken);
      setUser(response.user);
    } else {
      // Production mode: use real API
      const response = await apiClient.post('/v1/auth/login', { email, password });
      tokenStorage.setAccessToken(response.data.accessToken);

      // Fetch user profile
      const userResponse = await apiClient.get('/v1/auth/me');
      setUser(userResponse.data);
    }
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const register = async (email: string, password: string, name?: string) => {
    // SECURITY: Use mocks only in development mode
    // Production builds will use real API endpoints
    if (import.meta.env.DEV) {
      // Development mode: use mock authentication
      const { mockRegister } = await import('../mocks/auth');
      const response = await mockRegister(email, password, name);

      tokenStorage.setAccessToken(response.accessToken);
      setUser(response.user);
    } else {
      // Production mode: use real API
      const response = await apiClient.post('/v1/auth/register', { email, password, name });
      tokenStorage.setAccessToken(response.data.accessToken);

      // Fetch user profile
      const userResponse = await apiClient.get('/v1/auth/me');
      setUser(userResponse.data);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
