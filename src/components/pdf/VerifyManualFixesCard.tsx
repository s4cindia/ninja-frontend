/**
 * VerifyManualFixesCard
 *
 * Lets an operator who fixed guidance-only items outside Ninja (e.g. in
 * Acrobat Pro) upload the corrected PDF and re-audit against it, without
 * needing to know the separate Remediation Plan page exists. Reuses
 * usePdfReaudit (the same mutation ReauditButton on that page calls) —
 * only the surrounding UI differs, matching this page's always-visible,
 * not-gated-behind-a-checklist-step placement (same philosophy as
 * ManualRemediationTimeLog).
 *
 * A successful upload here is what makes the guided remediation
 * checklist's re-audit steps (and, via ninja-backend PR #500's pruning)
 * the guidance-only count itself progress — but re-running AI Analysis
 * afterward is a separate, still-manual step, so the success state nudges
 * toward that explicitly rather than leaving the operator to guess why
 * the guidance-only count hasn't moved yet.
 */

import { useRef, useState } from 'react';
import { Upload, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePdfReaudit } from '@/hooks/usePdfRemediation';
import type { ReauditComparisonResult } from '@/types/pdf-remediation.types';

interface VerifyManualFixesCardProps {
  jobId: string;
  onReaudited: (result: ReauditComparisonResult) => void;
}

export function VerifyManualFixesCard({ jobId, onReaudited }: VerifyManualFixesCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lastResult, setLastResult] = useState<ReauditComparisonResult | null>(null);
  const { reauditPdf } = usePdfReaudit();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a PDF file');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File size must be less than 100MB');
      return;
    }

    setIsUploading(true);
    // Clear any earlier success note up front — otherwise a failed retry
    // after a prior successful upload would leave the old green
    // resolved/remaining counts on screen alongside the new error toast,
    // misleadingly implying this attempt also succeeded.
    setLastResult(null);
    try {
      const result = await reauditPdf(jobId, file);
      if (result.success) {
        toast.success(`Re-audit complete — ${result.metrics.resolvedCount} issue(s) resolved`);
        setLastResult(result);
        onReaudited(result);
      } else {
        toast.error('Re-audit failed');
      }
    } catch {
      toast.error('Failed to re-audit PDF');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="mx-6 mt-4">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Upload className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-700 flex-1">
            Manually fixed guidance-only items in Acrobat Pro? Upload the corrected PDF to verify.
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Re-auditing…</>
            ) : (
              <><Upload className="h-3.5 w-3.5 mr-1" />Upload Fixed PDF</>
            )}
          </Button>
        </div>

        {lastResult && (
          <div className="mt-3 pl-7 flex items-start gap-2 text-xs text-green-700">
            <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <p>
              <strong>{lastResult.metrics.resolvedCount}</strong> issue(s) resolved,{' '}
              <strong>{lastResult.metrics.remainingCount}</strong> remaining. Re-run AI Analysis (above) to
              update the guidance-only count with this verified fix.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
