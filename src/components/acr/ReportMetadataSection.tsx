import { useState } from 'react';
import { Edit2, ExternalLink, Save, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { useUpdateReportMetadata } from '@/hooks/useAcrReport';
import type { AcrJob } from '@/types/acr-report.types';
import type { PublisherMetadata } from '@/types/acr.types';

interface ReportMetadataSectionProps {
  acrJob: AcrJob;
}

export function ReportMetadataSection({ acrJob }: ReportMetadataSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [executiveSummary, setExecutiveSummary] = useState(
    acrJob.executiveSummary || ''
  );

  const { mutate: updateMetadata, isPending } = useUpdateReportMetadata(acrJob.id);

  const handleSave = () => {
    updateMetadata(
      { executiveSummary },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
        onError: (error) => {
          console.error('Failed to update metadata:', error);
          toast.error('Failed to save changes. Please try again.');
        },
      }
    );
  };

  const handleCancel = () => {
    setExecutiveSummary(acrJob.executiveSummary || '');
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {acrJob.publisherMetadata && (
        <CertificationSection metadata={acrJob.publisherMetadata} />
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Executive Summary</h2>
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            leftIcon={<Edit2 className="h-4 w-4" />}
          >
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <textarea
            value={executiveSummary}
            onChange={(e) => setExecutiveSummary(e.target.value)}
            rows={6}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            placeholder="Enter an executive summary for this report..."
          />

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none">
          {executiveSummary ? (
            <p className="text-gray-700 whitespace-pre-wrap">{executiveSummary}</p>
          ) : (
            <p className="text-gray-400 italic">
              No executive summary provided. Click "Edit" to add one.
            </p>
          )}
        </div>
      )}

      {/* Report Info */}
      <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Document Type:</span>
          <p className="font-medium text-gray-900 capitalize">
            {acrJob.documentType || 'Not specified'}
          </p>
        </div>
        <div>
          <span className="text-gray-600">Edition:</span>
          <p className="font-medium text-gray-900">{acrJob.edition}</p>
        </div>
        <div>
          <span className="text-gray-600">Status:</span>
          <p className="font-medium text-gray-900 capitalize">{acrJob.status.replace('_', ' ')}</p>
        </div>
        <div>
          <span className="text-gray-600">Last Updated:</span>
          <p className="font-medium text-gray-900">
            {new Date(acrJob.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the publisher-specific Certification block at the top of the ACR
 * report when the VPAT was generated against a publisher-pinned edition
 * (today: PRH UK). Hidden entirely for the standard editions.
 */
function CertificationSection({ metadata }: { metadata: PublisherMetadata }) {
  const [showTdmNote, setShowTdmNote] = useState(false);
  return (
    <div className="mb-6 pb-6 border-b border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-5 w-5 text-teal-600" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-gray-900">Certification</h2>
      </div>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-gray-600">Certified by</dt>
          <dd className="font-medium text-gray-900">{metadata.certifiedBy}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Credential</dt>
          <dd className="font-medium text-gray-900">
            <a
              href={metadata.credentialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 hover:underline"
            >
              {metadata.certifierCredential}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </dd>
        </div>
        <div className="md:col-span-2">
          <dt className="text-gray-600">Conforms to</dt>
          <dd className="font-medium text-gray-900">{metadata.conformsTo}</dd>
        </div>
        <div className="md:col-span-2">
          <dt className="text-gray-600">Accessibility statement</dt>
          <dd className="font-medium">
            <a
              href={metadata.accessibilitySummaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 hover:underline break-all"
            >
              {metadata.accessibilitySummaryUrl}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          </dd>
        </div>
      </dl>

      {metadata.tdmReservationNote && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowTdmNote((v) => !v)}
            aria-expanded={showTdmNote}
            className="text-xs font-medium text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline"
          >
            {showTdmNote ? 'Hide' : 'Show'} TDM-reservation note
          </button>
          {showTdmNote && (
            <p className="mt-2 text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded p-3">
              {metadata.tdmReservationNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
