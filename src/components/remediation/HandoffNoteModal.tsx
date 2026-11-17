/**
 * QC Handoff Note
 *
 * Generates a factual cover note for handing a remediated file to an
 * external QC partner (score, round history, remaining-issue breakdown) —
 * built for the one-clean-final-handoff process agreed with S4 Carlisle,
 * replacing a mid-cycle file + no stated "as of" state as the source of
 * several stale-looking QC re-flags.
 *
 * Gated on an explicit confirmation checkbox, not auto-generated on open:
 * the backend has no system-of-record for "a human completed the manual
 * Full QC structure-tag review pass" (see structure-tag-inventory.service.ts's
 * own documented limits), so this modal is the one place that fact gets
 * asserted, honestly, by a person rather than inferred.
 */
import { useEffect, useState } from 'react';
import { AlertCircle, Check, Copy, Download, FileText, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { pdfRemediationService } from '@/services/pdf-remediation.service';
import { formatHandoffNote } from './handoff-note-text';
import type { HandoffNote } from '@/types/pdf-remediation.types';

const DISPOSITION_LABEL: Record<string, string> = {
  manual: 'needs manual review',
  'auto-resolved': 'ready, pending your approval',
};

interface HandoffNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
}

export function HandoffNoteModal({ isOpen, onClose, jobId }: HandoffNoteModalProps) {
  const [qcConfirmed, setQcConfirmed] = useState(false);
  const [note, setNote] = useState<HandoffNote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fresh every time the modal opens -- a note generated for an earlier
  // open (possibly before more fixes were applied) shouldn't linger as if
  // it were current.
  useEffect(() => {
    if (!isOpen) return;
    setQcConfirmed(false);
    setNote(null);
    setError(null);
    setCopied(false);
  }, [isOpen]);

  const handleGenerate = async () => {
    if (!qcConfirmed || !jobId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await pdfRemediationService.getHandoffNote(jobId);
      setNote(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate the handoff note.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!note) return;
    await navigator.clipboard.writeText(formatHandoffNote(note, qcConfirmed));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!note) return;
    const versionStamp = note.generatedAt.slice(0, 10);
    const blob = new Blob([formatHandoffNote(note, qcConfirmed)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = note.fileName.replace(/\.pdf$/i, `_handoff-note_v${versionStamp}.txt`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>QC Handoff Note</DialogTitle>
          <DialogDescription>
            {note ? 'Ready to send with this file.' : 'A factual cover note for your QC partner — confirm the Full QC pass before generating.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {!note && !isLoading && (
            <div className="space-y-4 py-2">
              <label className="flex items-start gap-3 p-3 rounded-md border border-gray-200 bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={qcConfirmed}
                  onChange={(e) => setQcConfirmed(e.target.checked)}
                />
                <span className="text-sm text-gray-700">
                  I've completed the manual Full QC structure-tag review pass for this file.
                </span>
              </label>
              <p className="text-xs text-gray-400">
                Everything else in the note — score, round history, remaining issues — is pulled live from this job's own records.
              </p>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Generating…
            </div>
          )}

          {note && !isLoading && (
            <div className="space-y-4 py-1">
              <div className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                <FileText className="h-4 w-4 text-gray-400" />
                {note.fileName}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-md bg-gray-50 border border-gray-200">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Score</div>
                  <div className="text-lg font-semibold text-gray-900">{note.score ?? 'n/a'}</div>
                </div>
                <div className="p-3 rounded-md bg-gray-50 border border-gray-200">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Remaining</div>
                  <div className="text-lg font-semibold text-gray-900">{note.totalRemaining}</div>
                </div>
              </div>

              {note.autoRemediation && (
                <p className="text-sm text-gray-600">
                  Auto-remediation ran {note.autoRemediation.roundsCompleted} of {note.autoRemediation.maxRounds} round(s), stopped ({note.autoRemediation.stopReason ?? 'unknown'}).
                </p>
              )}

              <div className="flex items-start gap-2 p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
                <Check className="h-4 w-4 flex-shrink-0 mt-0.5" />
                Manual Full QC structure-tag review pass confirmed.
              </div>

              {note.teamReview && (
                <p className="text-sm text-gray-600">
                  Most recent team review: <span className="font-medium">{note.teamReview.outcome}</span> by {note.teamReview.reviewedBy} on {new Date(note.teamReview.reviewedAt).toLocaleDateString()}.
                </p>
              )}

              {note.totalRemaining > 0 && (
                <div className="space-y-1.5">
                  {note.remainingIssues.map((issue) => (
                    <div key={`${issue.code}:${issue.disposition}`} className="flex items-center justify-between text-xs border border-gray-200 rounded-md px-2.5 py-1.5">
                      <span className="font-mono text-gray-700">{issue.code}</span>
                      <span className="text-gray-400">×{issue.count} — {DISPOSITION_LABEL[issue.disposition] ?? issue.disposition}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-3 border-t">
          {note ? (
            <>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download .txt
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleGenerate}
                disabled={!qcConfirmed || isLoading}
                title={!qcConfirmed ? 'Confirm the Full QC pass first' : undefined}
              >
                {!qcConfirmed && <AlertCircle className="h-3.5 w-3.5 mr-1.5" />}
                Generate Handoff Note
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
