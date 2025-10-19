import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { setNavigationCallback } from '../lib/axios';
import {
  incrementRedirectCount,
  hasExceededMaxRedirects,
  resetRedirectCount,
} from '../utils/redirectTracking';

/**
 * NavigationProvider Component
 *
 * Bridges React Router navigation with axios interceptors.
 * Since axios interceptors can't use React hooks directly,
 * this component provides a navigation callback that axios can use.
 *
 * Features:
 * - SPA navigation for auth failures (no page reloads)
 * - Redirect loop detection (max 3 redirects)
 * - Automatic redirect count reset on successful navigation
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
    // Provide navigation callback to axios with redirect loop protection
    setNavigationCallback((path, options) => {
      // Reset redirect count for successful navigations (non-error paths)
      if (path !== '/login' && path !== '/error') {
        resetRedirectCount();
        navigate(path, options);
        return;
      }

      // Check for redirect loops on login/error redirects
      if (path === '/login') {
        // Increment redirect count
        const newCount = incrementRedirectCount();

        // Check if max redirects exceeded
        if (hasExceededMaxRedirects()) {
          console.warn(`Redirect loop detected: ${newCount} attempts. Redirecting to error page.`);
          // Navigate to error page instead of login
          navigate('/error', { replace: true, state: { redirectCount: newCount } });
          return;
        }

        // Log redirect attempt for debugging
        console.debug(`Auth redirect attempt ${newCount}/3`);
      }

      // Proceed with navigation
      navigate(path, options);
    });

    // Cleanup on unmount
    return () => {
      setNavigationCallback(() => {
        // Fallback to window.location if component unmounts
        // This should rarely happen, but provides safety
        window.location.href = '/login';
      });
    };
  }, [navigate]);

  return <>{children}</>;
}
