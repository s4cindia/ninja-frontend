import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditionSelector } from '../EditionSelector';
import type { AcrEdition } from '@/types/acr.types';

const editionsList: AcrEdition[] = [
  {
    id: 'e-int',
    code: 'VPAT2.5-INT',
    name: 'International',
    description: 'Comprehensive',
    isRecommended: true,
  },
  {
    id: 'e-prh',
    code: 'VPAT2.5-PRH-UK',
    name: 'PRH UK Edition',
    description: 'Penguin Random House UK delivery',
    standards: ['EPUB Accessibility 1.1', 'WCAG 2.2'],
    isRecommended: false,
  },
];

vi.mock('@/hooks/useAcr', () => ({
  useEditions: () => ({ data: editionsList, isLoading: false, error: null }),
}));

vi.mock('../CriteriaListModal', () => ({
  CriteriaListModal: () => null,
}));

describe('EditionSelector — PRH UK entry', () => {
  it('renders the PRH UK Edition card with publisher subtitle', () => {
    render(<EditionSelector selectedEdition={null} onSelect={() => {}} />);
    expect(
      screen.getByRole('heading', { level: 3, name: /PRH UK Edition/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Penguin Random House UK')).toBeInTheDocument();
  });

  it('keeps the International edition marked as Recommended', () => {
    render(<EditionSelector selectedEdition={null} onSelect={() => {}} />);
    expect(screen.getByText(/Recommended/i)).toBeInTheDocument();
  });

  it('forwards the PRH UK edition to onSelect when its card is clicked', async () => {
    const onSelect = vi.fn();
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<EditionSelector selectedEdition={null} onSelect={onSelect} />);
    await userEvent.click(
      screen.getByRole('button', { name: /Select PRH UK Edition edition/i }),
    );
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'VPAT2.5-PRH-UK' }),
    );
  });
});
