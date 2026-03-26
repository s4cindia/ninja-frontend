import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ZoneDetailPanel from '../ZoneDetailPanel';
import type { CalibrationZone } from '@/services/zone-correction.service';

function makeZone(overrides: Partial<CalibrationZone> = {}): CalibrationZone {
  return {
    id: 'zone-abc-123-def',
    calibrationRunId: 'run-1',
    type: 'paragraph',
    reconciliationBucket: 'GREEN',
    operatorVerified: false,
    isArtefact: false,
    pageNumber: 1,
    source: 'docling',
    bounds: { x: 0, y: 0, w: 100, h: 20 },
    ...overrides,
  };
}

const noop = () => {};

describe('ZoneDetailPanel', () => {
  it('shows "Select a zone to review" when zone is null', () => {
    render(
      <ZoneDetailPanel
        zone={null}
        onConfirm={noop}
        onCorrect={noop}
        onReject={noop}
        onEditStructure={noop}
        isConfirming={false}
        isCorrecting={false}
        isRejecting={false}
      />
    );
    expect(screen.getByText('Select a zone to review')).toBeInTheDocument();
  });

  it('renders type, page number, and bucket badge for a non-null zone', () => {
    render(
      <ZoneDetailPanel
        zone={makeZone()}
        onConfirm={noop}
        onCorrect={noop}
        onReject={noop}
        onEditStructure={noop}
        isConfirming={false}
        isCorrecting={false}
        isRejecting={false}
      />
    );
    expect(screen.getByText('paragraph')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Green')).toBeInTheDocument();
  });

  it('shows both doclingLabel and pdfxtLabel for AMBER zone', () => {
    render(
      <ZoneDetailPanel
        zone={makeZone({
          reconciliationBucket: 'AMBER',
          doclingLabel: 'table',
          pdfxtLabel: 'figure',
        })}
        onConfirm={noop}
        onCorrect={noop}
        onReject={noop}
        onEditStructure={noop}
        isConfirming={false}
        isCorrecting={false}
        isRejecting={false}
      />
    );
    expect(screen.getByText('table')).toBeInTheDocument();
    expect(screen.getByText('figure')).toBeInTheDocument();
    expect(screen.getByText('Tools disagree')).toBeInTheDocument();
  });

  it('does NOT show tool labels for GREEN zone', () => {
    render(
      <ZoneDetailPanel
        zone={makeZone({ reconciliationBucket: 'GREEN' })}
        onConfirm={noop}
        onCorrect={noop}
        onReject={noop}
        onEditStructure={noop}
        isConfirming={false}
        isCorrecting={false}
        isRejecting={false}
      />
    );
    expect(screen.queryByText('Tools disagree')).not.toBeInTheDocument();
  });

  it('Confirm button calls onConfirm with zone.id', () => {
    const onConfirm = vi.fn();
    render(
      <ZoneDetailPanel
        zone={makeZone()}
        onConfirm={onConfirm}
        onCorrect={noop}
        onReject={noop}
        onEditStructure={noop}
        isConfirming={false}
        isCorrecting={false}
        isRejecting={false}
      />
    );
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledWith('zone-abc-123-def');
  });

  it('Reject button calls onReject with zone.id', () => {
    const onReject = vi.fn();
    render(
      <ZoneDetailPanel
        zone={makeZone()}
        onConfirm={noop}
        onCorrect={noop}
        onReject={onReject}
        onEditStructure={noop}
        isConfirming={false}
        isCorrecting={false}
        isRejecting={false}
      />
    );
    fireEvent.click(screen.getByText('Reject (Artefact)'));
    expect(onReject).toHaveBeenCalledWith('zone-abc-123-def');
  });

  it('shows Re-confirm button when operatorVerified=true', () => {
    render(
      <ZoneDetailPanel
        zone={makeZone({ operatorVerified: true })}
        onConfirm={noop}
        onCorrect={noop}
        onReject={noop}
        onEditStructure={noop}
        isConfirming={false}
        isCorrecting={false}
        isRejecting={false}
      />
    );
    const btn = screen.getByText('Re-confirm');
    expect(btn).toBeEnabled();
  });

  it('shows "Edit Table Structure" for table zones', () => {
    render(
      <ZoneDetailPanel
        zone={makeZone({ type: 'table' })}
        onConfirm={noop}
        onCorrect={noop}
        onReject={noop}
        onEditStructure={noop}
        isConfirming={false}
        isCorrecting={false}
        isRejecting={false}
      />
    );
    expect(screen.getByText('Edit Table Structure')).toBeInTheDocument();
  });

  it('does NOT show "Edit Table Structure" for paragraph zones', () => {
    render(
      <ZoneDetailPanel
        zone={makeZone({ type: 'paragraph' })}
        onConfirm={noop}
        onCorrect={noop}
        onReject={noop}
        onEditStructure={noop}
        isConfirming={false}
        isCorrecting={false}
        isRejecting={false}
      />
    );
    expect(screen.queryByText('Edit Table Structure')).not.toBeInTheDocument();
  });

  it('shows "Rejected" and disables Reject button when isArtefact=true', () => {
    render(
      <ZoneDetailPanel
        zone={makeZone({ isArtefact: true })}
        onConfirm={noop}
        onCorrect={noop}
        onReject={noop}
        onEditStructure={noop}
        isConfirming={false}
        isCorrecting={false}
        isRejecting={false}
      />
    );
    const btn = screen.getByText('Rejected');
    expect(btn).toBeDisabled();
  });
});
