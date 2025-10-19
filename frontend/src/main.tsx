import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import './index.css';
import { startInspector } from './lib/xstate';
import { queryClient } from './lib/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { initializeTheme } from './styles/theme';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NavigationProvider } from './contexts/NavigationProvider';
import { LoadingSpinner } from './components/LoadingSpinner';

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <NavigationProvider>
          <QueryClientProvider client={queryClient}>
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
          </QueryClientProvider>
        </NavigationProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
