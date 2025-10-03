import { setup, assign, fromPromise } from 'xstate';

/**
 * Health Data Entry State Machine
 *
 * This machine manages the workflow for entering health metrics data.
 * States: idle -> selecting type -> entering data -> validating -> submitting -> success/error
 */

export interface HealthDataContext {
  metricType: string;
  value: string;
  unit: string;
  recordedAt: string;
  error: string | null;
}

export type HealthDataEvent =
  | { type: 'SELECT_TYPE'; metricType: string; unit: string }
  | { type: 'ENTER_VALUE'; value: string }
  | { type: 'SET_DATE'; recordedAt: string }
  | { type: 'SUBMIT' }
  | { type: 'RETRY' }
  | { type: 'RESET' }
  | { type: 'CANCEL' };

/**
 * Mock implementation for submitting health data
 * In production, this would make an API call to the backend
 */
const submitHealthDataLogic = fromPromise<
  { id: string } & HealthDataContext,
  { context: HealthDataContext }
>(async ({ input }) => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Simulate 10% failure rate for testing
  if (Math.random() < 0.1) {
    throw new Error('Network error: Failed to submit data');
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    ...input.context,
  };
});

export const healthDataEntryMachine = setup({
  types: {
    context: {} as HealthDataContext,
    events: {} as HealthDataEvent,
  },
  guards: {
    isValidData: ({ context }) => {
      return (
        context.metricType !== '' &&
        context.value !== '' &&
        !isNaN(parseFloat(context.value)) &&
        context.unit !== '' &&
        context.recordedAt !== ''
      );
    },
  },
  actions: {
    setMetricType: assign({
      metricType: ({ event }) => (event.type === 'SELECT_TYPE' ? event.metricType : ''),
      unit: ({ event }) => (event.type === 'SELECT_TYPE' ? event.unit : ''),
    }),
    setValue: assign({
      value: ({ event }) => (event.type === 'ENTER_VALUE' ? event.value : ''),
    }),
    setDate: assign({
      recordedAt: ({ event }) => (event.type === 'SET_DATE' ? event.recordedAt : ''),
    }),
    setError: assign({
      error: ({ context }) => {
        if (context.metricType === '') return 'Please select a metric type';
        if (context.value === '' || isNaN(parseFloat(context.value)))
          return 'Please enter a valid numeric value';
        if (context.recordedAt === '') return 'Please select a date';
        return 'Unknown error occurred';
      },
    }),
    clearError: assign({
      error: null,
    }),
    resetContext: assign({
      metricType: '',
      value: '',
      unit: '',
      recordedAt: new Date().toISOString(),
      error: null,
    }),
  },
  actors: {
    submitHealthData: submitHealthDataLogic,
  },
}).createMachine({
  id: 'healthDataEntry',
  initial: 'idle',
  context: {
    metricType: '',
    value: '',
    unit: '',
    recordedAt: new Date().toISOString(),
    error: null,
  },
  states: {
    idle: {
      entry: 'clearError',
      on: {
        SELECT_TYPE: {
          target: 'selectingType',
          actions: 'setMetricType',
        },
      },
    },
    selectingType: {
      on: {
        SELECT_TYPE: {
          actions: 'setMetricType',
        },
        ENTER_VALUE: {
          target: 'enteringData',
          actions: 'setValue',
        },
        CANCEL: {
          target: 'idle',
          actions: 'resetContext',
        },
      },
    },
    enteringData: {
      on: {
        ENTER_VALUE: {
          actions: 'setValue',
        },
        SET_DATE: {
          actions: 'setDate',
        },
        SUBMIT: {
          target: 'validating',
        },
        CANCEL: {
          target: 'idle',
          actions: 'resetContext',
        },
      },
    },
    validating: {
      always: [
        {
          guard: 'isValidData',
          target: 'submitting',
        },
        {
          target: 'error',
          actions: 'setError',
        },
      ],
    },
    submitting: {
      entry: 'clearError',
      invoke: {
        src: 'submitHealthData',
        input: ({ context }) => ({ context }),
        onDone: {
          target: 'success',
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => (event.error as Error)?.message || 'Failed to submit data',
          }),
        },
      },
    },
    success: {
      on: {
        RESET: {
          target: 'idle',
          actions: 'resetContext',
        },
      },
    },
    error: {
      on: {
        RETRY: {
          target: 'enteringData',
          actions: 'clearError',
        },
        RESET: {
          target: 'idle',
          actions: 'resetContext',
        },
      },
    },
  },
});
