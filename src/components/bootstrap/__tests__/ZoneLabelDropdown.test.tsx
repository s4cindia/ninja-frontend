import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ZoneLabelDropdown from '../ZoneLabelDropdown';

describe('ZoneLabelDropdown', () => {
  it('renders all 8 zone types as option elements', () => {
    render(<ZoneLabelDropdown value="" onChange={() => {}} />);
    const select = screen.getByLabelText('Zone type');
    // 8 zone types + 1 placeholder = 9 options
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(9);
  });

  it('"section-header" option shows label "Heading"', () => {
    render(<ZoneLabelDropdown value="" onChange={() => {}} />);
    const option = screen.getByText('Heading');
    expect(option).toBeInTheDocument();
    expect((option as HTMLOptionElement).value).toBe('section-header');
  });

  it('"paragraph" option shows label "Body Text"', () => {
    render(<ZoneLabelDropdown value="" onChange={() => {}} />);
    const option = screen.getByText('Body Text');
    expect(option).toBeInTheDocument();
    expect((option as HTMLOptionElement).value).toBe('paragraph');
  });

  it('onChange fires with correct value on selection change', () => {
    const onChange = vi.fn();
    render(<ZoneLabelDropdown value="" onChange={onChange} />);
    const select = screen.getByLabelText('Zone type');
    fireEvent.change(select, { target: { value: 'table' } });
    expect(onChange).toHaveBeenCalledWith('table');
  });

  it('disabled prop disables the select', () => {
    render(<ZoneLabelDropdown value="" onChange={() => {}} disabled />);
    const select = screen.getByLabelText('Zone type');
    expect(select).toBeDisabled();
  });
});
