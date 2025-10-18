import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { setNavigationCallback } from '../lib/axios';

/**
 * NavigationProvider Component
 *
 * Bridges React Router navigation with axios interceptors.
 * Since axios interceptors can't use React hooks directly,
 * this component provides a navigation callback that axios can use.
 *
 * @example
 * <BrowserRouter>
 *   <NavigationProvider>
 *     <App />
 *   </NavigationProvider>
 * </BrowserRouter>
 */
export function NavigationProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    // Provide navigation callback to axios
    setNavigationCallback((path, options) => {
      navigate(path, options);
    });

    // Cleanup on unmount
    return () => {
      setNavigationCallback(() => {
        // Fallback to window.location if component unmounts
        window.location.href = '/login';
      });
    };
  }, [navigate]);

  return <>{children}</>;
}
