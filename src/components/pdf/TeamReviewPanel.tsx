/**
 * TeamReviewPanel
 *
 * Shown on the PDF audit results page only when the viewer doesn't own the
 * job (auditResult.isOwner === false) -- a Team Leader's non-blocking
 * spot-check of a teammate's job, never a gate on the owning Executive's
 * own flow. The submit form is rendered for anyone who reaches this page
 * without owning the job (TEAM_LEADER, or an ADMIN), since there is no
 * client-side way to distinguish a TEAM_LEADER from a VIEWER teammate --
 * both read-access tiers land here with isOwner: false. A VIEWER's submit
 * attempt is left to fail server-side with a clear error toast (the
 * backend's own message: "Only a Team Leader may write a review for this
 * job") rather than guessed around on the frontend.
 */

import { useState } from 'react';
import { ClipboardCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { teamService } from '@/services/team.service';
import { getErrorMessage } from '@/services/api';
import type { TeamReviewOutcome, TeamReviewRecord } from '@/types/team.types';

interface TeamReviewPanelProps {
  jobId: string;
  teamReviews: TeamReviewRecord[];
  /** Fires after a successful submit so the caller can refetch the audit
   * result and pick up the new entry in its joined teamReviews history. */
  onSubmitted: () => void;
}

const OUTCOME_BADGE: Record<TeamReviewOutcome, string> = {
  OK: 'bg-green-100 text-green-700',
  NEEDS_CORRECTION: 'bg-amber-100 text-amber-700',
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function reviewerName(reviewer: TeamReviewRecord['reviewer']): string {
  const name = `${reviewer.firstName} ${reviewer.lastName}`.trim();
  return name.length > 0 ? name : reviewer.email;
}

export function TeamReviewPanel({ jobId, teamReviews, onSubmitted }: TeamReviewPanelProps) {
  const [outcome, setOutcome] = useState<TeamReviewOutcome>('OK');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await teamService.submitTeamReview(jobId, { outcome, notes: notes.trim() || undefined });
      toast.success('Review submitted');
      setNotes('');
      setOutcome('OK');
      onSubmitted();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mx-6 mt-4">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardCheck className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Team Review</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          A spot-check review from a teammate — informational, not a gate on this job.
        </p>

        {teamReviews.length > 0 && (
          <ul className="mb-4 space-y-2">
            {teamReviews.map((review) => (
              <li key={review.id} className="border border-gray-100 rounded-md p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-900">{reviewerName(review.reviewer)}</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOME_BADGE[review.outcome]}`}
                  >
                    {review.outcome === 'OK' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {review.outcome === 'OK' ? 'OK' : 'Needs Correction'}
                  </span>
                </div>
                {review.notes && <p className="text-sm text-gray-600 mt-1">{review.notes}</p>}
                <p className="text-xs text-gray-400 mt-1">{formatTimestamp(review.reviewedAt)}</p>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleSubmit} className="flex flex-wrap items-start gap-2">
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as TeamReviewOutcome)}
            aria-label="Review outcome"
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="OK">OK</option>
            <option value="NEEDS_CORRECTION">Needs Correction</option>
          </select>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={1}
            className="flex-1 min-w-[200px] rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Review'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
