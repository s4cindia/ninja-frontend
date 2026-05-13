import { useRef } from 'react';
import PhaseGatePanel from './PhaseGatePanel';
import MAPAccuracyPanel from './MAPAccuracyPanel';
import AgreementRateChart from './AgreementRateChart';
import CorpusCompositionPanel from './CorpusCompositionPanel';
import ExportToWordButton from './ExportToWordButton';

export default function AnalyticsDashboard() {
  // Refs feed html2canvas for the .docx export. The agreement and corpus
  // panels contain visual bar charts worth embedding as PNGs; the other two
  // panels are tables that the export renders as native Word tables.
  const agreementSectionRef = useRef<HTMLDivElement>(null);
  const corpusSectionRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Calibration Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Phase 1 Bootstrap — accuracy metrics and corpus statistics
          </p>
        </div>
        <ExportToWordButton
          agreementSectionRef={agreementSectionRef}
          corpusSectionRef={corpusSectionRef}
        />
      </div>

      {/* Phase Gate */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <PhaseGatePanel />
      </div>

      {/* Panel A — mAP accuracy */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <MAPAccuracyPanel />
      </div>

      {/* Panel B — Agreement rate */}
      <div
        ref={agreementSectionRef}
        className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
      >
        <AgreementRateChart />
      </div>

      {/* Panel C — Corpus composition */}
      <div
        ref={corpusSectionRef}
        className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
      >
        <CorpusCompositionPanel />
      </div>
    </div>
  );
}
