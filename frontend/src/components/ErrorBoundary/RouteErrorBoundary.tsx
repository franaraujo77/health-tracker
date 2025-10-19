import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { useNavigate } from 'react-router-dom';
import './RouteErrorBoundary.css';

interface RouteErrorBoundaryProps {
  routeName: string;
  children: React.ReactNode;
}

interface RouteErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  routeName: string;
}

function RouteErrorFallback({ error, resetErrorBoundary, routeName }: RouteErrorFallbackProps) {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div role="alert" className="route-error-boundary">
      <div className="route-error-container">
        <h2>Error in {routeName}</h2>
        <p className="route-error-message">{error.message}</p>

        {import.meta.env.DEV && (
          <details className="route-error-details">
            <summary>Technical details</summary>
            <pre>{error.stack}</pre>
          </details>
        )}

        <div className="route-error-actions">
          <button onClick={resetErrorBoundary} className="btn-retry">
            Retry
          </button>
          <button onClick={handleGoHome} className="btn-home">
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

export function RouteErrorBoundary({ routeName, children }: RouteErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    if (import.meta.env.DEV) {
      console.error(`Route error in ${routeName}:`, error, errorInfo);
    }

    if (import.meta.env.PROD) {
      // TODO: Send to monitoring service when configured
      console.error(`Production route error in ${routeName}:`, error);
    }
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={(props) => <RouteErrorFallback {...props} routeName={routeName} />}
      onError={handleError}
    >
      {children}
    </ReactErrorBoundary>
  );
}
