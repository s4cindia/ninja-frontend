import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ZoneOverlay from '../ZoneOverlay';
import type { CalibrationZone } from '@/services/zone-correction.service';

function makeZone(overrides: Partial<CalibrationZone> = {}): CalibrationZone {
  return {
    id: 'zone-1',
    calibrationRunId: 'run-1',
    type: 'paragraph',
    reconciliationBucket: 'GREEN',
    operatorVerified: false,
    isArtefact: false,
    pageNumber: 1,
    source: 'docling',
    bounds: { x: 10, y: 10, w: 100, h: 50 },
    ...overrides,
  };
}

const defaultProps = {
  selectedZoneId: null,
  pageNumber: 1,
  scaleX: 800 / 595,
  scaleY: 1000 / 842,
  onZoneClick: vi.fn(),
};

describe('ZoneOverlay', () => {
  it('renders an <svg> element', () => {
    const { container } = render(
      <ZoneOverlay {...defaultProps} zones={[]} />
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders correct number of <g> elements for zones on current page', () => {
    const zones = [
      makeZone({ id: 'z1' }),
      makeZone({ id: 'z2' }),
    ];
    const { container } = render(
      <ZoneOverlay {...defaultProps} zones={zones} />
    );
    const groups = container.querySelectorAll('g');
    expect(groups.length).toBe(2);
  });

  it('does NOT render zones on other pages', () => {
    const zones = [
      makeZone({ id: 'z1', pageNumber: 1 }),
      makeZone({ id: 'z2', pageNumber: 2 }),
    ];
    const { container } = render(
      <ZoneOverlay {...defaultProps} zones={zones} pageNumber={1} />
    );
    const groups = container.querySelectorAll('g');
    expect(groups.length).toBe(1);
  });

  it('GREEN zone has green stroke colour', () => {
    const { container } = render(
      <ZoneOverlay
        {...defaultProps}
        zones={[makeZone({ reconciliationBucket: 'GREEN' })]}
      />
    );
    const rect = container.querySelector('rect');
    expect(rect?.getAttribute('stroke')).toBe('#16a34a');
  });

  it('AMBER zone has amber stroke colour', () => {
    const { container } = render(
      <ZoneOverlay
        {...defaultProps}
        zones={[makeZone({ reconciliationBucket: 'AMBER' })]}
      />
    );
    const rect = container.querySelector('rect');
    expect(rect?.getAttribute('stroke')).toBe('#d97706');
  });

  it('RED zone has red stroke colour', () => {
    const { container } = render(
      <ZoneOverlay
        {...defaultProps}
        zones={[makeZone({ reconciliationBucket: 'RED' })]}
      />
    );
    const rect = container.querySelector('rect');
    expect(rect?.getAttribute('stroke')).toBe('#dc2626');
  });

  it('selected zone has strokeWidth=3', () => {
    const { container } = render(
      <ZoneOverlay
        {...defaultProps}
        zones={[makeZone({ id: 'z1' })]}
        selectedZoneId="z1"
      />
    );
    const rect = container.querySelector('rect');
    expect(rect?.getAttribute('stroke-width')).toBe('3');
  });

  it('clicking a zone calls onZoneClick with correct id', () => {
    const onZoneClick = vi.fn();
    const { container } = render(
      <ZoneOverlay
        {...defaultProps}
        zones={[makeZone({ id: 'z-click' })]}
        onZoneClick={onZoneClick}
      />
    );
    const g = container.querySelector('g');
    fireEvent.click(g!);
    expect(onZoneClick).toHaveBeenCalledWith('z-click');
  });

  it('pressing Enter on a zone calls onZoneClick', () => {
    const onZoneClick = vi.fn();
    const { container } = render(
      <ZoneOverlay
        {...defaultProps}
        zones={[makeZone({ id: 'z-enter' })]}
        onZoneClick={onZoneClick}
      />
    );
    const g = container.querySelector('g');
    fireEvent.keyDown(g!, { key: 'Enter' });
    expect(onZoneClick).toHaveBeenCalledWith('z-enter');
  });
});
