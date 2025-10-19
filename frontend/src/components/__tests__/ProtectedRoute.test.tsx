import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { AuthProvider } from '@/contexts/AuthContext';
import * as AuthContext from '@/contexts/AuthContext';
import type { ReactNode } from 'react';

// Mock AuthContext
vi.mock('@/contexts/AuthContext', async () => {
  const actual =
    await vi.importActual<typeof import('@/contexts/AuthContext')>('@/contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

// Mock axios to prevent initialization errors
vi.mock('@/lib/axios', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  tokenStorage: {
    getAccessToken: vi.fn(),
    setAccessToken: vi.fn(),
    clearTokens: vi.fn(),
  },
  logout: vi.fn(),
  setNavigationCallback: vi.fn(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderProtectedRoute = (children: ReactNode) => {
    return render(
      <BrowserRouter>
        <ProtectedRoute>{children}</ProtectedRoute>
      </BrowserRouter>
    );
  };

  describe('Loading State', () => {
    it('should show loading indicator when authentication is loading', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: true,
        isAuthenticated: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      renderProtectedRoute(<div>Protected Content</div>);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should not show protected content while loading', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: true,
        isAuthenticated: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      renderProtectedRoute(<div>Protected Content</div>);

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should not show authentication required message while loading', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: true,
        isAuthenticated: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      renderProtectedRoute(<div>Protected Content</div>);

      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });

    it('should center loading indicator in viewport', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: true,
        isAuthenticated: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      renderProtectedRoute(<div>Protected Content</div>);

      const loadingContainer = screen.getByText('Loading...').parentElement;
      expect(loadingContainer).toHaveStyle({
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      });
    });
  });

  describe('Unauthenticated State', () => {
    it('should show authentication required message when not authenticated', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      renderProtectedRoute(<div>Protected Content</div>);

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('Please log in to access this page.')).toBeInTheDocument();
    });

    it('should not show protected content when not authenticated', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      renderProtectedRoute(<div>Protected Content</div>);

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should center authentication message in viewport', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      renderProtectedRoute(<div>Protected Content</div>);

      const authContainer = screen.getByText('Authentication Required').parentElement;
      expect(authContainer).toHaveStyle({
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '20px',
      });
    });

    it('should display authentication heading as h2', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      renderProtectedRoute(<div>Protected Content</div>);

      const heading = screen.getByText('Authentication Required');
      expect(heading.tagName).toBe('H2');
    });
  });

  describe('Authenticated State', () => {
    it('should render children when authenticated', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      renderProtectedRoute(<div>Protected Content</div>);

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should not show loading indicator when authenticated', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      renderProtectedRoute(<div>Protected Content</div>);

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should not show authentication required message when authenticated', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      renderProtectedRoute(<div>Protected Content</div>);

      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });

    it('should render multiple children when authenticated', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      renderProtectedRoute(
        <>
          <div>Content 1</div>
          <div>Content 2</div>
          <div>Content 3</div>
        </>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.getByText('Content 3')).toBeInTheDocument();
    });

    it('should render complex component trees when authenticated', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      renderProtectedRoute(
        <div>
          <h1>Dashboard</h1>
          <nav>
            <a href="/profile">Profile</a>
          </nav>
          <main>Main Content</main>
        </div>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Main Content')).toBeInTheDocument();
    });
  });

  describe('State Transitions', () => {
    it('should transition from loading to authenticated', () => {
      const { rerender } = render(
        <BrowserRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      );

      // Initially loading
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: true,
        isAuthenticated: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      rerender(
        <BrowserRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Then authenticated
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      rerender(
        <BrowserRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      );

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should transition from loading to unauthenticated', () => {
      const { rerender } = render(
        <BrowserRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      );

      // Initially loading
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: true,
        isAuthenticated: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      rerender(
        <BrowserRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Then unauthenticated
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      rerender(
        <BrowserRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      );

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });

    it('should handle logout transition from authenticated to unauthenticated', () => {
      const { rerender } = render(
        <BrowserRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      );

      // Initially authenticated
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      rerender(
        <BrowserRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();

      // After logout
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      rerender(
        <BrowserRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null children gracefully', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      const { container } = renderProtectedRoute(null);

      // Should render without crashing
      expect(container).toBeInTheDocument();
    });

    it('should handle undefined children gracefully', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      const { container } = renderProtectedRoute(undefined);

      // Should render without crashing
      expect(container).toBeInTheDocument();
    });

    it('should prioritize loading state over authentication state', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isLoading: true,
        isAuthenticated: true, // Authenticated but still loading
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      renderProtectedRoute(<div>Protected Content</div>);

      // Should show loading, not content
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });
});
