import { useMachine } from '@xstate/react';
import { healthDataEntryMachine } from '../machines/healthDataEntryMachine';
import { inspector } from '../lib/xstate';

/**
 * Health Data Entry Form Component
 *
 * Demonstrates XState integration with React using the @xstate/react hook.
 * This component manages the health data entry workflow using a state machine.
 */
export function HealthDataEntryForm() {
  const [state, send] = useMachine(healthDataEntryMachine, {
    inspect: inspector?.inspect,
  });

  const metricTypes = [
    { type: 'weight', label: 'Weight', unit: 'kg' },
    { type: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg' },
    { type: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
    { type: 'blood_glucose', label: 'Blood Glucose', unit: 'mg/dL' },
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h2>Health Data Entry</h2>

      {/* Debug: Show current state */}
      <div
        style={{
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
        }}
      >
        <strong>Current State:</strong> {state.value.toString()}
      </div>

      {/* Error Display */}
      {state.context.error && (
        <div
          style={{
            padding: '10px',
            marginBottom: '20px',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
          }}
        >
          <strong>Error:</strong> {state.context.error}
        </div>
      )}

      {/* Success Display */}
      {state.matches('success') && (
        <div
          style={{
            padding: '10px',
            marginBottom: '20px',
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            borderRadius: '4px',
          }}
        >
          <strong>Success!</strong> Health data recorded successfully.
        </div>
      )}

      {/* Form Fields */}
      {!state.matches('success') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* Metric Type Selection */}
          <div>
            <label htmlFor="metricType">
              <strong>Metric Type:</strong>
            </label>
            <select
              id="metricType"
              value={state.context.metricType}
              onChange={(e) => {
                const selected = metricTypes.find((m) => m.type === e.target.value);
                if (selected) {
                  send({
                    type: 'SELECT_TYPE',
                    metricType: selected.type,
                    unit: selected.unit,
                  });
                }
              }}
              disabled={state.matches('submitting')}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="">-- Select Metric --</option>
              {metricTypes.map((metric) => (
                <option key={metric.type} value={metric.type}>
                  {metric.label}
                </option>
              ))}
            </select>
          </div>

          {/* Value Input */}
          {state.context.metricType && (
            <div>
              <label htmlFor="value">
                <strong>Value ({state.context.unit}):</strong>
              </label>
              <input
                id="value"
                type="number"
                step="0.1"
                value={state.context.value}
                onChange={(e) => send({ type: 'ENTER_VALUE', value: e.target.value })}
                disabled={state.matches('submitting')}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                placeholder="Enter value"
              />
            </div>
          )}

          {/* Date Input */}
          {state.context.metricType && (
            <div>
              <label htmlFor="recordedAt">
                <strong>Recorded At:</strong>
              </label>
              <input
                id="recordedAt"
                type="datetime-local"
                value={state.context.recordedAt.slice(0, 16)}
                onChange={(e) =>
                  send({
                    type: 'SET_DATE',
                    recordedAt: new Date(e.target.value).toISOString(),
                  })
                }
                disabled={state.matches('submitting')}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          marginTop: '20px',
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end',
        }}
      >
        {state.matches('success') && (
          <button
            onClick={() => send({ type: 'RESET' })}
            style={{
              padding: '10px 20px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Add Another
          </button>
        )}

        {state.matches('error') && (
          <>
            <button
              onClick={() => send({ type: 'RETRY' })}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f57c00',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
            <button
              onClick={() => send({ type: 'RESET' })}
              style={{
                padding: '10px 20px',
                backgroundColor: '#757575',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </>
        )}

        {(state.matches('enteringData') || state.matches('selectingType')) && (
          <>
            <button
              onClick={() => send({ type: 'CANCEL' })}
              style={{
                padding: '10px 20px',
                backgroundColor: '#757575',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => send({ type: 'SUBMIT' })}
              disabled={state.matches('submitting')}
              style={{
                padding: '10px 20px',
                backgroundColor: state.matches('submitting') ? '#9e9e9e' : '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: state.matches('submitting') ? 'not-allowed' : 'pointer',
              }}
            >
              {state.matches('submitting') ? 'Submitting...' : 'Submit'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
