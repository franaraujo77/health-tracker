/**
 * Redirect Loop Detection Utility
 * Tracks authentication redirect attempts to prevent infinite redirect loops
 * Uses sessionStorage to persist count across page navigations
 */

const REDIRECT_COUNT_KEY = 'auth_redirect_count';
const REDIRECT_TIMESTAMP_KEY = 'auth_redirect_timestamp';
const RESET_THRESHOLD_MS = 60000; // 1 minute

/**
 * Get current redirect count from sessionStorage
 * @returns Current redirect count, or 0 if not set
 */
export function getRedirectCount(): number {
  try {
    const count = sessionStorage.getItem(REDIRECT_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    // sessionStorage might not be available (e.g., private browsing)
    console.debug('Failed to read redirect count:', error);
    return 0;
  }
}

/**
 * Get timestamp of last redirect attempt
 * @returns Timestamp in milliseconds, or null if not set
 */
export function getRedirectTimestamp(): number | null {
  try {
    const timestamp = sessionStorage.getItem(REDIRECT_TIMESTAMP_KEY);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    console.debug('Failed to read redirect timestamp:', error);
    return null;
  }
}

/**
 * Increment redirect count and update timestamp
 * Automatically resets if last redirect was more than RESET_THRESHOLD_MS ago
 * @returns New redirect count
 */
export function incrementRedirectCount(): number {
  try {
    const now = Date.now();
    const lastTimestamp = getRedirectTimestamp();

    // Reset count if more than threshold time has passed
    if (lastTimestamp && now - lastTimestamp > RESET_THRESHOLD_MS) {
      resetRedirectCount();
      return 1;
    }

    const currentCount = getRedirectCount();
    const newCount = currentCount + 1;

    sessionStorage.setItem(REDIRECT_COUNT_KEY, newCount.toString());
    sessionStorage.setItem(REDIRECT_TIMESTAMP_KEY, now.toString());

    return newCount;
  } catch (error) {
    console.debug('Failed to increment redirect count:', error);
    return 0;
  }
}

/**
 * Reset redirect count and timestamp
 * Should be called on successful authentication or when user manually resets
 */
export function resetRedirectCount(): void {
  try {
    sessionStorage.removeItem(REDIRECT_COUNT_KEY);
    sessionStorage.removeItem(REDIRECT_TIMESTAMP_KEY);
  } catch (error) {
    console.debug('Failed to reset redirect count:', error);
  }
}

/**
 * Check if max redirects have been reached
 * @param maxRedirects Maximum allowed redirects (default: 3)
 * @returns true if max redirects exceeded, false otherwise
 */
export function hasExceededMaxRedirects(maxRedirects: number = 3): boolean {
  return getRedirectCount() >= maxRedirects;
}
