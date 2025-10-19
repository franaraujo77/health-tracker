import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { useNavigate } from 'react-router-dom';
import './ErrorBoundary.css';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div role="alert" className="error-boundary-fallback">
      <div className="error-container">
        <h1>Something went wrong</h1>
        <p className="error-message">We're sorry, but something unexpected happened.</p>

        {import.meta.env.DEV && (
          <details className="error-details">
            <summary>Error details</summary>
            <pre>{error.message}</pre>
            <pre>{error.stack}</pre>
          </details>
        )}

        <div className="error-actions">
          <button onClick={resetErrorBoundary} className="btn-primary">
            Try Again
          </button>
          <button onClick={handleGoHome} className="btn-secondary">
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }

    if (import.meta.env.PROD) {
      // TODO: Send to Sentry/LogRocket when monitoring is configured
      console.error('Production error:', error);
    }
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => {
        navigate('/', { replace: true });
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
