/**
 * ScanLevelBanner Tests
 *
 * Unit tests for the ScanLevelBanner component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScanLevelBanner } from './ScanLevelBanner';
import type { ScanLevel, ValidatorType } from '@/types/scan-level.types';

describe('ScanLevelBanner', () => {
  const mockOnReScan = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders banner when current scan level is basic', () => {
    render(
      <ScanLevelBanner
        currentScanLevel="basic"
        onReScan={mockOnReScan}
        isScanning={false}
      />
    );

    expect(screen.getByText('Want a deeper analysis?')).toBeInTheDocument();
    expect(screen.getByText('Basic Scan')).toBeInTheDocument();
  });

  it('does not render banner when current scan level is comprehensive', () => {
    const { container } = render(
      <ScanLevelBanner
        currentScanLevel="comprehensive"
        onReScan={mockOnReScan}
        isScanning={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows comprehensive option as default selection', () => {
    render(
      <ScanLevelBanner
        currentScanLevel="basic"
        onReScan={mockOnReScan}
        isScanning={false}
      />
    );

    const comprehensiveRadio = screen.getByRole('radio', { name: /comprehensive/i });
    expect(comprehensiveRadio).toBeChecked();
  });

  it('calls onReScan with comprehensive when button clicked', () => {
    render(
      <ScanLevelBanner
        currentScanLevel="basic"
        onReScan={mockOnReScan}
        isScanning={false}
      />
    );

    const button = screen.getByRole('button', { name: /Run Comprehensive Scan/i });
    fireEvent.click(button);

    expect(mockOnReScan).toHaveBeenCalledWith('comprehensive', undefined);
  });

  it('allows switching to custom scan option', () => {
    render(
      <ScanLevelBanner
        currentScanLevel="basic"
        onReScan={mockOnReScan}
        isScanning={false}
      />
    );

    const customRadio = screen.getByRole('radio', { name: /custom/i });
    fireEvent.click(customRadio);

    expect(customRadio).toBeChecked();
  });

  it('calls onReScan with custom validators when custom selected', () => {
    render(
      <ScanLevelBanner
        currentScanLevel="basic"
        onReScan={mockOnReScan}
        isScanning={false}
      />
    );

    // Switch to custom
    const customRadio = screen.getByRole('radio', { name: /custom/i });
    fireEvent.click(customRadio);

    // Click run button
    const button = screen.getByRole('button', { name: /Run Custom Scan/i });
    fireEvent.click(button);

    // Should be called with custom and default validators (structure, alt-text, tables)
    expect(mockOnReScan).toHaveBeenCalledWith('custom', ['structure', 'alt-text', 'tables']);
  });

  it('shows loading state when isScanning is true', () => {
    render(
      <ScanLevelBanner
        currentScanLevel="basic"
        onReScan={mockOnReScan}
        isScanning={true}
      />
    );

    expect(screen.getByText('Scanning...')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /Scanning/i });
    expect(button).toBeDisabled();
  });

  it('disables button when custom selected with no validators', () => {
    render(
      <ScanLevelBanner
        currentScanLevel="basic"
        onReScan={mockOnReScan}
        isScanning={false}
      />
    );

    // Switch to custom
    const customRadio = screen.getByRole('radio', { name: /custom/i });
    fireEvent.click(customRadio);

    // Expand custom details
    const showDetailsButton = screen.getAllByRole('button', { name: /Show details/i })[1];
    fireEvent.click(showDetailsButton);

    // Uncheck all validators (need to find and uncheck the checkboxes)
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => {
      if ((checkbox as HTMLInputElement).checked) {
        fireEvent.click(checkbox);
      }
    });

    // Button should be disabled when no validators selected
    const button = screen.getByRole('button', { name: /Run Custom Scan/i });
    expect(button).toBeDisabled();
  });

  it('expands comprehensive details when show details clicked', () => {
    render(
      <ScanLevelBanner
        currentScanLevel="basic"
        onReScan={mockOnReScan}
        isScanning={false}
      />
    );

    // Click show details for comprehensive
    const showDetailsButton = screen.getAllByRole('button', { name: /Show details/i })[0];
    fireEvent.click(showDetailsButton);

    // Should show the checks included
    expect(screen.getByText('All Basic checks')).toBeInTheDocument();
    expect(screen.getByText('Heading hierarchy analysis')).toBeInTheDocument();
  });

  it('expands custom details and shows validator options', () => {
    render(
      <ScanLevelBanner
        currentScanLevel="basic"
        onReScan={mockOnReScan}
        isScanning={false}
      />
    );

    // Switch to custom
    const customRadio = screen.getByRole('radio', { name: /custom/i });
    fireEvent.click(customRadio);

    // Click show details for custom
    const showDetailsButton = screen.getAllByRole('button', { name: /Show details/i })[1];
    fireEvent.click(showDetailsButton);

    // Should show validator checkboxes
    expect(screen.getByText('Structure & Tags')).toBeInTheDocument();
    expect(screen.getByText('Alternative Text')).toBeInTheDocument();
    expect(screen.getByText('Color Contrast')).toBeInTheDocument();
  });

  it('shows recommended badge for comprehensive option', () => {
    render(
      <ScanLevelBanner
        currentScanLevel="basic"
        onReScan={mockOnReScan}
        isScanning={false}
      />
    );

    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });

  it('shows current scan level badge', () => {
    render(
      <ScanLevelBanner
        currentScanLevel="basic"
        onReScan={mockOnReScan}
        isScanning={false}
      />
    );

    const badge = screen.getByText('Basic Scan');
    expect(badge).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <ScanLevelBanner
        currentScanLevel="basic"
        onReScan={mockOnReScan}
        isScanning={false}
        className="custom-test-class"
      />
    );

    const card = container.firstChild;
    expect(card).toHaveClass('custom-test-class');
  });
});
