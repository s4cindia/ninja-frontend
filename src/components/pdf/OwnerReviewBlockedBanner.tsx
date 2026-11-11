/**
 * OwnerReviewBlockedBanner
 *
 * Shown on the PDF audit results page only to the owning Executive
 * (auditResult.isOwner === true) when the job is blocked from shipment by
 * a QC NEEDS_CORRECTION verdict (auditResult.reviewBlocked). Lets them
 * notify the team's Team Leader(s) once they've addressed it, via
 * POST .../team-review/request-review -- a notification nudge, not a
 * TeamReview write, so it leaves no audit row of its own (see
 * team.service.ts's requestReview).
 */
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { teamService } from '@/services/team.service';
import { getErrorMessage } from '@/services/api';
import type { TeamReviewRecord } from '@/types/team.types';

interface OwnerReviewBlockedBannerProps {
  jobId: string;
  latestReview: TeamReviewRecord;
}

export function OwnerReviewBlockedBanner({ jobId, latestReview }: OwnerReviewBlockedBannerProps) {
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  const handleRequestReview = async () => {
    setRequesting(true);
    try {
      await teamService.requestReview(jobId);
      toast.success('Re-review requested');
      setRequested(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="mx-6 mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-900">
            Blocked from shipment: QC flagged this job as needing correction
          </p>
          {latestReview.notes && <p className="text-sm text-amber-800 mt-1">{latestReview.notes}</p>}
          <p className="text-xs text-amber-700 mt-1">
            Download/export is blocked until a follow-up review records OK. Once you&apos;ve
            addressed the correction, let your reviewer know.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={requesting || requested}
          onClick={handleRequestReview}
          className="flex-shrink-0"
        >
          {requested ? 'Requested' : requesting ? 'Requesting…' : 'Request re-review'}
        </Button>
      </div>
    </div>
  );
}
