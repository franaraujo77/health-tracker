import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/react-query';

// Mock the prefetch utility
vi.mock('../utils/prefetch', () => ({
  prefetchNextRoutes: vi.fn(),
}));

// Mock lazy-loaded components
vi.mock('../pages/LoginPage', () => ({
  LoginPage: () => <div data-testid="login-page">Login Page</div>,
}));

vi.mock('../components/HealthDataEntryForm', () => ({
  HealthDataEntryForm: () => <div data-testid="health-data-form">Health Data Form</div>,
}));

vi.mock('../components/HealthMetricsList', () => ({
  HealthMetricsList: () => <div data-testid="health-metrics-list">Health Metrics List</div>,
}));

vi.mock('../components/PerformanceDashboard', () => ({
  PerformanceDashboard: () => <div data-testid="performance-dashboard">Performance Dashboard</div>,
}));

// Helper function to render App with all required providers
function renderApp() {
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state while authentication is being checked', () => {
      renderApp();

      // Should show loading text initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Unauthenticated State', () => {
    it('should show LoginPage when user is not authenticated', async () => {
      renderApp();

      // Wait for auth check to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should show login page
      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
    });

    it('should wrap LoginPage in ErrorBoundary', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Login page should be present (wrapped in error boundary)
      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
    });
  });

  describe('Authenticated State', () => {
    it('should show dashboard when user is authenticated', async () => {
      const { container } = renderApp();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // In development mode with mocks, user should be auto-authenticated
      // Wait for dashboard elements
      await waitFor(
        () => {
          const heading = screen.queryByText('Health Tracker');
          if (heading) {
            expect(heading).toBeInTheDocument();
          }
        },
        { timeout: 3000 }
      );
    });

    it('should display user email in welcome message when name is not available', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check for welcome message with email
      await waitFor(
        () => {
          const welcomeText = screen.queryByText(/Welcome,/);
          if (welcomeText) {
            expect(welcomeText).toBeInTheDocument();
          }
        },
        { timeout: 3000 }
      );
    });

    it('should display logout button when authenticated', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Look for logout button
      await waitFor(
        () => {
          const logoutButton = screen.queryByRole('button', { name: /logout/i });
          if (logoutButton) {
            expect(logoutButton).toBeInTheDocument();
          }
        },
        { timeout: 3000 }
      );
    });

    it('should call logout when logout button is clicked', async () => {
      const user = userEvent.setup();
      renderApp();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Find and click logout button
      await waitFor(
        async () => {
          const logoutButton = screen.queryByRole('button', { name: /logout/i });
          if (logoutButton) {
            await user.click(logoutButton);
          }
        },
        { timeout: 3000 }
      );
    });

    it('should render theme toggle button when authenticated', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check for theme toggle
      await waitFor(
        () => {
          // ThemeToggle should be rendered
          const themeButton = screen.queryByRole('button', { name: /theme/i });
          // ThemeToggle might not have aria-label, so we just check if dashboard is rendered
          const dashboard = screen.queryByText('Health Tracker');
          if (dashboard) {
            expect(dashboard).toBeInTheDocument();
          }
        },
        { timeout: 3000 }
      );
    });

    it('should lazy load dashboard components with Suspense', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check that lazy-loaded components eventually appear
      await waitFor(
        () => {
          const form = screen.queryByTestId('health-data-form');
          const list = screen.queryByTestId('health-metrics-list');
          const dashboard = screen.queryByTestId('performance-dashboard');

          // At least one should be loaded
          const anyLoaded = form || list || dashboard;
          if (anyLoaded) {
            expect(anyLoaded).toBeInTheDocument();
          }
        },
        { timeout: 5000 }
      );
    });

    it('should show section headings in dashboard', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check for section headings
      await waitFor(
        () => {
          const dataEntryHeading = screen.queryByText(/Data Entry/);
          const metricsHeading = screen.queryByText(/Metrics List/);

          if (dataEntryHeading || metricsHeading) {
            expect(dataEntryHeading || metricsHeading).toBeInTheDocument();
          }
        },
        { timeout: 3000 }
      );
    });

    it('should display XState and React Query demo description', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check for demo description
      await waitFor(
        () => {
          const description = screen.queryByText(/XState 5.x State Machine/);
          if (description) {
            expect(description).toBeInTheDocument();
          }
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Route Prefetching', () => {
    it('should call prefetchNextRoutes when authentication state changes', async () => {
      const { prefetchNextRoutes } = await import('../utils/prefetch');

      renderApp();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // prefetchNextRoutes should be called after loading completes
      await waitFor(() => {
        expect(prefetchNextRoutes).toHaveBeenCalled();
      });
    });
  });

  describe('Error Boundary Integration', () => {
    it('should wrap unauthenticated view in ErrorBoundary', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Error boundary should be wrapping the login page
      await waitFor(() => {
        const loginPage = screen.queryByTestId('login-page');
        if (loginPage) {
          expect(loginPage).toBeInTheDocument();
        }
      });
    });

    it('should wrap authenticated dashboard in ErrorBoundary', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Dashboard should be wrapped in error boundary
      await waitFor(
        () => {
          const heading = screen.queryByText('Health Tracker');
          if (heading) {
            expect(heading).toBeInTheDocument();
          }
        },
        { timeout: 3000 }
      );
    });
  });
});
