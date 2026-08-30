import { CheckCircle, Loader2, Circle } from 'lucide-react';
import type { JobData } from '@/hooks/useJobPolling';

/**
 * Step checklist + Timing table shown while a PDF accessibility job is
 * queued/processing. Extracted from EPUBUploader.tsx's DocumentUploader,
 * which drove this inline from an upload flow — this version is
 * upload-agnostic so it can also be used for jobs that start server-side
 * (e.g. Comparison Study trials), via `showUploadRow`.
 */

function fmtTime(d: Date | null | undefined): string {
  if (!d) return '—';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function fmtDur(start: Date | null | undefined, end?: Date | null): string {
  if (!start) return '—';
  const ms = (end ?? new Date()).getTime() - start.getTime();
  if (ms < 0) return '—';
  if (ms < 1000) return '< 1s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

const VALIDATOR_LABELS = ['Structure & Tags', 'Alt Text', 'Color Contrast', 'Tables'];

type ValidatorStat = { label: string; issuesFound: number; startedAt: string; completedAt: string };
type AutoTagProgress = { startedAt?: string; completedAt?: string; status?: string; elementCounts?: Record<string, number> };
type TimingRow = { label: string; start: Date | null; end: Date | null; detail?: string; status: 'done' | 'running' | 'pending' };

export interface PdfJobProgressPanelProps {
  jobData: JobData | null;
  /** 0-100, from useJobPolling's jobData?.progress or a local mirror. */
  progress: number;
  /** Omit the "Upload" timing row entirely for jobs that were never uploaded through this UI (e.g. Comparison Study trials, where the job starts server-side). */
  showUploadRow?: boolean;
  uploadStart?: Date | null;
  uploadEnd?: Date | null;
}

export function PdfJobProgressPanel({
  jobData,
  progress,
  showUploadRow = false,
  uploadStart = null,
  uploadEnd = null,
}: PdfJobProgressPanelProps) {
  const totalPages = jobData?.input?.totalPages as number | undefined;
  const validatorProgress = jobData?.input?.validatorProgress as ValidatorStat[] | undefined;

  // ─── Step checklist ────────────────────────────────────────────────────────
  let stepChecklist: React.ReactNode = null;
  if (totalPages && totalPages > 0) {
    const currentPage = Math.min(Math.round(((progress - 20) / 68) * totalPages), totalPages);
    const extractionDone = currentPage >= totalPages;
    const doneNames = new Set((validatorProgress ?? []).map(v => v.label));

    stepChecklist = (
      <div className="space-y-2">
        {!extractionDone ? (
          <p className="text-xs font-mono text-primary-700">
            Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}
          </p>
        ) : (
          <div className="text-left mx-auto max-w-xs space-y-1.5">
            {VALIDATOR_LABELS.map((label) => {
              const done = doneNames.has(label);
              const stat = validatorProgress?.find(v => v.label === label);
              const isNext = !done && (validatorProgress ?? []).length === VALIDATOR_LABELS.indexOf(label);
              return (
                <div key={label} className="flex items-center gap-2 text-sm">
                  {done ? (
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  ) : isNext ? (
                    <Loader2 className="h-4 w-4 text-primary-500 animate-spin shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-300 shrink-0" />
                  )}
                  <span className={done ? 'text-gray-800 font-medium' : isNext ? 'text-primary-700 font-medium' : 'text-gray-400'}>
                    {label}
                    {done && stat && (
                      <span className={`ml-1 font-normal text-xs ${stat.issuesFound > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        — {stat.issuesFound} {stat.issuesFound === 1 ? 'issue' : 'issues'}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Timing table ────────────────────────────────────────────────────────
  const vp = (jobData?.input?.validatorProgress ?? []) as ValidatorStat[];
  const auditStart = jobData?.startedAt ? new Date(jobData.startedAt) : null;
  const auditEnd = jobData?.completedAt ? new Date(jobData.completedAt) : null;
  const autoTagProg = jobData?.input?.autoTagProgress as AutoTagProgress | undefined;
  const hasAutoTag = !!autoTagProg;
  const autoTagEnd = autoTagProg?.completedAt ? new Date(autoTagProg.completedAt) : null;
  // Seam-C is the default tagger; Adobe is only the fallback — this used to
  // say "Adobe AutoTag" unconditionally regardless of which one actually ran.
  const taggerSource = jobData?.output?.taggerSource as string | null | undefined;
  // A forceAutoTag (Comparison Study) job whose PDF already has real
  // structure never actually tags anything — Seam C's own struct-tree
  // builder refuses to touch a document that already has a real
  // /StructTreeRoot, so the worker just audits the existing structure and
  // never sets taggerSource at all (see accessibility.processor.ts's
  // alreadyTagged/!retagSucceeded branch). Defaulting the label to "Adobe
  // AutoTag" in that case falsely claims Adobe ran this pass, when nothing
  // did — mirror PdfStatsCards' generic "Document already tagged" handling
  // of the same skip instead of guessing a tagger.
  const autoTagSkipped = autoTagProg?.status === 'skipped';
  const autoTagLabel = taggerSource === 'seam-c'
    ? 'Seam-C (YOLO)'
    : taggerSource === 'adobe'
      ? 'Adobe AutoTag'
      : autoTagSkipped
        ? 'AutoTag'
        : 'Adobe AutoTag'; // still running — genuinely not yet known
  const extractionDone = (totalPages ? progress >= 88 : false) || vp.length > 0 || auditEnd !== null;
  const extractionEnd = vp.length > 0 ? new Date(vp[0].startedAt) : (extractionDone ? auditEnd : null);
  const extractionStart = hasAutoTag ? autoTagEnd : auditStart;
  // No upload happened for server-started jobs (e.g. Comparison Study trials)
  // — use the job's own createdAt as the queue-start reference instead.
  const queueStart = showUploadRow ? uploadEnd : (jobData?.createdAt ? new Date(jobData.createdAt) : null);

  const rows: TimingRow[] = [
    ...(showUploadRow ? [{
      label: 'Upload',
      start: uploadStart,
      end: uploadEnd,
      status: uploadEnd ? ('done' as const) : ('running' as const),
    }] : []),
    {
      label: 'Queue',
      start: queueStart,
      end: auditStart,
      status: auditStart ? 'done' as const : queueStart ? 'running' as const : 'pending' as const,
    },
    ...(hasAutoTag ? [{
      label: autoTagLabel,
      start: autoTagProg?.startedAt ? new Date(autoTagProg.startedAt) : auditStart,
      end: autoTagEnd,
      // 'skipped' is a concluded outcome (the completeness check that
      // decides this finished and wrote completedAt) just like complete/
      // failed — omitting it here left the row showing "running…" forever
      // for an already-tagged-so-nothing-to-do job.
      status: (autoTagProg?.status === 'complete' || autoTagProg?.status === 'failed' || autoTagProg?.status === 'skipped') ? 'done' as const : auditStart ? 'running' as const : 'pending' as const,
      detail: autoTagProg?.status === 'complete' && autoTagProg.elementCounts
        ? `${autoTagProg.elementCounts.figures ?? 0}F · ${autoTagProg.elementCounts.tables ?? 0}T · ${autoTagProg.elementCounts.headings ?? 0}H`
        : autoTagProg?.status === 'failed' ? 'failed'
        : autoTagSkipped ? 'already tagged — used existing structure'
        : undefined,
    }] : []),
    { label: 'Extraction', start: extractionStart, end: extractionEnd, status: extractionDone ? 'done' as const : (hasAutoTag ? autoTagEnd : auditStart) ? 'running' as const : 'pending' as const },
    ...VALIDATOR_LABELS.map((lbl, idx) => {
      const done = vp.find(v => v.label === lbl);
      if (done) {
        return {
          label: lbl,
          start: new Date(done.startedAt),
          end: new Date(done.completedAt),
          status: 'done' as const,
          detail: `${done.issuesFound} issue${done.issuesFound !== 1 ? 's' : ''}`,
        };
      }
      const isRunning = extractionDone && vp.length === idx;
      const prevEnd = vp.length > 0 ? new Date(vp[vp.length - 1].completedAt) : (isRunning ? auditStart : null);
      return { label: lbl, start: isRunning ? prevEnd : null, end: null, status: isRunning ? 'running' as const : 'pending' as const };
    }),
  ];

  return (
    <>
      {stepChecklist}
      <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden text-left">
        <div className="bg-gray-100 px-4 py-2 font-semibold text-gray-500 uppercase tracking-wider text-xs border-b border-gray-200">
          Timing
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-500">
              <th className="px-4 py-2 text-left font-semibold">Phase</th>
              <th className="px-4 py-2 text-left font-semibold">Started</th>
              <th className="px-4 py-2 text-left font-semibold">Ended</th>
              <th className="px-4 py-2 text-left font-semibold">Duration</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.label} className={`border-b border-gray-100 last:border-0 ${row.status === 'running' ? 'bg-primary-50' : ''}`}>
                <td className="px-4 py-2 font-medium text-gray-800">
                  <div className="flex items-center gap-2">
                    {row.status === 'done' && <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                    {row.status === 'running' && <span className="inline-block w-2 h-2 rounded-full bg-primary-500 animate-pulse shrink-0" />}
                    {row.status === 'pending' && <span className="inline-block w-2 h-2 rounded-full bg-gray-300 shrink-0" />}
                    <span className={row.status === 'pending' ? 'text-gray-400' : 'text-gray-800'}>
                      {row.label}
                    </span>
                    {row.detail && <span className="font-normal text-gray-400 text-xs">· {row.detail}</span>}
                  </div>
                </td>
                <td className="px-4 py-2 font-mono text-gray-600 text-xs">{fmtTime(row.start)}</td>
                <td className="px-4 py-2 font-mono text-xs">
                  {row.status === 'running'
                    ? <span className="text-primary-600 font-medium">running…</span>
                    : row.status === 'pending'
                      ? <span className="text-gray-300">—</span>
                      : <span className="text-gray-600">{fmtTime(row.end)}</span>}
                </td>
                <td className="px-4 py-2 font-mono text-xs">
                  {row.status === 'pending'
                    ? <span className="text-gray-300">—</span>
                    : row.status === 'running'
                      ? <span className="text-primary-600 font-semibold">{fmtDur(row.start)}</span>
                      : <span className="text-gray-700 font-medium">{fmtDur(row.start, row.end)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
