/* eslint-disable react-refresh/only-export-components */
import { StrictMode, Suspense, lazy, useEffect } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { AuthProvider } from './contexts/AuthContext';
import { NavigationProvider } from './contexts/NavigationProvider';
import { queryClient } from './lib/react-query';
import { startInspector } from './lib/xstate';
import { initializeTheme } from './styles/theme';
import { prefetchNextRoutes } from './utils/prefetch';
import { initWebVitals } from './utils/webVitals';

// Lazy load page components for code splitting
const App = lazy(() => import('./App.tsx'));
const ComponentShowcase = lazy(() =>
  import('./pages/ComponentShowcase').then((module) => ({ default: module.ComponentShowcase }))
);

// Initialize theme before React renders to prevent FOUC
initializeTheme();

// Initialize XState inspector in development mode
startInspector();

// Determine which component to render based on URL query parameter
const url = new URL(window.location.href);
const isShowcase = url.searchParams.get('showcase') === 'true';

/**
 * Prefetch Wrapper Component
 * Triggers route prefetching and web vitals tracking after initial render
 */
function AppWithPrefetch({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Prefetch routes for unauthenticated users (login page scenario)
    // The authenticated case is handled in App.tsx after auth state is known
    if (!isShowcase) {
      prefetchNextRoutes(false);
    }

    // Initialize Web Vitals tracking
    initWebVitals();
  }, []);

  return <>{children}</>;
}

/**
 * Start MSW in development mode before rendering the app
 * SECURITY: This only runs in development builds
 */
async function enableMocking() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser');

    // Start the worker and wait for it to be ready
    return worker.start({
      onUnhandledRequest: 'bypass', // Allow unmocked requests to pass through
    });
  }
}

// Start app with MSW enabled in development
enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <NavigationProvider>
            <QueryClientProvider client={queryClient}>
              <AppWithPrefetch>
                <Suspense fallback={<LoadingSpinner />}>
                  {isShowcase ? (
                    <ComponentShowcase />
                  ) : (
                    <AuthProvider>
                      <App />
                      <ReactQueryDevtools initialIsOpen={false} />
                    </AuthProvider>
                  )}
                </Suspense>
              </AppWithPrefetch>
            </QueryClientProvider>
          </NavigationProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>
  );
});
