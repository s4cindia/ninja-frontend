import { useState } from 'react';
import { Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUpdateReportMetadata } from '@/hooks/useAcrReport';
import type { AcrJob } from '@/types/acr-report.types';

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
          alert('Failed to save changes. Please try again.');
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Executive Summary</h2>
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-4 w-4 mr-2" />
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
