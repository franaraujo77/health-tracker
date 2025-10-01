import './App.css';
import { HealthDataEntryForm } from './components/HealthDataEntryForm';
import { HealthMetricsList } from './components/HealthMetricsList';

function App() {
  return (
    <div className="App">
      <h1>Health Tracker</h1>
      <p>XState 5.x State Machine + React Query Demo</p>

      <div style={{ marginTop: '40px' }}>
        <h2>Data Entry (XState)</h2>
        <HealthDataEntryForm />
      </div>

      <div style={{ marginTop: '40px', borderTop: '2px solid #e0e0e0', paddingTop: '40px' }}>
        <h2>Metrics List (React Query)</h2>
        <HealthMetricsList />
      </div>
    </div>
  );
}

export default App;
