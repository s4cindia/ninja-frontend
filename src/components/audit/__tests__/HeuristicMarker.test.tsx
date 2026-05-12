import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeuristicMarker } from '../HeuristicMarker';

describe('HeuristicMarker', () => {
  it('renders an accessible icon trigger labelled "Heuristic finding"', () => {
    render(<HeuristicMarker />);
    expect(screen.getByLabelText(/Heuristic finding/i)).toBeInTheDocument();
  });

  it('reveals the false-positive tooltip on hover', async () => {
    render(<HeuristicMarker />);
    const trigger = screen.getByLabelText(/Heuristic finding/i);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await userEvent.hover(trigger);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(/Pattern detector/);
    expect(tooltip).toHaveTextContent(/may be a false positive/);
    expect(tooltip).toHaveTextContent(/Review the highlighted text manually/);
  });

  it('uses neutral (not red/yellow) styling so it reads as informational', () => {
    render(<HeuristicMarker />);
    const trigger = screen.getByLabelText(/Heuristic finding/i);
    // Marker uses a neutral gray palette — confirm no warning colours leak in.
    expect(trigger.className).toMatch(/text-gray-/);
    expect(trigger.className).not.toMatch(/text-(red|orange|yellow)/);
  });
});
