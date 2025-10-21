import { lazy, Suspense, useEffect } from 'react';

import { useLocation } from 'react-router-dom';

import './App.css';
import { RouteErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ThemeToggle } from './components/ThemeToggle';
import { useAuth } from './contexts/AuthContext';
import { prefetchNextRoutes } from './utils/prefetch';

// Lazy load page and heavy components for code splitting
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({ default: module.LoginPage }))
);
const AuthError = lazy(() =>
  import('./pages/AuthError').then((module) => ({ default: module.AuthError }))
);
const HealthDataEntryForm = lazy(() =>
  import('./components/HealthDataEntryForm').then((module) => ({
    default: module.HealthDataEntryForm,
  }))
);
const HealthMetricsList = lazy(() =>
  import('./components/HealthMetricsList').then((module) => ({ default: module.HealthMetricsList }))
);
const PerformanceDashboard = lazy(() =>
  import('./components/PerformanceDashboard').then((module) => ({
    default: module.PerformanceDashboard,
  }))
);

function App() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const location = useLocation();

  // Prefetch routes based on authentication state
  useEffect(() => {
    if (!isLoading) {
      prefetchNextRoutes(isAuthenticated);
    }
  }, [isAuthenticated, isLoading]);

  // Show error page if on /error route (handles redirect loop errors)
  if (location.pathname === '/error') {
    return (
      <RouteErrorBoundary routeName="Error">
        <Suspense fallback={<LoadingSpinner />}>
          <AuthError />
        </Suspense>
      </RouteErrorBoundary>
    );
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <RouteErrorBoundary routeName="Authentication">
        <Suspense fallback={<LoadingSpinner />}>
          <LoginPage />
        </Suspense>
      </RouteErrorBoundary>
    );
  }

  return (
    <RouteErrorBoundary routeName="Dashboard">
      <div className="App">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px',
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>Health Tracker</h1>
            <p style={{ margin: '5px 0 0 0', color: '#666' }}>
              Welcome, {user?.name || user?.email}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <ThemeToggle variant="icon-button" />
            <button
              onClick={logout}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          <p>XState 5.x State Machine + React Query + Axios JWT Demo</p>

          <Suspense
            fallback={
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <LoadingSpinner />
              </div>
            }
          >
            <div style={{ marginTop: '40px' }}>
              <h2>Data Entry (XState)</h2>
              <HealthDataEntryForm />
            </div>

            <div style={{ marginTop: '40px', borderTop: '2px solid #e0e0e0', paddingTop: '40px' }}>
              <h2>Metrics List (React Query)</h2>
              <HealthMetricsList />
            </div>

            <div style={{ marginTop: '40px', borderTop: '2px solid #e0e0e0', paddingTop: '40px' }}>
              <PerformanceDashboard />
            </div>
          </Suspense>
        </div>
      </div>
    </RouteErrorBoundary>
  );
}

export default App;
