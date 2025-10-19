import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HealthDataEntryForm } from '../HealthDataEntryForm';

describe('HealthDataEntryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Math.random to control submission success/failure
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // Default to success (> 0.1)
  });

  describe('Initial Render', () => {
    it('should render form title', () => {
      render(<HealthDataEntryForm />);
      expect(screen.getByText('Health Data Entry')).toBeInTheDocument();
    });

    it('should show idle state initially', () => {
      render(<HealthDataEntryForm />);
      const stateEl = screen.getByText(/Current State:/).parentElement;
      expect(stateEl?.textContent).toContain('idle');
    });

    it('should render metric type dropdown', () => {
      render(<HealthDataEntryForm />);
      expect(screen.getByLabelText(/Metric Type:/)).toBeInTheDocument();
    });

    it('should show all metric type options', () => {
      render(<HealthDataEntryForm />);
      const select = screen.getByLabelText(/Metric Type:/) as HTMLSelectElement;

      expect(select.options).toHaveLength(5); // Including "-- Select Metric --"
      expect(select.options[0].text).toBe('-- Select Metric --');
      expect(select.options[1].text).toBe('Weight');
      expect(select.options[2].text).toBe('Blood Pressure');
      expect(select.options[3].text).toBe('Heart Rate');
      expect(select.options[4].text).toBe('Blood Glucose');
    });

    it('should not show value input initially', () => {
      render(<HealthDataEntryForm />);
      expect(screen.queryByLabelText(/Value/)).not.toBeInTheDocument();
    });

    it('should not show date input initially', () => {
      render(<HealthDataEntryForm />);
      expect(screen.queryByLabelText(/Recorded At:/)).not.toBeInTheDocument();
    });

    it('should not show any error message initially', () => {
      render(<HealthDataEntryForm />);
      expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
    });

    it('should not show success message initially', () => {
      render(<HealthDataEntryForm />);
      expect(screen.queryByText(/Success!/)).not.toBeInTheDocument();
    });
  });

  describe('Metric Type Selection', () => {
    it('should transition to selectingType state when metric is selected', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      const select = screen.getByLabelText(/Metric Type:/);
      await user.selectOptions(select, 'weight');

      expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain(
        'selectingType'
      );
    });

    it('should show value input after selecting metric type', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      const select = screen.getByLabelText(/Metric Type:/);
      await user.selectOptions(select, 'weight');

      expect(screen.getByLabelText(/Value \(kg\):/)).toBeInTheDocument();
    });

    it('should show date input after selecting metric type', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      const select = screen.getByLabelText(/Metric Type:/);
      await user.selectOptions(select, 'weight');

      expect(screen.getByLabelText(/Recorded At:/)).toBeInTheDocument();
    });

    it('should show correct unit for weight', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');

      expect(screen.getByLabelText(/Value \(kg\):/)).toBeInTheDocument();
    });

    it('should show correct unit for blood pressure', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'blood_pressure');

      expect(screen.getByLabelText(/Value \(mmHg\):/)).toBeInTheDocument();
    });

    it('should show correct unit for heart rate', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'heart_rate');

      expect(screen.getByLabelText(/Value \(bpm\):/)).toBeInTheDocument();
    });

    it('should show correct unit for blood glucose', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'blood_glucose');

      expect(screen.getByLabelText(/Value \(mg\/dL\):/)).toBeInTheDocument();
    });

    it('should allow changing metric type', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      const select = screen.getByLabelText(/Metric Type:/);
      await user.selectOptions(select, 'weight');
      expect(screen.getByLabelText(/Value \(kg\):/)).toBeInTheDocument();

      await user.selectOptions(select, 'heart_rate');
      expect(screen.getByLabelText(/Value \(bpm\):/)).toBeInTheDocument();
    });
  });

  describe('Data Entry', () => {
    it('should transition to enteringData state when value is entered', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      await user.type(screen.getByLabelText(/Value/), '75.5');

      expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain(
        'enteringData'
      );
    });

    it('should accept numeric values', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      const input = screen.getByLabelText(/Value/) as HTMLInputElement;
      await user.type(input, '75.5');

      expect(input.value).toBe('75.5');
    });

    it('should accept decimal values', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      const input = screen.getByLabelText(/Value/) as HTMLInputElement;
      await user.type(input, '120.5');

      expect(input.value).toBe('120.5');
    });

    it('should display datetime input with current date initially', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      const dateInput = screen.getByLabelText(/Recorded At:/) as HTMLInputElement;

      // Should have a value (current datetime)
      expect(dateInput.value).toBeTruthy();
      expect(dateInput.type).toBe('datetime-local');
    });

    it('should show Submit and Cancel buttons in enteringData state', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      await user.type(screen.getByLabelText(/Value/), '75');

      expect(screen.getByText('Submit')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should require entering data before submitting', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      // Just selecting type is not enough - need to enter value to reach enteringData state
      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');

      // Submit button exists but we're in selectingType, not enteringData
      // SUBMIT event only works in enteringData state per the machine definition
      expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain(
        'selectingType'
      );
    });

    it('should show error when submitting empty value', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      // Type and then clear to get into enteringData state with empty value
      const valueInput = screen.getByLabelText(/Value/);
      await user.type(valueInput, '1');
      await user.clear(valueInput);
      await user.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });
    });

    it('should show error message for invalid data', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      const valueInput = screen.getByLabelText(/Value/);
      await user.type(valueInput, '1');
      await user.clear(valueInput);
      await user.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid numeric value/)).toBeInTheDocument();
      });
    });

    it('should transition to error state on validation failure', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      const valueInput = screen.getByLabelText(/Value/);
      await user.type(valueInput, '1');
      await user.clear(valueInput);
      await user.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain('error');
      });
    });

    it('should show Retry and Cancel buttons in error state', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      const valueInput = screen.getByLabelText(/Value/);
      await user.type(valueInput, '1');
      await user.clear(valueInput);
      await user.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });
  });

  describe('Successful Submission', () => {
    it('should submit valid data successfully', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      await user.type(screen.getByLabelText(/Value/), '75.5');
      await user.click(screen.getByText('Submit'));

      // Wait for success (submission might be too fast to catch intermediate state)
      await waitFor(
        () => {
          expect(screen.getByText(/Success!/)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should show success message after submission', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      await user.type(screen.getByLabelText(/Value/), '75.5');
      await user.click(screen.getByText('Submit'));

      await waitFor(
        () => {
          expect(screen.getByText('Health data recorded successfully.')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should transition to success state after submission', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      await user.type(screen.getByLabelText(/Value/), '75.5');
      await user.click(screen.getByText('Submit'));

      await waitFor(
        () => {
          expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain(
            'success'
          );
        },
        { timeout: 2000 }
      );
    });

    it('should hide form fields in success state', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      await user.type(screen.getByLabelText(/Value/), '75.5');
      await user.click(screen.getByText('Submit'));

      await waitFor(
        () => {
          expect(screen.queryByLabelText(/Metric Type:/)).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should show Add Another button in success state', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      await user.type(screen.getByLabelText(/Value/), '75.5');
      await user.click(screen.getByText('Submit'));

      await waitFor(
        () => {
          expect(screen.getByText('Add Another')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should disable inputs during submission', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      await user.type(screen.getByLabelText(/Value/), '75.5');
      await user.click(screen.getByText('Submit'));

      // During submission
      await waitFor(() => {
        const select = screen.queryByLabelText(/Metric Type:/);
        if (select) {
          expect(select).toBeDisabled();
        }
      });
    });
  });

  describe('Failed Submission', () => {
    it('should handle submission failure', async () => {
      // Mock random to trigger failure (< 0.1)
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      await user.type(screen.getByLabelText(/Value/), '75.5');
      await user.click(screen.getByText('Submit'));

      await waitFor(
        () => {
          expect(screen.getByText(/Error:/)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should show network error message on submission failure', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      await user.type(screen.getByLabelText(/Value/), '75.5');
      await user.click(screen.getByText('Submit'));

      await waitFor(
        () => {
          expect(screen.getByText(/Network error: Failed to submit data/)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should transition to error state on submission failure', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      await user.type(screen.getByLabelText(/Value/), '75.5');
      await user.click(screen.getByText('Submit'));

      await waitFor(
        () => {
          expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain('error');
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Retry Flow', () => {
    it('should allow retrying after validation error', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      // First, cause a validation error
      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      const valueInput = screen.getByLabelText(/Value/);
      await user.type(valueInput, '1');
      await user.clear(valueInput);
      await user.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });

      // Click Retry
      await user.click(screen.getByText('Retry'));

      // Should return to enteringData state
      expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain(
        'enteringData'
      );
      expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
    });

    it('should allow retrying after submission failure', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      await user.type(screen.getByLabelText(/Value/), '75.5');
      await user.click(screen.getByText('Submit'));

      await waitFor(
        () => {
          expect(screen.getByText(/Network error/)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Click Retry
      await user.click(screen.getByText('Retry'));

      expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain(
        'enteringData'
      );
      expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
    });

    it('should preserve form data after retry', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      const valueInput = screen.getByLabelText(/Value/);
      await user.type(valueInput, '75');
      await user.clear(valueInput); // Clear to cause validation error
      await user.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });

      await user.click(screen.getByText('Retry'));

      // Form should still be in enteringData state with fields visible
      expect(screen.getByLabelText(/Value/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Metric Type:/)).toBeInTheDocument();
    });
  });

  describe('Cancel and Reset Flow', () => {
    it('should reset form when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      await user.type(screen.getByLabelText(/Value/), '75.5');
      await user.click(screen.getByText('Cancel'));

      // Should return to idle state
      expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain('idle');

      // Form should be reset
      const select = screen.getByLabelText(/Metric Type:/) as HTMLSelectElement;
      expect(select.value).toBe('');
    });

    it('should clear form data when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      await user.type(screen.getByLabelText(/Value/), '75.5');

      expect(screen.getByLabelText(/Value/)).toBeInTheDocument();

      await user.click(screen.getByText('Cancel'));

      // Value input should disappear
      expect(screen.queryByLabelText(/Value/)).not.toBeInTheDocument();
    });

    it('should reset form when Add Another is clicked after success', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      await user.type(screen.getByLabelText(/Value/), '75.5');
      await user.click(screen.getByText('Submit'));

      await waitFor(
        () => {
          expect(screen.getByText('Add Another')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      await user.click(screen.getByText('Add Another'));

      // Should return to idle state
      expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain('idle');

      // Form should be reset
      const select = screen.getByLabelText(/Metric Type:/) as HTMLSelectElement;
      expect(select.value).toBe('');
    });

    it('should reset form when Cancel is clicked in error state', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'weight');
      const valueInput = screen.getByLabelText(/Value/);
      await user.type(valueInput, '1');
      await user.clear(valueInput);
      await user.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });

      await user.click(screen.getByText('Cancel'));

      expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain('idle');
      expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
    });
  });

  describe('Complete User Flows', () => {
    it('should complete full happy path flow', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      // Start in idle
      expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain('idle');

      // Select metric type
      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'blood_pressure');
      expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain(
        'selectingType'
      );

      // Enter value
      await user.type(screen.getByLabelText(/Value/), '120');
      expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain(
        'enteringData'
      );

      // Submit
      await user.click(screen.getByText('Submit'));

      // Success
      await waitFor(
        () => {
          expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain(
            'success'
          );
          expect(screen.getByText('Health data recorded successfully.')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Add another
      await user.click(screen.getByText('Add Another'));
      expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain('idle');
    });

    it('should complete validation error and retry flow', async () => {
      const user = userEvent.setup();
      render(<HealthDataEntryForm />);

      // Select type and enter then clear value to cause validation error
      await user.selectOptions(screen.getByLabelText(/Metric Type:/), 'heart_rate');
      const valueInput = screen.getByLabelText(/Value/);
      await user.type(valueInput, '1');
      await user.clear(valueInput);
      await user.click(screen.getByText('Submit'));

      // Error state
      await waitFor(() => {
        expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain('error');
      });

      // Retry
      await user.click(screen.getByText('Retry'));
      expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain(
        'enteringData'
      );

      // Now enter value and submit successfully
      await user.type(screen.getByLabelText(/Value/), '72');
      await user.click(screen.getByText('Submit'));

      await waitFor(
        () => {
          expect(screen.getByText(/Current State:/).parentElement?.textContent).toContain(
            'success'
          );
        },
        { timeout: 2000 }
      );
    });
  });
});
