/**
 * Route Prefetching Utilities
 *
 * Intelligently prefetch route chunks based on likely navigation patterns
 * to improve perceived performance and reduce navigation latency.
 *
 * Uses Vite's dynamic import for module preloading.
 *
 * @packageDocumentation
 */

/**
 * Route prefetch configuration
 * Maps current location to components that should be prefetched
 */
interface PrefetchConfig {
  /** Delay in ms before prefetching (to avoid blocking initial render) */
  delay: number;
  /** Component modules to prefetch */
  modules: (() => Promise<unknown>)[];
}

/**
 * Prefetch map defining likely navigation patterns
 *
 * Key: Current route pattern (use 'authenticated' for any authenticated route)
 * Value: Prefetch configuration
 */
const PREFETCH_MAP: Record<string, PrefetchConfig> = {
  // When on login page, prefetch main app and its heavy components
  unauthenticated: {
    delay: 2000, // Wait 2s after login page loads
    modules: [
      () => import('../App'),
      () => import('../components/HealthDataEntryForm'),
      () => import('../components/HealthMetricsList'),
    ],
  },

  // When authenticated, prefetch login page for logout scenario
  authenticated: {
    delay: 5000, // Lower priority, wait 5s
    modules: [() => import('../pages/LoginPage')],
  },
};

/**
 * Track which modules have been prefetched to avoid duplicate requests
 */
const prefetchedModules = new Set<string>();

/**
 * Prefetch a module using dynamic import
 *
 * @param importFn - Dynamic import function
 * @returns Promise that resolves when module is prefetched
 */
async function prefetchModule(importFn: () => Promise<unknown>): Promise<void> {
  const moduleKey = importFn.toString();

  // Skip if already prefetched
  if (prefetchedModules.has(moduleKey)) {
    return;
  }

  try {
    // Use dynamic import which Vite will handle as a separate chunk
    await importFn();
    prefetchedModules.add(moduleKey);
  } catch (error) {
    // Silently fail - prefetching is a performance enhancement, not critical
    console.debug('Failed to prefetch module:', error);
  }
}

/**
 * Prefetch modules for likely next navigation targets
 *
 * @param isAuthenticated - Whether user is currently authenticated
 *
 * @example
 * ```tsx
 * // In App component
 * useEffect(() => {
 *   prefetchNextRoutes(isAuthenticated);
 * }, [isAuthenticated]);
 * ```
 */
export function prefetchNextRoutes(isAuthenticated: boolean): void {
  const configKey = isAuthenticated ? 'authenticated' : 'unauthenticated';
  const config = PREFETCH_MAP[configKey];

  if (!config) {
    return;
  }

  // Delay prefetching to not interfere with initial render and critical resources
  setTimeout(() => {
    // Prefetch all configured modules in parallel
    config.modules.forEach((importFn) => {
      void prefetchModule(importFn);
    });
  }, config.delay);
}

/**
 * Manually trigger prefetch for specific modules
 * Useful for hover-based prefetching or custom scenarios
 *
 * @param modules - Array of dynamic import functions to prefetch
 *
 * @example
 * ```tsx
 * <Link
 *   to="/dashboard"
 *   onMouseEnter={() => prefetchModules([
 *     () => import('../pages/Dashboard')
 *   ])}
 * >
 *   Dashboard
 * </Link>
 * ```
 */
export function prefetchModules(modules: (() => Promise<unknown>)[]): void {
  modules.forEach((importFn) => {
    void prefetchModule(importFn);
  });
}

/**
 * Clear prefetch cache
 * Useful for testing or memory management in long-running sessions
 */
export function clearPrefetchCache(): void {
  prefetchedModules.clear();
}
