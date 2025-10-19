/**
 * AuthError Page Component
 * Displayed when authentication redirect loop is detected (max 3 redirects)
 * Provides user-friendly error message and recovery options
 */
import { useNavigate } from 'react-router-dom';
import { resetRedirectCount } from '../utils/redirectTracking';
import { tokenStorage } from '../lib/axios';

/**
 * AuthError Component
 * Shows when authentication fails repeatedly (redirect loop)
 */
export function AuthError() {
  const navigate = useNavigate();

  /**
   * Handle "Try Again" action
   * Clears session storage, tokens, and redirects to login
   */
  const handleTryAgain = () => {
    // Clear redirect tracking
    resetRedirectCount();

    // Clear authentication tokens
    tokenStorage.clearTokens();

    // Clear all sessionStorage (removes any corrupted state)
    try {
      sessionStorage.clear();
    } catch (error) {
      console.debug('Failed to clear sessionStorage:', error);
    }

    // Navigate to login page
    navigate('/login', { replace: true });
  };

  /**
   * Handle "Go Home" action
   * Redirects to homepage (public page that doesn't require auth)
   */
  const handleGoHome = () => {
    // Clear redirect tracking
    resetRedirectCount();

    // Navigate to home page
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
            <svg
              className="h-12 w-12 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Error Title */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Authentication Error</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            We're having trouble signing you in
          </p>
        </div>

        {/* Error Details */}
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/10">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Too many redirect attempts
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                <p>This might be due to:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Network connectivity issues</li>
                  <li>Server problems or maintenance</li>
                  <li>Invalid or expired session</li>
                  <li>Browser cookie or storage issues</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Recovery Actions */}
        <div className="space-y-3">
          <button
            onClick={handleTryAgain}
            className="flex w-full justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-500 dark:hover:bg-primary-600"
          >
            Try Again
          </button>
          <button
            onClick={handleGoHome}
            className="flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Go Home
          </button>
        </div>

        {/* Additional Help */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            If this problem persists, please contact support or try again later.
          </p>
        </div>
      </div>
    </div>
  );
}
