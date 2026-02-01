import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationBadge } from './ValidationBadge';

describe('ValidationBadge', () => {
  const defaultProps = {
    state: 'idle' as const,
    onValidate: vi.fn(),
  };

  it('renders validate button in idle state', () => {
    render(<ValidationBadge {...defaultProps} state="idle" />);

    expect(screen.getByText('Validate QR')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it('calls onValidate when button clicked in idle state', () => {
    const onValidate = vi.fn();
    render(<ValidationBadge {...defaultProps} state="idle" onValidate={onValidate} />);

    fireEvent.click(screen.getByText('Validate QR'));

    expect(onValidate).toHaveBeenCalledTimes(1);
  });

  it('disables button when isValidating is true', () => {
    render(<ValidationBadge {...defaultProps} state="idle" isValidating={true} />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders loading spinner in validating state', () => {
    render(<ValidationBadge {...defaultProps} state="validating" />);

    expect(screen.getByText('Validating...')).toBeInTheDocument();
    // No button should be present during validation
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders success state with checkmark', () => {
    render(<ValidationBadge {...defaultProps} state="pass" />);

    expect(screen.getByText('Scan Verified')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('displays custom message in pass state', () => {
    render(
      <ValidationBadge {...defaultProps} state="pass" message="Custom success message" />
    );

    expect(screen.getByText('Custom success message')).toBeInTheDocument();
  });

  it('shows default message when no custom message in pass state', () => {
    render(<ValidationBadge {...defaultProps} state="pass" />);

    expect(screen.getByText('QR code scans correctly')).toBeInTheDocument();
  });

  it('renders Re-test button in pass state', () => {
    const onValidate = vi.fn();
    render(<ValidationBadge {...defaultProps} state="pass" onValidate={onValidate} />);

    const retestButton = screen.getByText('Re-test');
    expect(retestButton).toBeInTheDocument();

    fireEvent.click(retestButton);
    expect(onValidate).toHaveBeenCalled();
  });

  it('renders warning state', () => {
    render(<ValidationBadge {...defaultProps} state="warn" />);

    expect(screen.getByText('Marginal Scan')).toBeInTheDocument();
    expect(screen.getByText('!')).toBeInTheDocument();
  });

  it('displays custom message in warn state', () => {
    render(
      <ValidationBadge {...defaultProps} state="warn" message="Decoded but differs" />
    );

    expect(screen.getByText('Decoded but differs')).toBeInTheDocument();
  });

  it('shows suggestions in warn state', () => {
    render(
      <ValidationBadge
        {...defaultProps}
        state="warn"
        suggestions={['Increase error correction level']}
      />
    );

    expect(screen.getByText(/Increase error correction level/)).toBeInTheDocument();
  });

  it('renders Re-test button in warn state', () => {
    const onValidate = vi.fn();
    render(<ValidationBadge {...defaultProps} state="warn" onValidate={onValidate} />);

    fireEvent.click(screen.getByText('Re-test'));
    expect(onValidate).toHaveBeenCalled();
  });

  it('renders fail state', () => {
    render(<ValidationBadge {...defaultProps} state="fail" />);

    expect(screen.getByText('Scan Failed')).toBeInTheDocument();
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  it('displays custom message in fail state', () => {
    render(
      <ValidationBadge {...defaultProps} state="fail" message="No QR code detected" />
    );

    expect(screen.getByText('No QR code detected')).toBeInTheDocument();
  });

  it('shows default message when no custom message in fail state', () => {
    render(<ValidationBadge {...defaultProps} state="fail" />);

    expect(screen.getByText('Could not decode QR code')).toBeInTheDocument();
  });

  it('shows suggestions in fail state', () => {
    const suggestions = [
      'Increase error correction level to H',
      'Reduce logo size if using one',
      'Ensure sufficient contrast between colors',
    ];
    render(<ValidationBadge {...defaultProps} state="fail" suggestions={suggestions} />);

    // Should show first two suggestions
    expect(screen.getByText('• Increase error correction level to H')).toBeInTheDocument();
    expect(screen.getByText('• Reduce logo size if using one')).toBeInTheDocument();
    // Third suggestion should be cut off
    expect(screen.queryByText(/Ensure sufficient contrast/)).not.toBeInTheDocument();
  });

  it('renders Re-test button in fail state', () => {
    const onValidate = vi.fn();
    render(<ValidationBadge {...defaultProps} state="fail" onValidate={onValidate} />);

    fireEvent.click(screen.getByText('Re-test'));
    expect(onValidate).toHaveBeenCalled();
  });

  it('renders nothing for unknown state', () => {
    // @ts-expect-error Testing invalid state
    const { container } = render(<ValidationBadge {...defaultProps} state="unknown" />);

    expect(container.firstChild).toBeNull();
  });

  it('handles empty suggestions array', () => {
    render(<ValidationBadge {...defaultProps} state="fail" suggestions={[]} />);

    // Should still render fail state without crashing
    expect(screen.getByText('Scan Failed')).toBeInTheDocument();
  });
});
