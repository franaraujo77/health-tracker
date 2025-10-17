import { useMachine } from '@xstate/react';
import { healthDataEntryMachine } from '../machines/healthDataEntryMachine';
import { inspector } from '../lib/xstate';
import './HealthDataEntryForm.css';

/**
 * Health Data Entry Form Component
 *
 * Demonstrates XState integration with React using the @xstate/react hook.
 * This component manages the health data entry workflow using a state machine.
 * Material Design 3 implementation
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
    <div className="health-data-entry-form">
      <h2 className="health-data-entry-title">Health Data Entry</h2>

      {/* Debug: Show current state */}
      <div className="health-data-entry-debug">
        <strong>Current State:</strong> {state.value.toString()}
      </div>

      {/* Error Display */}
      {state.context.error && (
        <div className="health-data-entry-error">
          <strong>Error:</strong> {state.context.error}
        </div>
      )}

      {/* Success Display */}
      {state.matches('success') && (
        <div className="health-data-entry-success">
          <strong>Success!</strong> Health data recorded successfully.
        </div>
      )}

      {/* Form Fields */}
      {!state.matches('success') && (
        <div className="health-data-entry-fields">
          {/* Metric Type Selection */}
          <div className="health-data-entry-field">
            <label htmlFor="metricType" className="health-data-entry-label">
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
              className="health-data-entry-select"
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
            <div className="health-data-entry-field">
              <label htmlFor="value" className="health-data-entry-label">
                <strong>Value ({state.context.unit}):</strong>
              </label>
              <input
                id="value"
                type="number"
                step="0.1"
                value={state.context.value}
                onChange={(e) => send({ type: 'ENTER_VALUE', value: e.target.value })}
                disabled={state.matches('submitting')}
                className="health-data-entry-input"
                placeholder="Enter value"
              />
            </div>
          )}

          {/* Date Input */}
          {state.context.metricType && (
            <div className="health-data-entry-field">
              <label htmlFor="recordedAt" className="health-data-entry-label">
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
                className="health-data-entry-input"
              />
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="health-data-entry-actions">
        {state.matches('success') && (
          <button
            onClick={() => send({ type: 'RESET' })}
            className="health-data-entry-button health-data-entry-button-primary"
          >
            Add Another
          </button>
        )}

        {state.matches('error') && (
          <>
            <button
              onClick={() => send({ type: 'RETRY' })}
              className="health-data-entry-button health-data-entry-button-secondary"
            >
              Retry
            </button>
            <button
              onClick={() => send({ type: 'RESET' })}
              className="health-data-entry-button health-data-entry-button-tertiary"
            >
              Cancel
            </button>
          </>
        )}

        {(state.matches('enteringData') || state.matches('selectingType')) && (
          <>
            <button
              onClick={() => send({ type: 'CANCEL' })}
              className="health-data-entry-button health-data-entry-button-tertiary"
            >
              Cancel
            </button>
            <button
              onClick={() => send({ type: 'SUBMIT' })}
              disabled={state.matches('submitting')}
              className="health-data-entry-button health-data-entry-button-primary"
            >
              {state.matches('submitting') ? 'Submitting...' : 'Submit'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
