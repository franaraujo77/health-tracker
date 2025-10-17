/**
 * Component Showcase Page
 * Displays all M3 components for cross-browser testing
 * Accessible at /showcase route (no authentication required)
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HealthDataEntryForm } from '../components/HealthDataEntryForm';
import { HealthMetricsList } from '../components/HealthMetricsList';
import { ThemeToggle } from '../components/ThemeToggle';

// Create a query client for this showcase
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
});

export function ComponentShowcase() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px',
            padding: '20px',
            borderBottom: '2px solid var(--md-sys-color-outline-variant, #e0e0e0)',
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>M3 Component Showcase</h1>
            <p
              style={{ margin: '8px 0 0 0', color: 'var(--md-sys-color-on-surface-variant, #666)' }}
            >
              Cross-browser testing page for Material Design 3 components
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <ThemeToggle variant="icon-button" />
            <ThemeToggle variant="segmented" />
          </div>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <h2>Health Data Entry Form</h2>
          <p
            style={{ color: 'var(--md-sys-color-on-surface-variant, #666)', marginBottom: '20px' }}
          >
            Form component with M3 visual updates, theme support, and state management
          </p>
          <HealthDataEntryForm />
        </div>

        <div
          style={{
            marginTop: '60px',
            paddingTop: '40px',
            borderTop: '2px solid var(--md-sys-color-outline-variant, #e0e0e0)',
          }}
        >
          <h2>Health Metrics List</h2>
          <p
            style={{ color: 'var(--md-sys-color-on-surface-variant, #666)', marginBottom: '20px' }}
          >
            List component with M3 card styling and elevation system
          </p>
          <HealthMetricsList />
        </div>

        <div
          style={{
            marginTop: '60px',
            paddingTop: '40px',
            borderTop: '2px solid var(--md-sys-color-outline-variant, #e0e0e0)',
          }}
        >
          <h3>Theme Toggle Variants</h3>
          <p
            style={{ color: 'var(--md-sys-color-on-surface-variant, #666)', marginBottom: '20px' }}
          >
            Icon button and segmented button variants
          </p>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div>
              <p style={{ marginBottom: '8px', fontWeight: 500 }}>Icon Button:</p>
              <ThemeToggle variant="icon-button" />
            </div>
            <div>
              <p style={{ marginBottom: '8px', fontWeight: 500 }}>Segmented Button:</p>
              <ThemeToggle variant="segmented" />
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: '60px',
            padding: '20px',
            backgroundColor: 'var(--md-sys-color-surface-variant, #f5f5f5)',
            borderRadius: '12px',
          }}
        >
          <h3>Browser Testing Info</h3>
          <p style={{ color: 'var(--md-sys-color-on-surface-variant, #666)' }}>
            This page is designed for automated cross-browser testing with Playwright.
            <br />
            All components are rendered without authentication requirements to enable comprehensive
            E2E testing.
          </p>
        </div>
      </div>
    </QueryClientProvider>
  );
}
