/**
 * Surfaces the backend-detected publisher profile (today: PRH UK + imprint)
 * on the audit-results page so reviewers see at a glance that publisher-
 * specific validators ran. Click-toggles a popover showing the detection
 * signals so reviewers can answer "why does this EPUB show as Vintage?".
 *
 * Renders nothing when:
 *   - the field is absent (older audit results), or
 *   - publisher is null (no profile detected), or
 *   - confidence is 'low' (the signals are too weak to call out).
 */

import { useEffect, useRef, useState } from 'react';
import { Building2 } from 'lucide-react';
import { Badge } from '../ui/Badge';

export type PublisherProfileImprint =
  | 'penguin'
  | 'puffin'
  | 'vintage'
  | 'pelican'
  | 'ladybird'
  | 'merky'
  | 'cornerstone-saga'
  | 'unknown';

export interface PublisherProfileSignal {
  id: string;
  description: string;
  strength: 'strong' | 'moderate' | 'weak';
}

export interface PublisherProfile {
  publisher: 'PRH-UK' | null;
  imprint: PublisherProfileImprint | null;
  confidence: 'high' | 'medium' | 'low';
  signals: PublisherProfileSignal[];
}

interface PublisherProfileBadgeProps {
  profile: PublisherProfile | null | undefined;
}

const STRENGTH_STYLES: Record<PublisherProfileSignal['strength'], string> = {
  strong: 'bg-green-700 text-green-50',
  moderate: 'bg-amber-600 text-amber-50',
  weak: 'bg-gray-600 text-gray-100',
};

function formatImprint(imprint: PublisherProfileImprint | null): string {
  if (!imprint || imprint === 'unknown') return '';
  // 'cornerstone-saga' -> 'Cornerstone Saga', 'penguin' -> 'Penguin'
  return imprint
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function PublisherProfileBadge({ profile }: PublisherProfileBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Escape so the popover behaves like a menu.
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  if (!profile || profile.publisher !== 'PRH-UK' || profile.confidence === 'low') {
    return null;
  }

  const imprintLabel = formatImprint(profile.imprint);
  const label = imprintLabel ? `PRH UK · ${imprintLabel}` : 'PRH UK';

  return (
    <div ref={containerRef} className="relative inline-block">
      <Badge
        as="button"
        variant="info"
        size="md"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="gap-1.5"
      >
        <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
        {label}
      </Badge>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Publisher detection signals"
          className="absolute z-50 left-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4"
        >
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Detection signals</h3>
            <span className="text-xs text-gray-500">
              Confidence: <span className="font-medium capitalize">{profile.confidence}</span>
            </span>
          </div>
          {profile.signals.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No signals reported.</p>
          ) : (
            <ul className="space-y-2">
              {profile.signals.map((signal) => (
                <li key={signal.id} className="flex items-start gap-2 text-xs">
                  <span
                    className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded uppercase tracking-wide font-semibold ${
                      STRENGTH_STYLES[signal.strength]
                    }`}
                  >
                    {signal.strength}
                  </span>
                  <span className="text-gray-700 leading-snug">{signal.description}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
