import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  PublisherProfileBadge,
  type PublisherProfile,
} from '../PublisherProfileBadge';

const sampleSignals = [
  { id: 's1', description: 'dc:publisher contains "Penguin Random House UK"', strength: 'strong' as const },
  { id: 's2', description: 'spine starts with cover then frontmatter', strength: 'moderate' as const },
];

function makeProfile(overrides: Partial<PublisherProfile> = {}): PublisherProfile {
  return {
    publisher: 'PRH-UK',
    imprint: 'vintage',
    confidence: 'high',
    signals: sampleSignals,
    ...overrides,
  };
}

describe('PublisherProfileBadge', () => {
  it('renders nothing when the profile is missing', () => {
    const { container } = render(<PublisherProfileBadge profile={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when publisher is null (no profile detected)', () => {
    const { container } = render(
      <PublisherProfileBadge
        profile={{ publisher: null, imprint: null, confidence: 'high', signals: [] }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when confidence is low', () => {
    const { container } = render(
      <PublisherProfileBadge profile={makeProfile({ confidence: 'low' })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows "PRH UK · Vintage" when publisher and imprint are detected', () => {
    render(<PublisherProfileBadge profile={makeProfile()} />);
    expect(screen.getByRole('button', { name: /PRH UK · Vintage/i })).toBeInTheDocument();
  });

  it('shows just "PRH UK" when imprint is unknown', () => {
    render(<PublisherProfileBadge profile={makeProfile({ imprint: 'unknown' })} />);
    const button = screen.getByRole('button', { name: /^PRH UK$/i });
    expect(button).toBeInTheDocument();
  });

  it('formats hyphenated imprint names with title casing', () => {
    render(
      <PublisherProfileBadge profile={makeProfile({ imprint: 'cornerstone-saga' })} />,
    );
    expect(
      screen.getByRole('button', { name: /PRH UK · Cornerstone Saga/i }),
    ).toBeInTheDocument();
  });

  it('opens the signals popover on click and closes again', async () => {
    render(<PublisherProfileBadge profile={makeProfile()} />);
    const button = screen.getByRole('button', { name: /PRH UK/i });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(button);
    const dialog = screen.getByRole('dialog', { name: /Publisher detection signals/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('dc:publisher contains "Penguin Random House UK"');
    expect(dialog).toHaveTextContent('spine starts with cover then frontmatter');
    // Strength chips render with their label
    expect(dialog).toHaveTextContent(/strong/i);
    expect(dialog).toHaveTextContent(/moderate/i);

    await userEvent.click(button);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reflects open state via aria-expanded for assistive tech', async () => {
    render(<PublisherProfileBadge profile={makeProfile()} />);
    const button = screen.getByRole('button', { name: /PRH UK/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows a graceful empty state when there are zero signals', async () => {
    render(<PublisherProfileBadge profile={makeProfile({ signals: [] })} />);
    await userEvent.click(screen.getByRole('button', { name: /PRH UK/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent(/No signals reported/i);
  });

  it('snaps the popover closed if the profile drops below the render threshold while open', async () => {
    const { rerender } = render(<PublisherProfileBadge profile={makeProfile()} />);
    await userEvent.click(screen.getByRole('button', { name: /PRH UK/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Audit refetch returns a low-confidence profile — badge should hide.
    rerender(<PublisherProfileBadge profile={makeProfile({ confidence: 'low' })} />);
    expect(screen.queryByRole('button', { name: /PRH UK/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Refetch returns a high-confidence profile again — badge reappears
    // closed, not silently still-open from before.
    rerender(<PublisherProfileBadge profile={makeProfile()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PRH UK/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
