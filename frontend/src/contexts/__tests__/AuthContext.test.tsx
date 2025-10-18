import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useAuth, AuthProvider } from '../AuthContext';
import { tokenStorage, apiClient } from '@/lib/axios';
import type { ReactNode } from 'react';

// Mock axios
vi.mock('@/lib/axios', async () => {
  const actual = await vi.importActual<typeof import('@/lib/axios')>('@/lib/axios');
  return {
    ...actual,
    apiClient: {
      post: vi.fn(),
      get: vi.fn(),
    },
    logout: vi.fn(),
  };
});

// Mock dynamic imports for auth mocks
vi.mock('@/mocks/auth', () => ({
  mockLogin: vi.fn().mockResolvedValue({
    user: { id: '1', email: 'test@example.com', name: 'Test User' },
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  }),
  mockRegister: vi.fn().mockResolvedValue({
    user: { id: '1', email: 'test@example.com', name: 'Test User' },
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  }),
  mockUserProfile: {
    id: '1',
    email: 'user@example.com',
    name: 'Test User',
  },
}));

describe('AuthContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <BrowserRouter>
      <AuthProvider>{children}</AuthProvider>
    </BrowserRouter>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    tokenStorage.clearTokens();
    // Set to dev mode for tests
    (import.meta.env as any).DEV = true;
    (import.meta.env as any).PROD = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should attempt token refresh on mount', async () => {
      const mockPost = vi.mocked(apiClient.post);
      mockPost.mockResolvedValueOnce({
        data: { accessToken: 'refreshed-token' },
      } as any);

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/v1/auth/refresh', {});
      });
    });

    it('should set user after successful token refresh', async () => {
      const mockPost = vi.mocked(apiClient.post);
      mockPost.mockResolvedValueOnce({
        data: { accessToken: 'refreshed-token' },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toEqual({
          id: '1',
          email: 'user@example.com',
          name: 'Test User',
        });
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should handle failed token refresh gracefully', async () => {
      const mockPost = vi.mocked(apiClient.post);
      mockPost.mockRejectedValueOnce(new Error('Refresh failed'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
    });

    it('should clear tokens on failed refresh', async () => {
      const mockPost = vi.mocked(apiClient.post);
      mockPost.mockRejectedValueOnce(new Error('Refresh failed'));

      const clearSpy = vi.spyOn(tokenStorage, 'clearTokens');

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(clearSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockPost = vi.mocked(apiClient.post);
      mockPost.mockResolvedValueOnce({
        data: { accessToken: 'initial-token' },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Login
      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.user).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should store access token on successful login', async () => {
      const mockPost = vi.mocked(apiClient.post);
      mockPost.mockResolvedValueOnce({
        data: { accessToken: 'initial-token' },
      } as any);

      const setSpy = vi.spyOn(tokenStorage, 'setAccessToken');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(setSpy).toHaveBeenCalledWith('mock-access-token');
    });

    it('should throw error on login failure', async () => {
      const mockPost = vi.mocked(apiClient.post);
      mockPost.mockResolvedValueOnce({
        data: { accessToken: 'initial-token' },
      } as any);

      const { mockLogin } = await import('@/mocks/auth');
      vi.mocked(mockLogin).mockRejectedValueOnce(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(async () => {
        await act(async () => {
          await result.current.login('test@example.com', 'wrong-password');
        });
      }).rejects.toThrow('Invalid credentials');
    });

    it('should not update user state on login failure', async () => {
      const mockPost = vi.mocked(apiClient.post);
      // Make initialization fail so user starts as null
      mockPost.mockRejectedValueOnce(new Error('No refresh token'));

      const { mockLogin } = await import('@/mocks/auth');
      vi.mocked(mockLogin).mockRejectedValueOnce(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify user is null after initialization
      expect(result.current.user).toBeNull();

      try {
        await act(async () => {
          await result.current.login('test@example.com', 'wrong-password');
        });
      } catch {
        // Expected to fail
      }

      // User should still be null after failed login
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Register', () => {
    it('should register successfully with valid data', async () => {
      const mockPost = vi.mocked(apiClient.post);
      mockPost.mockResolvedValueOnce({
        data: { accessToken: 'initial-token' },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.register('new@example.com', 'password123', 'New User');
      });

      expect(result.current.user).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should register without name (optional)', async () => {
      const mockPost = vi.mocked(apiClient.post);
      mockPost.mockResolvedValueOnce({
        data: { accessToken: 'initial-token' },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.register('new@example.com', 'password123');
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should store access token on successful registration', async () => {
      const mockPost = vi.mocked(apiClient.post);
      mockPost.mockResolvedValueOnce({
        data: { accessToken: 'initial-token' },
      } as any);

      const setSpy = vi.spyOn(tokenStorage, 'setAccessToken');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.register('new@example.com', 'password123', 'New User');
      });

      expect(setSpy).toHaveBeenCalledWith('mock-access-token');
    });

    it('should throw error on registration failure', async () => {
      const mockPost = vi.mocked(apiClient.post);
      mockPost.mockResolvedValueOnce({
        data: { accessToken: 'initial-token' },
      } as any);

      const { mockRegister } = await import('@/mocks/auth');
      vi.mocked(mockRegister).mockRejectedValueOnce(new Error('Email already exists'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(async () => {
        await act(async () => {
          await result.current.register('existing@example.com', 'password123');
        });
      }).rejects.toThrow('Email already exists');
    });
  });

  describe('Logout', () => {
    it('should clear user state on logout', async () => {
      const mockPost = vi.mocked(apiClient.post);
      mockPost.mockResolvedValueOnce({
        data: { accessToken: 'initial-token' },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Login first
      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Logout
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should call apiLogout on logout', async () => {
      const mockPost = vi.mocked(apiClient.post);
      mockPost.mockResolvedValueOnce({
        data: { accessToken: 'initial-token' },
      } as any);

      const { logout: apiLogout } = await import('@/lib/axios');
      const logoutSpy = vi.mocked(apiLogout);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(logoutSpy).toHaveBeenCalled();
    });
  });

  describe('Hook Usage', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      console.error = originalError;
    });

    it('should provide auth context when used within AuthProvider', async () => {
      const mockPost = vi.mocked(apiClient.post);
      mockPost.mockResolvedValueOnce({
        data: { accessToken: 'initial-token' },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('logout');
      expect(result.current).toHaveProperty('register');
    });
  });
});
