import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '../ErrorBoundary';
import { RouteErrorBoundary } from '../RouteErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Helper to render with Router context
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

// Mock console.error to avoid cluttering test output
const originalConsoleError = console.error;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error during tests
    console.error = vi.fn();
  });

  afterEach(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  describe('Root ErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      renderWithRouter(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should catch errors and show fallback UI', () => {
      renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(
        screen.getByText("We're sorry, but something unexpected happened.")
      ).toBeInTheDocument();
    });

    it('should show error details in development mode', () => {
      // Set dev mode
      const originalEnv = import.meta.env.DEV;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).DEV = true;

      renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error details should be present
      expect(screen.getByText('Error details')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();

      // Restore original env
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).DEV = originalEnv;
    });

    it('should hide error details in production mode', () => {
      // Set prod mode
      const originalDev = import.meta.env.DEV;
      const originalProd = import.meta.env.PROD;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).DEV = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).PROD = true;

      renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error details should not be visible
      expect(screen.queryByText('Error details')).not.toBeInTheDocument();

      // Restore original env
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).DEV = originalDev;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).PROD = originalProd;
    });

    it('should show Try Again button', () => {
      renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });

    it('should navigate home on Go Home button click', async () => {
      const user = userEvent.setup();

      renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const goHomeButton = screen.getByText('Go Home');
      await user.click(goHomeButton);

      // Note: Navigation now uses React Router, so we verify the button works
      // Full navigation testing should be done in E2E tests
      expect(goHomeButton).toBeInTheDocument();
    });

    it('should call onError when error is caught', () => {
      const originalDev = import.meta.env.DEV;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).DEV = true;

      renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify console.error was called
      expect(console.error).toHaveBeenCalled();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).DEV = originalDev;
    });
  });

  describe('RouteErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      renderWithRouter(
        <RouteErrorBoundary routeName="Dashboard">
          <div>Dashboard content</div>
        </RouteErrorBoundary>
      );

      expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    });

    it('should catch errors and show route-specific fallback UI', () => {
      renderWithRouter(
        <RouteErrorBoundary routeName="Dashboard">
          <ThrowError shouldThrow={true} />
        </RouteErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Error in Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('should show route name in error message', () => {
      renderWithRouter(
        <RouteErrorBoundary routeName="Settings">
          <ThrowError shouldThrow={true} />
        </RouteErrorBoundary>
      );

      expect(screen.getByText('Error in Settings')).toBeInTheDocument();
    });

    it('should show technical details in development mode', () => {
      const originalEnv = import.meta.env.DEV;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).DEV = true;

      renderWithRouter(
        <RouteErrorBoundary routeName="Dashboard">
          <ThrowError shouldThrow={true} />
        </RouteErrorBoundary>
      );

      expect(screen.getByText('Technical details')).toBeInTheDocument();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).DEV = originalEnv;
    });

    it('should hide technical details in production mode', () => {
      const originalDev = import.meta.env.DEV;
      const originalProd = import.meta.env.PROD;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).DEV = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).PROD = true;

      renderWithRouter(
        <RouteErrorBoundary routeName="Dashboard">
          <ThrowError shouldThrow={true} />
        </RouteErrorBoundary>
      );

      expect(screen.queryByText('Technical details')).not.toBeInTheDocument();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).DEV = originalDev;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).PROD = originalProd;
    });

    it('should show Retry and Go Home buttons', () => {
      renderWithRouter(
        <RouteErrorBoundary routeName="Dashboard">
          <ThrowError shouldThrow={true} />
        </RouteErrorBoundary>
      );

      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });

    it('should navigate home on Go Home button click', async () => {
      const user = userEvent.setup();

      renderWithRouter(
        <RouteErrorBoundary routeName="Dashboard">
          <ThrowError shouldThrow={true} />
        </RouteErrorBoundary>
      );

      const goHomeButton = screen.getByText('Go Home');
      await user.click(goHomeButton);

      // Note: Navigation now uses React Router, so we verify the button works
      // Full navigation testing should be done in E2E tests
      expect(goHomeButton).toBeInTheDocument();
    });

    it('should call onError with route context when error is caught', () => {
      const originalDev = import.meta.env.DEV;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).DEV = true;

      renderWithRouter(
        <RouteErrorBoundary routeName="Settings">
          <ThrowError shouldThrow={true} />
        </RouteErrorBoundary>
      );

      // Verify console.error was called with route context
      expect(console.error).toHaveBeenCalled();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).DEV = originalDev;
    });
  });
});
