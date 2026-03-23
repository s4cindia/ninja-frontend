import { useState } from 'react';
import ZoneBucketBadge from './ZoneBucketBadge';
import type { CalibrationZone } from '@/services/zone-correction.service';

const ZONE_TYPE_OPTIONS = [
  { value: 'paragraph', label: 'Body Text' },
  { value: 'section-header', label: 'Heading' },
  { value: 'table', label: 'Table' },
  { value: 'figure', label: 'Figure / Image' },
  { value: 'caption', label: 'Caption' },
  { value: 'footnote', label: 'Footnote' },
  { value: 'header', label: 'Page Header' },
  { value: 'footer', label: 'Page Footer' },
];

interface ZoneComparisonDetailBarProps {
  zone: CalibrationZone;
  onConfirm: (zoneId: string) => void;
  onReject: (zoneId: string) => void;
  onReclassify: (zoneId: string, newLabel: string) => void;
  onDismiss: () => void;
  confirmPending?: boolean;
  rejectPending?: boolean;
  correctPending?: boolean;
  zoneNumber?: number;
}

export default function ZoneComparisonDetailBar({
  zone,
  onConfirm,
  onReject,
  onReclassify,
  onDismiss,
  confirmPending,
  rejectPending,
  correctPending,
  zoneNumber,
}: ZoneComparisonDetailBarProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(
    zone.operatorLabel ?? zone.doclingLabel ?? zone.pdfxtLabel ?? zone.type,
  );

  const handleLabelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLabel = e.target.value;
    setSelectedLabel(newLabel);
    onReclassify(zone.id, newLabel);
  };

  return (
    <div className="border-t-2 border-gray-300 bg-white shadow-lg">
      <div className="flex items-start gap-4 px-4 py-3 overflow-x-auto">
        {/* Zone metadata */}
        <div className="flex flex-col gap-1 shrink-0">
          {zoneNumber != null && (
            <span className="text-lg font-bold text-gray-700 mr-2">#{zoneNumber}</span>
          )}
          <ZoneBucketBadge bucket={zone.reconciliationBucket} />
          <span className="text-xs text-gray-500">Page {zone.pageNumber}</span>
          {zone.operatorVerified && (
            <span className="text-xs text-teal-600 font-medium">Verified</span>
          )}
          {zone.isArtefact && (
            <span className="text-xs text-red-500 font-medium">Rejected</span>
          )}
        </div>

        {/* Docling column */}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Docling</h4>
          <p className="text-sm font-medium text-gray-800">
            {zone.doclingLabel ?? <span className="text-gray-400 italic">no detection</span>}
          </p>
          {zone.doclingConfidence != null && (
            <p className="text-xs text-gray-500">
              Confidence: {Math.round(zone.doclingConfidence * 100)}%
            </p>
          )}
        </div>

        {/* pdfxt column */}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">pdfxt</h4>
          <p className="text-sm font-medium text-gray-800">
            {zone.pdfxtLabel ?? <span className="text-gray-400 italic">no detection</span>}
          </p>
        </div>

        {/* Decision column */}
        <div className="flex flex-col gap-2 shrink-0 w-[180px]">
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Decision</h4>
          <select
            value={selectedLabel}
            onChange={handleLabelChange}
            disabled={correctPending}
            className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
          >
            {ZONE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => onConfirm(zone.id)}
              disabled={confirmPending || zone.operatorVerified}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmPending ? 'Confirming...' : 'Confirm'}
            </button>
            <button
              onClick={() => onReject(zone.id)}
              disabled={rejectPending || zone.isArtefact}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rejectPending ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 mt-1"
          title="Close detail bar (Esc)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Technical details — collapsible */}
      <div className="px-5 pb-2">
        <button
          onClick={() => setShowTechnical(!showTechnical)}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          <span className={`transform transition-transform ${showTechnical ? 'rotate-90' : ''}`}>
            &#9654;
          </span>
          Technical details
        </button>
        {showTechnical && (
          <div className="mt-1 grid grid-cols-3 gap-4 text-xs text-gray-500">
            <div>
              <span className="font-medium">IoU:</span>{' '}
              {zone.confidence != null ? zone.confidence.toFixed(2) : 'N/A'}
            </div>
            <div>
              <span className="font-medium">Docling bbox:</span>{' '}
              {zone.bounds
                ? `${zone.bounds.x.toFixed(0)}, ${zone.bounds.y.toFixed(0)}, ${zone.bounds.w.toFixed(0)}, ${zone.bounds.h.toFixed(0)}`
                : 'N/A'}
            </div>
            <div>
              <span className="font-medium">Zone ID:</span> {zone.id.slice(0, 12)}...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
