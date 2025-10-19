/**
 * MSW Server Setup
 * Configures Mock Service Worker for Node.js (testing) environment
 * Used by Vitest to mock API calls during tests
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * Create MSW server for Node.js environment
 * Intercepts network requests during test execution
 */
export const server = setupServer(...handlers);
