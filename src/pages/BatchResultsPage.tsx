import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { BatchSummary } from '@/components/batch/BatchSummary';
import { FileResultsList } from '@/components/batch/FileResultsList';
import { AcrGenerationModal } from '@/components/batch/AcrGenerationModal';
import { useBatch, useGenerateAcr, useExportBatch, useApplyQuickFixes } from '@/hooks/useBatch';
import { Download, FileText, Wrench, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { IndividualAcrGenerationResult, AggregateAcrGenerationResult } from '@/types/batch-acr.types';

export default function BatchResultsPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();

  const { data: batch, isLoading, refetch: refetchBatch } = useBatch(batchId);
  const generateAcrMutation = useGenerateAcr(batchId ?? '');
  const exportBatchMutation = useExportBatch(batchId ?? '');
  const applyQuickFixesMutation = useApplyQuickFixes(batchId ?? '');

  const [showAcrModal, setShowAcrModal] = useState(false);
  const [isApplyingQuickFixes, setIsApplyingQuickFixes] = useState(false);

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

      // Build query params with ACR configuration to pre-fill the workflow
      const queryParams = new URLSearchParams();
      queryParams.set('edition', options.edition);
      queryParams.set('productName', options.batchName);
      queryParams.set('vendor', options.vendor);
      queryParams.set('contactEmail', options.contactEmail);

      console.log('[BatchResultsPage] ACR generation result:', result);

      if (mode === 'individual') {
        // For individual mode, pass the first ACR workflow ID if available
        const individualResult = result as IndividualAcrGenerationResult;
        console.log('[BatchResultsPage] Individual mode - acrWorkflowIds:', individualResult.acrWorkflowIds);
        if (individualResult.acrWorkflowIds && individualResult.acrWorkflowIds.length > 0) {
          queryParams.set('acrId', individualResult.acrWorkflowIds[0]);
          const updatedQueryString = queryParams.toString();
          console.log('[BatchResultsPage] Navigating to:', `/acr/workflow?${updatedQueryString}`);
          navigate(`/acr/workflow?${updatedQueryString}`);
        } else {
          const queryString = queryParams.toString();
          navigate(`/acr/workflow?${queryString}`);
        }
      } else {
        // For aggregate mode, use the single workflow ID
        const aggregateResult = result as AggregateAcrGenerationResult;
        console.log('[BatchResultsPage] Aggregate mode - acrWorkflowId:', aggregateResult.acrWorkflowId);
        if (aggregateResult.acrWorkflowId) {
          const queryString = queryParams.toString();
          navigate(`/acr/workflow/${aggregateResult.acrWorkflowId}?${queryString}`);
        } else {
          const queryString = queryParams.toString();
          navigate(`/acr/workflow?${queryString}`);
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

  const handleApplyQuickFixes = async () => {
    const remainingQuickFixes = batch?.remainingQuickFixes ?? batch?.quickFixIssues ?? 0;
    
    if (!batch || remainingQuickFixes === 0) {
      toast('No quick-fixes available to apply', { icon: 'ℹ️' });
      return;
    }

    const filesWithRemainingQuickFixes = batch.files.filter(
      (f) => (f.remainingQuickFix ?? 0) > 0
    ).length;

    const confirmed = window.confirm(
      `Apply quick-fixes to ${remainingQuickFixes} issues across ${filesWithRemainingQuickFixes} files?\n\n` +
      `This will automatically fix the remaining quick-fix issues and update the remediated files.`
    );

    if (!confirmed) return;

    try {
      setIsApplyingQuickFixes(true);
      const result = await applyQuickFixesMutation.mutateAsync();

      toast.success(
        `Quick-fixes applied! ${result.issuesFixed} issues fixed across ${result.filesProcessed} files.`
      );

      refetchBatch();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to apply quick-fixes: ${message}`);
    } finally {
      setIsApplyingQuickFixes(false);
    }
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
            onClick={handleApplyQuickFixes}
            disabled={(batch.remainingQuickFixes ?? batch.quickFixIssues) === 0 || isApplyingQuickFixes}
            className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApplyingQuickFixes ? (
              <Loader2 className="h-8 w-8 text-purple-600 mb-3 animate-spin" aria-hidden="true" />
            ) : (
              <Wrench className="h-8 w-8 text-purple-600 mb-3" aria-hidden="true" />
            )}
            <h3 className="font-medium text-gray-900 mb-1">Apply Quick-Fixes</h3>
            <p className="text-sm text-gray-600 text-center">
              {isApplyingQuickFixes
                ? 'Applying quick-fixes...'
                : (batch.remainingQuickFixes ?? batch.quickFixIssues) > 0
                  ? `${batch.remainingQuickFixes ?? batch.quickFixIssues} issues need quick-fixes`
                  : (batch.quickFixesApplied ?? 0) > 0
                    ? `All applied (${batch.quickFixesApplied})`
                    : 'No quick-fixes available'}
            </p>
          </button>
        </div>
      </div>

      <div className="mt-6">
        <FileResultsList
          batchId={batchId!}
          files={batch.files}
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
