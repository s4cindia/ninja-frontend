import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { BatchSummary } from '@/components/batch/BatchSummary';
import { FileResultsList } from '@/components/batch/FileResultsList';
import { AcrGenerationModal } from '@/components/batch/AcrGenerationModal';
import { useBatch, useGenerateAcr, useExportBatch } from '@/hooks/useBatch';
import { Download, FileText, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BatchResultsPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();

  const { data: batch, isLoading } = useBatch(batchId);
  const generateAcrMutation = useGenerateAcr(batchId ?? '');
  const exportBatchMutation = useExportBatch(batchId ?? '');

  const [showAcrModal, setShowAcrModal] = useState(false);

  const handleGenerateAcr = async (
    mode: 'individual' | 'aggregate',
    options: {
      edition: string;
      batchName: string;
      vendor: string;
      contactEmail: string;
      aggregationStrategy: 'conservative' | 'optimistic';
    }
  ) => {
    try {
      const result = await generateAcrMutation.mutateAsync({
        mode,
        options: {
          edition: options.edition as 'VPAT2.5-508' | 'VPAT2.5-WCAG' | 'VPAT2.5-EU' | 'VPAT2.5-INT',
          batchName: options.batchName,
          vendor: options.vendor,
          contactEmail: options.contactEmail,
          aggregationStrategy: options.aggregationStrategy,
        },
      });
      setShowAcrModal(false);

      if (mode === 'individual') {
        navigate('/acr/workflow');
      } else {
        const workflowId = (result as { workflowId?: string })?.workflowId;
        if (workflowId) {
          navigate(`/acr/workflow/${workflowId}`);
        } else {
          navigate('/acr/workflow');
        }
      }
    } catch {
      // Error handled by hook
    }
  };

  const handleExport = async () => {
    try {
      await exportBatchMutation.mutateAsync();
    } catch {
      // Error handled by hook
    }
  };

  const handleQuickFix = () => {
    toast('Quick-fix feature coming soon', { icon: 'ℹ️' });
  };

  const handleManualRemediation = (fileId: string) => {
    navigate(`/remediation/${fileId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Batch not found</h2>
          <p className="text-gray-600 mb-4">The requested batch could not be found.</p>
          <Button onClick={() => navigate('/batches')}>Back to Batches</Button>
        </div>
      </div>
    );
  }

  const hasRemediatedFiles = batch.filesRemediated > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Breadcrumbs
        items={[
          { label: 'Batches', path: '/batches' },
          { label: batch.name || `Batch ${batchId}`, path: `/batch/${batchId}` },
          { label: 'Results' },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Batch Results</h1>
        <p className="text-gray-600">
          Review results and choose next actions for your batch.
        </p>
      </div>

      <BatchSummary batch={batch} />

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Actions</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setShowAcrModal(true)}
            disabled={!hasRemediatedFiles}
            className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-sky-500 hover:bg-sky-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="h-8 w-8 text-sky-600 mb-3" aria-hidden="true" />
            <h3 className="font-medium text-gray-900 mb-1">Generate ACR</h3>
            <p className="text-sm text-gray-600 text-center">
              Create VPAT reports for your files
            </p>
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={!hasRemediatedFiles || exportBatchMutation.isPending}
            className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-8 w-8 text-green-600 mb-3" aria-hidden="true" />
            <h3 className="font-medium text-gray-900 mb-1">Export Batch</h3>
            <p className="text-sm text-gray-600 text-center">
              Download all remediated files as ZIP
            </p>
          </button>

          <button
            type="button"
            onClick={handleQuickFix}
            disabled={batch.quickFixIssues === 0}
            className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit className="h-8 w-8 text-purple-600 mb-3" aria-hidden="true" />
            <h3 className="font-medium text-gray-900 mb-1">Apply Quick-Fixes</h3>
            <p className="text-sm text-gray-600 text-center">
              {batch.quickFixIssues} issues need quick-fixes
            </p>
          </button>
        </div>
      </div>

      <div className="mt-6">
        <FileResultsList
          files={batch.files}
          onManualRemediation={handleManualRemediation}
        />
      </div>

      {showAcrModal && (
        <AcrGenerationModal
          batch={batch}
          onGenerate={handleGenerateAcr}
          onClose={() => setShowAcrModal(false)}
          isLoading={generateAcrMutation.isPending}
        />
      )}
    </div>
  );
}
