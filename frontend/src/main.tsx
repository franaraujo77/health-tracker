import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import './index.css';
import App from './App.tsx';
import { startInspector } from './lib/xstate';
import { queryClient } from './lib/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { initializeTheme } from './styles/theme';

// Initialize theme before React renders to prevent FOUC
initializeTheme();

// Initialize XState inspector in development mode
startInspector();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
