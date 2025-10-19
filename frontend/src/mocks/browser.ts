/**
 * MSW Browser Setup
 * Configures Mock Service Worker for browser (development) environment
 * SECURITY: Only imported in development builds
 */
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * Create MSW worker for browser environment
 * Intercepts network requests in development mode
 */
export const worker = setupWorker(...handlers);
