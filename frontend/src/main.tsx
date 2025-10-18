import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import './index.css';
import App from './App.tsx';
import { ComponentShowcase } from './pages/ComponentShowcase';
import { startInspector } from './lib/xstate';
import { queryClient } from './lib/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { initializeTheme } from './styles/theme';

// Initialize theme before React renders to prevent FOUC
initializeTheme();

// Initialize XState inspector in development mode
startInspector();

// Determine which component to render based on URL query parameter
const url = new URL(window.location.href);
const isShowcase = url.searchParams.get('showcase') === 'true';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {isShowcase ? (
        <ComponentShowcase />
      ) : (
        <AuthProvider>
          <App />
          <ReactQueryDevtools initialIsOpen={false} />
        </AuthProvider>
      )}
    </QueryClientProvider>
  </StrictMode>
);
