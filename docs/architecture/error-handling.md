# Error Handling Architecture

## Overview

The health-tracker application implements a comprehensive error handling system using React Error Boundaries to provide graceful error recovery and improve user experience. This system catches rendering errors that would otherwise crash the entire application and displays user-friendly fallback UI with recovery options.

### Why Error Boundaries?

After merging a large Material Design 3 (M3) implementation (238 files, 54,077 additions), the application lacked defensive error handling. Error boundaries provide:

- **Graceful Degradation**: Users see helpful error messages instead of blank screens
- **Error Isolation**: Route-level boundaries prevent one failing component from crashing the entire app
- **Recovery Options**: "Try Again" and "Go Home" buttons help users recover from errors
- **Developer Experience**: Error details shown in development mode for faster debugging
- **Production Safety**: Errors logged to monitoring services (when configured) without exposing details to users

## Architecture

The error handling system uses a **cascading boundary pattern** with two levels:

```
StrictMode
└── ErrorBoundary (Root Level)
    └── QueryClientProvider
        └── AuthProvider
            └── App
                ├── RouteErrorBoundary (Authentication)
                │   └── LoginPage
                └── RouteErrorBoundary (Dashboard)
                    └── Dashboard Content
```

### Root ErrorBoundary

Located in `frontend/src/main.tsx`, the root ErrorBoundary wraps the entire application and catches:

- Critical errors in core providers (QueryClient, AuthProvider)
- Unhandled errors that bubble up from route-level boundaries
- Errors in component initialization and lifecycle methods

**Position in component tree**: Inside `StrictMode`, before `QueryClientProvider`

### Route-Level ErrorBoundary

Located in `frontend/src/App.tsx`, RouteErrorBoundary components wrap individual routes:

- **Authentication Route**: Wraps `LoginPage`
- **Dashboard Route**: Wraps main application content

**Benefits**:

- Errors in one route don't affect other routes
- Contextual error messages show which route failed
- Users can retry failed routes or navigate home
- Preserves application state outside the failed route

## Implementation Details

### Dependencies

```bash
npm install react-error-boundary
```

### Root ErrorBoundary Component

**File**: `frontend/src/components/ErrorBoundary/ErrorBoundary.tsx`

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>{/* App content */}</QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
```

**Features**:

- Catches all rendering errors in the application tree
- Displays full-page error fallback UI
- Shows error details in development mode only
- Logs errors to console (dev) or monitoring service (prod)
- Provides "Try Again" (resets error boundary) and "Go Home" (navigates to /) buttons

### RouteErrorBoundary Component

**File**: `frontend/src/components/ErrorBoundary/RouteErrorBoundary.tsx`

```tsx
import { RouteErrorBoundary } from './components/ErrorBoundary';

function App() {
  if (!isAuthenticated) {
    return (
      <RouteErrorBoundary routeName="Authentication">
        <LoginPage />
      </RouteErrorBoundary>
    );
  }

  return (
    <RouteErrorBoundary routeName="Dashboard">
      <div className="App">{/* Dashboard content */}</div>
    </RouteErrorBoundary>
  );
}
```

**Features**:

- Accepts `routeName` prop for contextual error messages
- Shows compact error UI within the route area
- Provides "Retry" (reloads page) and "Go Home" (navigates to /) buttons
- Logs errors with route context

## Error Fallback UI

### Root ErrorBoundary Fallback

**Visual Design**:

- Full-page centered layout
- Material Design 3 color tokens
- Large "Something went wrong" heading in error color
- Friendly error message
- Collapsible error details (dev mode only)
- Two action buttons with hover states

**User Experience**:

- **Try Again**: Resets the error boundary and re-renders the app
- **Go Home**: Navigates to root URL (`/`)
- Error details hidden by default, expandable in dev mode

**File**: `frontend/src/components/ErrorBoundary/ErrorBoundary.css`

### RouteErrorBoundary Fallback

**Visual Design**:

- Inline error container (doesn't take over full page)
- Error background color to indicate severity
- Route-specific heading: "Error in {routeName}"
- Error message from caught exception
- Collapsible technical details (dev mode only)

**User Experience**:

- **Retry**: Reloads the current page
- **Go Home**: Navigates to root URL (`/`)
- Less intrusive than root boundary errors

**File**: `frontend/src/components/ErrorBoundary/RouteErrorBoundary.css`

## Development vs Production

### Development Mode (`import.meta.env.DEV`)

**Error Details Shown**:

```tsx
{
  import.meta.env.DEV && (
    <details className="error-details">
      <summary>Error details</summary>
      <pre>{error.message}</pre>
      <pre>{error.stack}</pre>
    </details>
  );
}
```

**Logging**:

```tsx
if (import.meta.env.DEV) {
  console.error('ErrorBoundary caught:', error, errorInfo);
}
```

**Benefits**:

- Full error stack traces for debugging
- Error component stack showing where error occurred
- Immediate feedback during development

### Production Mode (`import.meta.env.PROD`)

**Error Details Hidden**:

- Users see friendly message only
- No technical details exposed
- Stack traces not rendered in DOM

**Logging**:

```tsx
if (import.meta.env.PROD) {
  // TODO: Send to Sentry/LogRocket when monitoring is configured
  console.error('Production error:', error);
}
```

**Security**:

- Prevents exposing internal application structure
- Protects sensitive error information
- Maintains professional user experience

## Testing

### Test Coverage

**File**: `frontend/src/components/ErrorBoundary/__tests__/ErrorBoundary.test.tsx`

**Test Cases** (15 total):

#### Root ErrorBoundary Tests:

1. ✅ Renders children when no error occurs
2. ✅ Catches errors and shows fallback UI
3. ✅ Shows error details in development mode
4. ✅ Hides error details in production mode
5. ✅ Shows Try Again button
6. ✅ Navigates home on Go Home button click
7. ✅ Calls onError when error is caught

#### RouteErrorBoundary Tests:

8. ✅ Renders children when no error occurs
9. ✅ Catches errors and shows route-specific fallback UI
10. ✅ Shows route name in error message
11. ✅ Shows technical details in development mode
12. ✅ Hides technical details in production mode
13. ✅ Shows Retry and Go Home buttons
14. ✅ Navigates home on Go Home button click
15. ✅ Calls onError with route context when error is caught

### Running Tests

```bash
# Run error boundary tests
cd frontend
npm test -- ErrorBoundary.test.tsx --run

# Run with coverage
npm run test:coverage -- ErrorBoundary --run
```

**Expected Results**:

```
✓ src/components/ErrorBoundary/__tests__/ErrorBoundary.test.tsx (15 tests)
  Test Files  1 passed (1)
  Tests  15 passed (15)
```

## Error Logging Strategy

### Current Implementation

**Development**:

```tsx
console.error('ErrorBoundary caught:', error, errorInfo);
```

**Production**:

```tsx
console.error('Production error:', error);
// TODO: Send to Sentry/LogRocket
```

### Future Enhancements

When monitoring is configured, replace TODO comments with:

#### Sentry Integration

```tsx
import * as Sentry from '@sentry/react';

const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }
};
```

#### LogRocket Integration

```tsx
import LogRocket from 'logrocket';

const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
  if (import.meta.env.PROD) {
    LogRocket.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
  }
};
```

## Adding Error Boundaries to New Routes

### Step 1: Import RouteErrorBoundary

```tsx
import { RouteErrorBoundary } from './components/ErrorBoundary';
```

### Step 2: Wrap Route Component

```tsx
// Example: Settings Route
<RouteErrorBoundary routeName="Settings">
  <SettingsPage />
</RouteErrorBoundary>
```

### Step 3: Test Error Handling

Create a test component that throws an error:

```tsx
// Temporary test component
const ErrorTest = () => {
  throw new Error('Test error');
};

// Use in route to verify boundary catches it
<RouteErrorBoundary routeName="Settings">
  <ErrorTest />
</RouteErrorBoundary>;
```

Verify:

- Error fallback UI appears
- Route name shows correctly ("Error in Settings")
- Retry and Go Home buttons work
- Error logged to console in dev mode

## Best Practices

### Do's ✅

1. **Always wrap new routes** with RouteErrorBoundary
2. **Use descriptive route names** that users will understand
3. **Test error boundaries** with intentional errors during development
4. **Monitor error logs** in production to identify recurring issues
5. **Keep error messages user-friendly** and non-technical

### Don'ts ❌

1. **Don't catch errors in event handlers** - Error boundaries only catch rendering errors
2. **Don't expose sensitive information** in error messages
3. **Don't skip testing** error boundary functionality
4. **Don't remove dev mode error details** - they're essential for debugging
5. **Don't forget to configure monitoring** before production deployment

### Error Boundaries Don't Catch

Error boundaries have limitations. They **do not** catch errors in:

- **Event handlers** (use try/catch instead)
- **Asynchronous code** (setTimeout, promises, async/await)
- **Server-side rendering**
- **Errors thrown in the error boundary itself**

For these cases, use traditional error handling:

```tsx
// Event handler error handling
const handleClick = async () => {
  try {
    await riskyOperation();
  } catch (error) {
    console.error('Operation failed:', error);
    // Show error toast/notification
  }
};
```

## Migration Guide

If you need to add error boundaries to existing routes:

### Before

```tsx
function App() {
  return (
    <div className="App">
      <Dashboard />
    </div>
  );
}
```

### After

```tsx
import { RouteErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <RouteErrorBoundary routeName="Dashboard">
      <div className="App">
        <Dashboard />
      </div>
    </RouteErrorBoundary>
  );
}
```

## Related Documentation

- [React Error Boundaries Documentation](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [react-error-boundary Library](https://github.com/bvaughn/react-error-boundary)
- [Material Design 3 Implementation](../design/material-design-3.md)
- [Testing Guide](../testing/frontend-testing.md)

## Summary

The cascading error boundary architecture provides:

✅ **Resilience**: Application continues running even when components fail
✅ **User Experience**: Friendly error messages with recovery options
✅ **Developer Experience**: Detailed error information in development
✅ **Error Isolation**: Route-level boundaries prevent cascading failures
✅ **Production Safety**: Errors logged without exposing internal details
✅ **Future Ready**: Prepared for monitoring service integration

This implementation addresses critical production readiness requirements and ensures users have a smooth experience even when unexpected errors occur.
