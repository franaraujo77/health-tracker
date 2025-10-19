/**
 * MSW Handlers Index
 * Aggregates all MSW request handlers
 */
import { authHandlers } from './auth';

/**
 * Combined handlers for all API endpoints
 * Add additional handler arrays as new modules are created
 */
export const handlers = [
  ...authHandlers,
  // Add more handlers here as needed
  // e.g., ...healthMetricsHandlers,
];
