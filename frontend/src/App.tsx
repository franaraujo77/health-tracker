import './App.css';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { HealthDataEntryForm } from './components/HealthDataEntryForm';
import { HealthMetricsList } from './components/HealthMetricsList';
import { ThemeToggle } from './components/ThemeToggle';
import { RouteErrorBoundary } from './components/ErrorBoundary';

function App() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <RouteErrorBoundary routeName="Authentication">
        <LoginPage />
      </RouteErrorBoundary>
    );
  }

  return (
    <RouteErrorBoundary routeName="Dashboard">
      <div className="App">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px',
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>Health Tracker</h1>
            <p style={{ margin: '5px 0 0 0', color: '#666' }}>
              Welcome, {user?.name || user?.email}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <ThemeToggle variant="icon-button" />
            <button
              onClick={logout}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          <p>XState 5.x State Machine + React Query + Axios JWT Demo</p>

          <div style={{ marginTop: '40px' }}>
            <h2>Data Entry (XState)</h2>
            <HealthDataEntryForm />
          </div>

          <div style={{ marginTop: '40px', borderTop: '2px solid #e0e0e0', paddingTop: '40px' }}>
            <h2>Metrics List (React Query)</h2>
            <HealthMetricsList />
          </div>
        </div>
      </div>
    </RouteErrorBoundary>
  );
}

export default App;
