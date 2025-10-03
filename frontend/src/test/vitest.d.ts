/**
 * Type definitions for Vitest with jest-dom matchers
 */
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import 'vitest';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends jest.Matchers<void, T>, TestingLibraryMatchers<T, void> {}
  interface AsymmetricMatchersContaining
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extends jest.Matchers<void, any>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      TestingLibraryMatchers<any, void> {}
}
