import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

// Renders an inline info banner at the top of the Lineage and Timesheet tab
// bodies to warn that data prior to 2026-04-13 is backfilled and may be
// incomplete. Dismissible in-session only — state is NOT persisted, because
// the warning should re-appear for operators each time they navigate to the
// page until the backfill gap is far enough in the past to no longer matter.

export function BackfillCaveatBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      data-testid="backfill-caveat-banner"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden="true" />
      <div className="flex-1">
        Data prior to <strong>2026-04-13</strong> is backfilled and may be incomplete.
        Per-run issue logs and per-operator timing are only authoritative for runs completed on or
        after that date.
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss backfill notice"
        className="text-amber-700 hover:text-amber-900"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
