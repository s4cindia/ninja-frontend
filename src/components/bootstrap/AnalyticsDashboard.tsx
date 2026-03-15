import PhaseGatePanel from './PhaseGatePanel';
import MAPAccuracyPanel from './MAPAccuracyPanel';
import AgreementRateChart from './AgreementRateChart';
import CorpusCompositionPanel from './CorpusCompositionPanel';

export default function AnalyticsDashboard() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Calibration Analytics
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Phase 1 Bootstrap — accuracy metrics and corpus statistics
        </p>
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
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <AgreementRateChart />
      </div>

      {/* Panel C — Corpus composition */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <CorpusCompositionPanel />
      </div>
    </div>
  );
}
