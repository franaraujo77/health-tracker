/**
 * XState configuration and inspector setup
 */
import { createBrowserInspector } from '@statelyai/inspect';

/**
 * Initialize XState inspector for development
 * Access the inspector at https://stately.ai/registry/inspect
 */
export const inspector = import.meta.env.DEV
  ? createBrowserInspector({
      autoStart: false, // Start manually with inspector.start()
    })
  : undefined;

/**
 * Start the XState inspector in development mode
 * Call this function in your app's entry point during development
 */
export const startInspector = () => {
  if (inspector && import.meta.env.DEV) {
    inspector.start();
    console.log('XState Inspector started. Visit https://stately.ai/registry/inspect');
  }
};
