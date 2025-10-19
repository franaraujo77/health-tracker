/**
 * Vitest Test Setup
 * Global test configuration and mocks for all tests
 */

import '@testing-library/jest-dom';
import { expect, beforeAll, afterEach, afterAll } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';
import { server } from '../mocks/server';

// Extend Vitest's expect with jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock window.matchMedia for theme testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as unknown as typeof global.IntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as unknown as typeof global.ResizeObserver;

/**
 * MSW Server Lifecycle Management
 * Configures Mock Service Worker for all test files
 */

/**
 * Start MSW server before all tests
 * onUnhandledRequest: 'warn' logs warnings for unmocked requests but doesn't fail tests
 * This allows CORS preflight (OPTIONS) requests to pass through
 */
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn',
  });
});

/**
 * Reset handlers after each test
 * Ensures test isolation by removing any runtime handler modifications
 */
afterEach(() => {
  server.resetHandlers();
});

/**
 * Clean up after all tests complete
 * Closes the server and frees resources
 */
afterAll(() => {
  server.close();
});
