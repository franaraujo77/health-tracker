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

/**
 * Mock authentication functions
 * In production, these will use the apiClient to call backend endpoints
 */
const mockLogin = async (
  email: string,
  password: string
): Promise<{ user: User; accessToken: string; refreshToken: string }> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mock validation
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  // Mock user data
  return {
    user: {
      id: '1',
      email,
      name: email.split('@')[0],
    },
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };
};

const mockRegister = async (
  email: string,
  password: string,
  name?: string
): Promise<{ user: User; accessToken: string; refreshToken: string }> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mock validation
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  // Mock user data
  return {
    user: {
      id: '1',
      email,
      name: name || email.split('@')[0],
    },
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };
};

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
          // TODO: Implement /auth/me endpoint
          // const userResponse = await apiClient.get('/v1/auth/me');
          // setUser(userResponse.data);

          // Mock user data for now
          setUser({
            id: '1',
            email: 'user@example.com',
            name: 'Test User',
          });
        }
      } catch (error) {
        // No valid refresh token or it expired
        // User needs to login again
        tokenStorage.clearTokens();
        setUser(null);
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    // TODO: Replace mock with real API call when backend is ready
    // For now, use mock data
    const response = await mockLogin(email, password);

    // SECURITY: Only store access token in memory
    // Refresh token is automatically stored in httpOnly cookie by backend
    tokenStorage.setAccessToken(response.accessToken);

    // Set user
    setUser(response.user);

    /* Production implementation:
    const response = await apiClient.post('/v1/auth/login', { email, password });
    tokenStorage.setAccessToken(response.data.accessToken);

    // Fetch user profile
    const userResponse = await apiClient.get('/v1/auth/me');
    setUser(userResponse.data);
    */
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const register = async (email: string, password: string, name?: string) => {
    // TODO: Replace mock with real API call when backend is ready
    const response = await mockRegister(email, password, name);

    // SECURITY: Only store access token in memory
    // Refresh token is automatically stored in httpOnly cookie by backend
    tokenStorage.setAccessToken(response.accessToken);

    // Set user
    setUser(response.user);

    /* Production implementation:
    const response = await apiClient.post('/v1/auth/register', { email, password, name });
    tokenStorage.setAccessToken(response.data.accessToken);

    // Fetch user profile
    const userResponse = await apiClient.get('/v1/auth/me');
    setUser(userResponse.data);
    */
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
