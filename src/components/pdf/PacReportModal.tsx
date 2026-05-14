/**
 * PAC Report Modal
 *
 * Displays a Matterhorn Protocol 1.1 compliance report as a 31-checkpoint
 * colour-coded grid. Each checkpoint shows its overall status and can be
 * expanded to reveal individual condition results.
 *
 * Matterhorn Coverage Plan — Step 5 (frontend)
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { getPacReport } from '../../services/pac-report.service';
import type {
  PacReport,
  PacCheckpointResult,
  PacCheckpointStatus,
  PacConditionStatus,
} from '../../services/pac-report.service';

// ─── Status helpers ───────────────────────────────────────────────────────────

const CHECKPOINT_COLORS: Record<PacCheckpointStatus, string> = {
  PASS: 'bg-green-50 border-green-200 text-green-800',
  FAIL: 'bg-red-50 border-red-200 text-red-800',
  UNTESTED: 'bg-amber-50 border-amber-200 text-amber-800',
  HUMAN_REQUIRED: 'bg-gray-50 border-gray-200 text-gray-600',
};

const CONDITION_COLORS: Record<PacConditionStatus, string> = {
  PASS: 'text-green-700',
  FAIL: 'text-red-700 font-medium',
  UNTESTED: 'text-amber-700',
  HUMAN_REQUIRED: 'text-gray-500',
  NOT_APPLICABLE: 'text-gray-400',
};

const CHECKPOINT_ICON: Record<PacCheckpointStatus, React.ReactNode> = {
  PASS: <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />,
  FAIL: <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />,
  UNTESTED: <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />,
  HUMAN_REQUIRED: <HelpCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />,
};

function statusLabel(status: PacCheckpointStatus | PacConditionStatus): string {
  switch (status) {
    case 'PASS': return 'PASS';
    case 'FAIL': return 'FAIL';
    case 'UNTESTED': return 'UNTESTED';
    case 'HUMAN_REQUIRED': return 'HUMAN';
    case 'NOT_APPLICABLE': return 'N/A';
    default: return status;
  }
}

// ─── Checkpoint row ───────────────────────────────────────────────────────────

function CheckpointRow({ cp }: { cp: PacCheckpointResult }) {
  const [expanded, setExpanded] = useState(cp.status === 'FAIL');

  return (
    <div className={`border rounded-md overflow-hidden ${CHECKPOINT_COLORS[cp.status]}`}>
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:opacity-80 transition-opacity"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded
          ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
          : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
        }
        {CHECKPOINT_ICON[cp.status]}
        <span className="text-xs font-semibold w-6 flex-shrink-0">CP{cp.id}</span>
        <span className="text-xs flex-1 truncate">{cp.title}</span>
        <span className="text-xs font-mono flex-shrink-0 opacity-70">{statusLabel(cp.status)}</span>
      </button>

      {expanded && (
        <div className="border-t border-current border-opacity-10 px-3 py-2 space-y-1 bg-white bg-opacity-60">
          {cp.conditions.map((cond) => (
            <div key={cond.id} className="flex items-start gap-2 text-xs">
              <span className={`font-mono flex-shrink-0 w-14 ${CONDITION_COLORS[cond.status]}`}>
                {cond.id}
              </span>
              <span className={`flex-1 ${CONDITION_COLORS[cond.status]}`}>
                {cond.description}
              </span>
              <span className={`font-mono flex-shrink-0 ${CONDITION_COLORS[cond.status]}`}>
                {statusLabel(cond.status)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar({ report }: { report: PacReport }) {
  const { summary } = report;
  return (
    <div className="grid grid-cols-5 gap-2 text-center text-xs mb-4">
      <div className="bg-green-50 border border-green-200 rounded p-2">
        <div className="text-lg font-bold text-green-700">{summary.pass}</div>
        <div className="text-green-600">PASS</div>
      </div>
      <div className="bg-red-50 border border-red-200 rounded p-2">
        <div className="text-lg font-bold text-red-700">{summary.fail}</div>
        <div className="text-red-600">FAIL</div>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded p-2">
        <div className="text-lg font-bold text-amber-700">{summary.untested}</div>
        <div className="text-amber-600">UNTESTED</div>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded p-2">
        <div className="text-lg font-bold text-gray-600">{summary.humanRequired}</div>
        <div className="text-gray-500">HUMAN</div>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded p-2">
        <div className="text-lg font-bold text-gray-400">{summary.notApplicable}</div>
        <div className="text-gray-400">N/A</div>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface PacReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
}

export function PacReportModal({ isOpen, onClose, jobId }: PacReportModalProps) {
  const [report, setReport] = useState<PacReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !jobId) return;
    setIsLoading(true);
    setError(null);
    getPacReport(jobId)
      .then(setReport)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load PAC report';
        setError(msg);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, jobId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Matterhorn Protocol 1.1 Compliance Report</DialogTitle>
          <DialogDescription>
            {report
              ? `${report.fileName} · ${report.summary.total} conditions across 31 checkpoints`
              : 'PDF/UA-1 accessibility compliance assessment'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Generating report…
            </div>
          )}

          {error && (
            <div className="py-8 text-center text-red-600 text-sm">{error}</div>
          )}

          {report && !isLoading && (
            <>
              <SummaryBar report={report} />

              <div className="space-y-1.5">
                {report.checkpoints.map((cp) => (
                  <CheckpointRow key={cp.id} cp={cp} />
                ))}
              </div>

              <p className="mt-4 text-xs text-gray-400 italic text-center">
                UNTESTED conditions are not confirmed passing. This report does not constitute
                full PDF/UA-1 certification.
              </p>
            </>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
