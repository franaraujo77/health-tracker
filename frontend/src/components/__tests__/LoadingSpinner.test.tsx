import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render loading text', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render spinner element with correct styles', () => {
    const { container } = render(<LoadingSpinner />);

    // Find all divs and look for the one with border-radius in its style
    const allDivs = container.querySelectorAll('div');
    const spinner = Array.from(allDivs).find((div) =>
      div.getAttribute('style')?.includes('border-radius')
    );

    expect(spinner).toBeTruthy();

    // Check that spinner has the expected styles
    const style = spinner?.getAttribute('style');
    expect(style).toContain('border-radius');
    expect(style).toContain('48px');
  });

  it('should include spin animation keyframes', () => {
    const { container } = render(<LoadingSpinner />);

    // Check that style tag with keyframes is present
    const styleTag = container.querySelector('style');
    expect(styleTag).toBeInTheDocument();
    expect(styleTag?.textContent).toContain('@keyframes spin');
    expect(styleTag?.textContent).toContain('transform: rotate(0deg)');
    expect(styleTag?.textContent).toContain('transform: rotate(360deg)');
  });

  it('should center content vertically and horizontally', () => {
    const { container } = render(<LoadingSpinner />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
    });
  });

  it('should have gap between spinner and text', () => {
    const { container } = render(<LoadingSpinner />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({
      flexDirection: 'column',
      gap: '16px',
    });
  });
});
