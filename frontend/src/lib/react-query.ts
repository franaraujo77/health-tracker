/**
 * React Query configuration
 */
import { QueryClient } from '@tanstack/react-query';

/**
 * Global QueryClient instance with default configuration
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 5 minutes (data is considered fresh for 5 minutes)
      staleTime: 5 * 60 * 1000,
      // Cache time: 10 minutes (unused data is garbage collected after 10 minutes)
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      // Don't refetch on window focus in development
      refetchOnWindowFocus: import.meta.env.PROD,
      // Don't refetch on reconnect in development
      refetchOnReconnect: import.meta.env.PROD,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});
