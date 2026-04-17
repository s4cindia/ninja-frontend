import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ZoneLabelDropdown from '../ZoneLabelDropdown';

describe('ZoneLabelDropdown', () => {
  it('renders all 16 zone types as option elements', () => {
    render(<ZoneLabelDropdown value="" onChange={() => {}} />);
    const select = screen.getByLabelText('Zone type');
    // 16 zone types + 1 placeholder = 17 options
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(17);
  });

  it('"toci" option shows label "TOCI — Table of Contents Item"', () => {
    render(<ZoneLabelDropdown value="" onChange={() => {}} />);
    const option = screen.getByText('TOCI — Table of Contents Item');
    expect(option).toBeInTheDocument();
    expect((option as HTMLOptionElement).value).toBe('toci');
  });

  it('"paragraph" option shows label "P — Body Text"', () => {
    render(<ZoneLabelDropdown value="" onChange={() => {}} />);
    const option = screen.getByText('P — Body Text');
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
