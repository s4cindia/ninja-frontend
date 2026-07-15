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
    const rect = container.querySelector('g rect');
    expect(rect?.getAttribute('stroke')).toBe('#16a34a');
  });

  it('AMBER zone has amber stroke colour', () => {
    const { container } = render(
      <ZoneOverlay
        {...defaultProps}
        zones={[makeZone({ reconciliationBucket: 'AMBER' })]}
      />
    );
    const rect = container.querySelector('g rect');
    expect(rect?.getAttribute('stroke')).toBe('#d97706');
  });

  it('RED zone has red stroke colour', () => {
    const { container } = render(
      <ZoneOverlay
        {...defaultProps}
        zones={[makeZone({ reconciliationBucket: 'RED' })]}
      />
    );
    const rect = container.querySelector('g rect');
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
    const rect = container.querySelector('g rect');
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

  it('shift-click on a zone calls onZoneToggle instead of onZoneClick', () => {
    const onZoneClick = vi.fn();
    const onZoneToggle = vi.fn();
    const { container } = render(
      <ZoneOverlay
        {...defaultProps}
        zones={[makeZone({ id: 'z-shift' })]}
        onZoneClick={onZoneClick}
        onZoneToggle={onZoneToggle}
      />
    );
    const g = container.querySelector('g');
    fireEvent.click(g!, { shiftKey: true });
    expect(onZoneToggle).toHaveBeenCalledWith('z-shift');
    expect(onZoneClick).not.toHaveBeenCalled();
  });

  it('ctrl-click on a zone calls onZoneToggle instead of onZoneClick', () => {
    const onZoneClick = vi.fn();
    const onZoneToggle = vi.fn();
    const { container } = render(
      <ZoneOverlay
        {...defaultProps}
        zones={[makeZone({ id: 'z-ctrl' })]}
        onZoneClick={onZoneClick}
        onZoneToggle={onZoneToggle}
      />
    );
    const g = container.querySelector('g');
    fireEvent.click(g!, { ctrlKey: true });
    expect(onZoneToggle).toHaveBeenCalledWith('z-ctrl');
    expect(onZoneClick).not.toHaveBeenCalled();
  });

  it('multi-selected zone has blue stroke colour', () => {
    const { container } = render(
      <ZoneOverlay
        {...defaultProps}
        zones={[makeZone({ id: 'z1', reconciliationBucket: 'GREEN' })]}
        selectedIds={new Set(['z1'])}
      />
    );
    const rect = container.querySelector('g rect');
    expect(rect?.getAttribute('stroke')).toBe('#2563eb');
  });

  it('draw mode disables pointer events on zone groups', () => {
    const { container } = render(
      <ZoneOverlay
        {...defaultProps}
        zones={[makeZone({ id: 'z1' })]}
        drawMode
      />
    );
    const g = container.querySelector('g');
    expect(g?.getAttribute('style')).toContain('pointer-events: none');
  });

  it('hides rejected zones by default', () => {
    const { container } = render(
      <ZoneOverlay
        {...defaultProps}
        zones={[makeZone({ id: 'z1', decision: 'REJECTED' })]}
      />
    );
    expect(container.querySelectorAll('g').length).toBe(0);
  });

  it('shows rejected zones muted, with no number badge, when showRejected is on', () => {
    const { container } = render(
      <ZoneOverlay
        {...defaultProps}
        zones={[makeZone({ id: 'z1', decision: 'REJECTED' })]}
        showRejected
      />
    );
    const g = container.querySelector('g');
    expect(g).toBeInTheDocument();
    expect(g?.getAttribute('style')).toContain('opacity: 0.4');
    expect(g?.querySelector('circle')).toBeNull();
    const rect = g?.querySelector('rect');
    expect(rect?.getAttribute('stroke')).toBe('#9ca3af');
    expect(rect?.getAttribute('stroke-dasharray')).toBe('4 3');
  });

  it('non-rejected zones are unaffected by showRejected', () => {
    const { container } = render(
      <ZoneOverlay
        {...defaultProps}
        zones={[makeZone({ id: 'z1', reconciliationBucket: 'GREEN' })]}
        showRejected
      />
    );
    const g = container.querySelector('g');
    expect(g?.getAttribute('style')).toContain('opacity: 1');
    expect(g?.querySelector('circle')).not.toBeNull();
  });
});
