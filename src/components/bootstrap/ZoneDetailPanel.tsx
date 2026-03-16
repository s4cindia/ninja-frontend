import { useState, useEffect } from 'react';
import ZoneBucketBadge from './ZoneBucketBadge';
import ZoneLabelDropdown from './ZoneLabelDropdown';
import type { CalibrationZone } from '../../services/zone-correction.service';

interface ZoneDetailPanelProps {
  zone: CalibrationZone | null;
  onConfirm: (zoneId: string) => void;
  onCorrect: (zoneId: string, newLabel: string) => void;
  onReject: (zoneId: string) => void;
  onEditStructure: (zone: CalibrationZone) => void;
  isConfirming: boolean;
  isCorrecting: boolean;
  isRejecting: boolean;
}

export default function ZoneDetailPanel({
  zone,
  onConfirm,
  onCorrect,
  onReject,
  onEditStructure,
  isConfirming,
  isCorrecting,
  isRejecting,
}: ZoneDetailPanelProps) {
  const [labelValue, setLabelValue] = useState('');

  useEffect(() => {
    setLabelValue('');
  }, [zone?.id]);

  if (!zone) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Select a zone to review
      </div>
    );
  }

  const handleLabelChange = (newLabel: string) => {
    setLabelValue(newLabel);
    onCorrect(zone.id, newLabel);
  };

  return (
    <div className="space-y-4">
      {/* Section 1 — Metadata */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-gray-500">Zone ID</dt>
        <dd className="text-gray-900 font-mono">{zone.id.slice(0, 8)}...</dd>

        <dt className="text-gray-500">Bucket</dt>
        <dd>
          <ZoneBucketBadge bucket={zone.reconciliationBucket} />
        </dd>

        <dt className="text-gray-500">Type</dt>
        <dd className="text-gray-900">{zone.operatorLabel ?? zone.type}</dd>

        <dt className="text-gray-500">Confidence</dt>
        <dd className="text-gray-900">
          {zone.doclingConfidence
            ? `${Math.round(zone.doclingConfidence * 100)}%`
            : '—'}
        </dd>

        <dt className="text-gray-500">Source</dt>
        <dd className="text-gray-900">{zone.source}</dd>

        <dt className="text-gray-500">Page</dt>
        <dd className="text-gray-900">{zone.pageNumber}</dd>
      </dl>

      {/* Section 2 — Tool labels (AMBER only) */}
      {zone.reconciliationBucket === 'AMBER' && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm space-y-1">
          <p className="font-medium text-amber-800">Tools disagree</p>
          <p>
            Docling: <span className="font-mono">{zone.doclingLabel}</span>
          </p>
          <p>
            pdfxt: <span className="font-mono">{zone.pdfxtLabel}</span>
          </p>
          <p className="text-amber-600 text-xs">Select the correct label below</p>
        </div>
      )}

      {/* Section 3 — Label editor */}
      <ZoneLabelDropdown
        value={labelValue || zone.operatorLabel || zone.type}
        onChange={handleLabelChange}
        disabled={zone.operatorVerified || isConfirming || isCorrecting}
      />

      {/* Section 4 — Action buttons */}
      <div className="space-y-2">
        <button
          onClick={() => onConfirm(zone.id)}
          disabled={zone.operatorVerified || zone.isArtefact || isConfirming}
          aria-label={`Confirm zone ${zone.id.slice(0, 8)}`}
          className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            zone.operatorVerified
              ? 'bg-green-600 text-white'
              : 'bg-teal-600 text-white hover:bg-teal-700'
          }`}
        >
          {zone.operatorVerified ? '✓ Confirmed' : 'Confirm'}
        </button>

        {zone.type === 'table' && (
          <button
            onClick={() => onEditStructure(zone)}
            className="w-full border border-teal-600 text-teal-600 rounded-md px-4 py-2 text-sm hover:bg-teal-50 transition-colors"
            aria-label={`Edit table structure for zone ${zone.id.slice(0, 8)}`}
          >
            Edit Table Structure
          </button>
        )}

        <button
          onClick={() => onReject(zone.id)}
          disabled={zone.isArtefact || isRejecting}
          aria-label={`Reject zone ${zone.id.slice(0, 8)} as artefact`}
          className="w-full border border-red-300 text-red-600 rounded-md px-4 py-2 text-sm hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {zone.isArtefact ? 'Rejected' : 'Reject (Artefact)'}
        </button>
      </div>

      {/* Section 5 — Status indicator */}
      {zone.operatorVerified && !zone.isArtefact && (
        <p className="text-green-600 text-xs text-center">✓ Verified</p>
      )}
      {zone.isArtefact && (
        <p className="text-gray-400 text-xs text-center">× Marked as artefact</p>
      )}
    </div>
  );
}
