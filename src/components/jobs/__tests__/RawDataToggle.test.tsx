import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RawDataToggle } from '../RawDataToggle';

describe('RawDataToggle', () => {
  it('is collapsed by default', () => {
    render(<RawDataToggle data={{ test: 'value' }} />);

    expect(screen.getByText(/show raw data/i)).toBeInTheDocument();
    expect(screen.queryByText('"test"')).not.toBeInTheDocument();
  });

  it('expands when clicked', () => {
    render(<RawDataToggle data={{ test: 'value' }} />);

    fireEvent.click(screen.getByText(/show raw data/i));

    expect(screen.getByText(/hide raw data/i)).toBeInTheDocument();
    expect(screen.getByText(/"test"/)).toBeInTheDocument();
  });

  it('collapses when clicked again', () => {
    render(<RawDataToggle data={{ test: 'value' }} />);

    fireEvent.click(screen.getByText(/show raw data/i));
    fireEvent.click(screen.getByText(/hide raw data/i));

    expect(screen.getByText(/show raw data/i)).toBeInTheDocument();
  });

  it('handles circular references safely', () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;

    render(<RawDataToggle data={circular} />);
    fireEvent.click(screen.getByText(/show raw data/i));

    expect(screen.getByText(/circular reference/i)).toBeInTheDocument();
  });

  it('handles null data', () => {
    render(<RawDataToggle data={null} />);
    fireEvent.click(screen.getByText(/show raw data/i));

    expect(screen.getByText('null')).toBeInTheDocument();
  });

  it('handles empty object', () => {
    render(<RawDataToggle data={{}} />);
    fireEvent.click(screen.getByText(/show raw data/i));

    expect(screen.getByText('{}')).toBeInTheDocument();
  });
});
