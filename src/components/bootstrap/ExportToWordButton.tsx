import { useState, type RefObject } from 'react';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { usePhaseGate, useMAPHistory, useCorpusStatsMetrics } from '../../hooks/useMetrics';
import { useCalibrationRuns } from '../../hooks/useCalibration';
import { pickBestInWindow } from './mapAccuracySelection';
import {
  buildCalibrationReportBlob,
  defaultReportFilename,
  type AgreementRow,
} from '../../services/calibrationReportExport';

interface Props {
  /** Wrapper div around the Tool Agreement Rate panel; captured as a PNG. */
  agreementSectionRef: RefObject<HTMLElement | null>;
  /** Wrapper div around the Corpus Composition panel; captured as a PNG. */
  corpusSectionRef: RefObject<HTMLElement | null>;
}

/**
 * Snapshot a DOM element to a PNG ArrayBuffer for embedding in the .docx.
 * Returns undefined on failure so the export can fall back to text tables.
 */
async function captureSection(
  ref: RefObject<HTMLElement | null>,
): Promise<ArrayBuffer | undefined> {
  if (!ref.current) return undefined;
  try {
    const canvas = await html2canvas(ref.current, {
      backgroundColor: '#ffffff',
      scale: 2, // 2x for crisper Word embeds at standard DPI
      logging: false,
      useCORS: true,
    });
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    if (!blob) return undefined;
    return await blob.arrayBuffer();
  } catch (err) {
    // Don't fail the whole export on one chart; embedded fallback is text-only.
    console.warn('[ExportToWord] Could not capture chart section:', err);
    return undefined;
  }
}

function rowsFromRuns(
  runs: Array<{ id: string; runDate: string; greenCount?: number | null; amberCount?: number | null; redCount?: number | null }>,
): AgreementRow[] {
  return runs
    .filter((r) => r.greenCount != null && r.redCount != null && r.amberCount != null)
    .map((r) => {
      const total = (r.greenCount ?? 0) + (r.amberCount ?? 0) + (r.redCount ?? 0);
      return {
        date: new Date(r.runDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        agreementRate: total > 0 ? Math.round(((r.greenCount ?? 0) / total) * 100) : 0,
        runId: r.id,
      };
    });
}

export default function ExportToWordButton({ agreementSectionRef, corpusSectionRef }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: phaseGate } = usePhaseGate();
  const { data: mAPHistory } = useMAPHistory();
  const { data: corpusStats } = useCorpusStatsMetrics();
  const { data: runsData } = useCalibrationRuns({ limit: 20 });

  const ready = !!(phaseGate && mAPHistory && corpusStats && runsData);

  async function handleExport() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const agreementChartPng = await captureSection(agreementSectionRef);
      const publisherChartPng = await captureSection(corpusSectionRef);

      const bestRun = pickBestInWindow(mAPHistory);
      const agreementRows = rowsFromRuns(runsData!.runs);

      const blob = await buildCalibrationReportBlob({
        phaseGate: phaseGate!,
        bestRun,
        mAPHistory: mAPHistory!,
        agreementRows,
        corpusStats: corpusStats!,
        agreementChartPng,
        publisherChartPng,
      });

      saveAs(blob, defaultReportFilename());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[ExportToWord] Failed:', err);
      setError(`Export failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={!ready || busy}
        aria-label="Export Calibration Analytics to Word document"
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-teal-600 text-teal-700 rounded-md hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {busy ? (
          <>
            <span
              className="h-3.5 w-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            Building report…
          </>
        ) : (
          <>
            <span aria-hidden="true">⬇</span>
            Export to Word
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
