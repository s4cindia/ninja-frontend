import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StructureTagBox, StructureTagDetailStrip } from './StructureTagPanel';
import type { StructureTagElement } from '@/types/pdfStructureTags.types';

const ELEMENT: StructureTagElement = {
  elementId: '12-0',
  tag: 'H1',
  pageNumber: 1,
  bbox: { x: 100, y: 292, width: 70, height: 20, pageWidth: 612, pageHeight: 792 },
};

describe('StructureTagBox', () => {
  it('renders the element\'s tag as its label and positions it at the given coordinates', () => {
    render(<StructureTagBox element={ELEMENT} x={10} y={20} width={30} height={40} isSelected={false} onClick={vi.fn()} />);

    expect(screen.getByText('H1')).toBeInTheDocument();
    const box = screen.getByRole('button', { name: 'H1 element' });
    expect(box).toHaveStyle({ left: '10px', top: '20px', width: '30px', height: '40px' });
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<StructureTagBox element={ELEMENT} x={0} y={0} width={10} height={10} isSelected={false} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'H1 element' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick on Enter/Space for keyboard access', () => {
    const onClick = vi.fn();
    render(<StructureTagBox element={ELEMENT} x={0} y={0} width={10} height={10} isSelected={false} onClick={onClick} />);

    fireEvent.keyDown(screen.getByRole('button', { name: 'H1 element' }), { key: 'Enter' });

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows a visible outline when selected', () => {
    render(<StructureTagBox element={ELEMENT} x={0} y={0} width={10} height={10} isSelected={true} onClick={vi.fn()} />);

    const box = screen.getByRole('button', { name: 'H1 element' });
    expect(box.style.outline).not.toBe('');
  });
});

describe('StructureTagDetailStrip', () => {
  it('shows the current tag and a dropdown defaulted to it', () => {
    render(<StructureTagDetailStrip element={ELEMENT} onChange={vi.fn()} />);

    expect(screen.getByText('Selected: H1')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Change structure tag' })).toHaveValue('H1');
  });

  it('calls onChange with the newly selected tag', () => {
    const onChange = vi.fn();
    render(<StructureTagDetailStrip element={ELEMENT} onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Change structure tag' }), { target: { value: 'H2' } });

    expect(onChange).toHaveBeenCalledWith('H2');
  });

  it('disables the dropdown and shows a spinner while saving', () => {
    render(<StructureTagDetailStrip element={ELEMENT} onChange={vi.fn()} saving />);

    expect(screen.getByRole('combobox', { name: 'Change structure tag' })).toBeDisabled();
    expect(screen.getByLabelText('Saving')).toBeInTheDocument();
  });

  it('shows the text snippet when present', () => {
    render(<StructureTagDetailStrip element={{ ...ELEMENT, textSnippet: 'Chapter One' }} onChange={vi.fn()} />);

    expect(screen.getByText('Chapter One')).toBeInTheDocument();
  });

  it('omits the snippet paragraph when absent', () => {
    render(<StructureTagDetailStrip element={ELEMENT} onChange={vi.fn()} />);

    expect(screen.queryByText('Chapter One')).not.toBeInTheDocument();
  });
});
