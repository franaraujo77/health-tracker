/**
 * Type definitions for Vitest with jest-dom matchers
 */
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import 'vitest';

declare module 'vitest' {
  interface Assertion<T = any> extends jest.Matchers<void, T>, TestingLibraryMatchers<T, void> {}
  interface AsymmetricMatchersContaining
    extends jest.Matchers<void, any>,
      TestingLibraryMatchers<any, void> {}
}
