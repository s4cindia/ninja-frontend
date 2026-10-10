import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AutoModeStartControl } from './AutoModeStartControl';

function renderControl(props?: Partial<Parameters<typeof AutoModeStartControl>[0]>) {
  const onStart = vi.fn();
  const utils = render(
    <AutoModeStartControl
      onStart={onStart}
      isPending={false}
      disabled={false}
      showConfig={true}
      {...props}
    />
  );
  return { onStart, ...utils };
}

describe('AutoModeStartControl', () => {
  it('starts immediately with no overrides when showConfig is false (a trial-linked job, whose overrides the backend would ignore anyway)', () => {
    const { onStart } = renderControl({ showConfig: false });

    fireEvent.click(screen.getByRole('button', { name: 'Start Auto Remediation' }));

    expect(onStart).toHaveBeenCalledWith();
    expect(screen.queryByLabelText('Max rounds')).not.toBeInTheDocument();
  });

  it('opens a config popover instead of starting immediately when showConfig is true', () => {
    const { onStart } = renderControl({ showConfig: true });

    fireEvent.click(screen.getByRole('button', { name: 'Start Auto Remediation' }));

    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Max rounds')).toBeInTheDocument();
    expect(screen.getByLabelText('Cost limit (USD)')).toBeInTheDocument();
    expect(screen.getByLabelText('Color-contrast handling')).toBeInTheDocument();
  });

  it('pre-fills the popover with the documented defaults (10 rounds, $2.00, apply-to-pdf)', () => {
    renderControl({ showConfig: true });
    fireEvent.click(screen.getByRole('button', { name: 'Start Auto Remediation' }));

    expect(screen.getByLabelText('Max rounds')).toHaveValue(10);
    expect(screen.getByLabelText('Cost limit (USD)')).toHaveValue(2);
    expect(screen.getByLabelText('Color-contrast handling')).toHaveValue('apply-to-pdf');
  });

  it('confirms with the defaults unchanged when the operator just clicks Start', () => {
    const { onStart } = renderControl({ showConfig: true });
    fireEvent.click(screen.getByRole('button', { name: 'Start Auto Remediation' }));

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(onStart).toHaveBeenCalledWith({
      autoMaxRounds: 10,
      autoCostLimitUsd: 2,
      autoColorContrastMode: 'apply-to-pdf',
    });
    // Popover closes after confirming.
    expect(screen.queryByLabelText('Max rounds')).not.toBeInTheDocument();
  });

  it('confirms with edited values', () => {
    const { onStart } = renderControl({ showConfig: true });
    fireEvent.click(screen.getByRole('button', { name: 'Start Auto Remediation' }));

    fireEvent.change(screen.getByLabelText('Max rounds'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Cost limit (USD)'), { target: { value: '0.75' } });
    fireEvent.change(screen.getByLabelText('Color-contrast handling'), { target: { value: 'guidance-only' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(onStart).toHaveBeenCalledWith({
      autoMaxRounds: 5,
      autoCostLimitUsd: 0.75,
      autoColorContrastMode: 'guidance-only',
    });
  });

  it('falls back to the default for an invalid (non-positive or non-numeric) max rounds / cost limit, rather than sending garbage to the backend', () => {
    const { onStart } = renderControl({ showConfig: true });
    fireEvent.click(screen.getByRole('button', { name: 'Start Auto Remediation' }));

    fireEvent.change(screen.getByLabelText('Max rounds'), { target: { value: '-3' } });
    fireEvent.change(screen.getByLabelText('Cost limit (USD)'), { target: { value: 'not-a-number' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(onStart).toHaveBeenCalledWith({
      autoMaxRounds: 10,
      autoCostLimitUsd: 2,
      autoColorContrastMode: 'apply-to-pdf',
    });
  });

  it('cancel closes the popover without starting', () => {
    const { onStart } = renderControl({ showConfig: true });
    fireEvent.click(screen.getByRole('button', { name: 'Start Auto Remediation' }));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onStart).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Max rounds')).not.toBeInTheDocument();
  });

  it('is disabled with the given title when disabled is true', () => {
    renderControl({ disabled: true, disabledTitle: 'A run is already in progress' });

    const button = screen.getByRole('button', { name: 'Start Auto Remediation' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'A run is already in progress');
  });

  it('shows the pending "Starting…" state and stays disabled', () => {
    renderControl({ isPending: true });

    const button = screen.getByRole('button', { name: /Starting…/ });
    expect(button).toBeDisabled();
  });
});
