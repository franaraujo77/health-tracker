/**
 * Authentication Context Provider
 * Manages user authentication state and provides auth methods
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { tokenStorage, logout as apiLogout } from '../lib/axios';
// apiClient will be used when replacing mock functions with real API calls
// @ts-expect-error - Placeholder for future API integration
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { apiClient } from '../lib/axios';

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

  // Check for existing token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = tokenStorage.getAccessToken();

      if (token) {
        try {
          // In production, fetch user data from /auth/me endpoint
          // const response = await apiClient.get<User>('/auth/me');
          // setUser(response.data);

          // Mock user data for now
          setUser({
            id: '1',
            email: 'user@example.com',
            name: 'Test User',
          });
        } catch {
          // Token is invalid, clear it
          tokenStorage.clearTokens();
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    // In production: const response = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    const response = await mockLogin(email, password);

    // Store tokens
    tokenStorage.setAccessToken(response.accessToken);
    tokenStorage.setRefreshToken(response.refreshToken);

    // Set user
    setUser(response.user);
  };

  const logout = () => {
    apiLogout();
    setUser(null);
  };

  const register = async (email: string, password: string, name?: string) => {
    // In production: const response = await apiClient.post<RegisterResponse>('/auth/register', { email, password, name });
    const response = await mockRegister(email, password, name);

    // Store tokens
    tokenStorage.setAccessToken(response.accessToken);
    tokenStorage.setRefreshToken(response.refreshToken);

    // Set user
    setUser(response.user);
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
