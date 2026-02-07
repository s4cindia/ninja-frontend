import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useAcrReport, useApproveReport } from '@/hooks/useAcrReport';
import { EditableCriteriaTable } from '@/components/acr/EditableCriteriaTable';
import { NACriteriaSection } from '@/components/acr/NACriteriaSection';
import { ReportMetadataSection } from '@/components/acr/ReportMetadataSection';

/**
 * ACR Report Review & Edit Page
 * Phase 1: Final review before export
 *
 * Key Features:
 * - Pre-populated from verification (MINIMUM DATA ENTRY)
 * - Show all criteria with verification status/notes
 * - Separate N/A section with rationale
 * - Minimal inline editing
 * - Approve and export
 */

export function AcrReportReviewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [showNACriteria, setShowNACriteria] = useState(true);

  // Fetch report data (pre-populated from verification)
  const { data: reportData, isLoading, error } = useAcrReport(jobId || '', {
    enabled: !!jobId,
  });

  const { mutate: approveReport, isPending: isApproving } = useApproveReport(
    reportData?.acrJob.id || ''
  );

  const handleApproveAndExport = () => {
    if (!reportData?.acrJob.id) return;

    approveReport(undefined, {
      onSuccess: () => {
        // Navigate to export page or trigger download
        alert('Report approved! Ready for export.');
        // TODO: Implement export functionality
      },
      onError: (error) => {
        console.error('Failed to approve report:', error);
        alert('Failed to approve report. Please try again.');
      },
    });
  };

  if (!jobId) {
    return (
      <div className="p-8">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Job ID is required</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">Loading report...</span>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="p-8">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load report. {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { acrJob, summary, criteria, naCriteria } = reportData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Breadcrumbs
            items={[
              { label: 'ACR Workflow', path: '/acr/workflow' },
              { label: 'Review & Edit' },
            ]}
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Review & Edit ACR Report
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {acrJob.documentTitle || `Job ${jobId}`} • {acrJob.edition}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => navigate(`/acr/workflow/${jobId}`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Verification
              </Button>
              <Button onClick={handleApproveAndExport} disabled={isApproving}>
                {isApproving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Export
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Info Banner */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Pre-populated from verification:</strong> All verification data (status,
            method, notes) has been imported. Review and make any final adjustments before export.
          </AlertDescription>
        </Alert>

        {/* Report Metadata Section */}
        <ReportMetadataSection acrJob={acrJob} summary={summary} />

        {/* Conformance Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conformance Summary</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-900">{summary.totalCriteria}</div>
              <div className="text-sm text-blue-700">Total Criteria</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">{summary.passingCriteria}</div>
              <div className="text-sm text-green-700">Passing</div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-900">{summary.failingCriteria}</div>
              <div className="text-sm text-red-700">Failing</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">
                {summary.notApplicableCriteria}
              </div>
              <div className="text-sm text-gray-700">Not Applicable</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Conformance Level (Applicable Criteria Only):
              </span>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-gray-900">
                  {summary.conformancePercentage}%
                </span>
                <span className="text-sm text-gray-600">
                  ({summary.passingCriteria} of {summary.applicableCriteria} pass)
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Note: {summary.notApplicableCriteria} criteria marked N/A are excluded from
              conformance calculations
            </p>
          </div>
        </div>

        {/* Applicable Criteria Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Applicable Criteria ({criteria.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Pre-populated from verification. Edit if needed.
            </p>
          </div>

          <EditableCriteriaTable
            criteria={criteria}
            acrJobId={acrJob.id}
            edition={acrJob.edition}
          />
        </div>

        {/* N/A Criteria Section */}
        {naCriteria.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <button
                onClick={() => setShowNACriteria(!showNACriteria)}
                className="flex items-center justify-between w-full text-left"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Not Applicable Criteria ({naCriteria.length})
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    These criteria have been determined not applicable and are excluded from
                    conformance calculations
                  </p>
                </div>
                <div className="text-gray-400">
                  {showNACriteria ? '▼' : '▶'}
                </div>
              </button>
            </div>

            {showNACriteria && (
              <NACriteriaSection
                naCriteria={naCriteria}
                acrJobId={acrJob.id}
                edition={acrJob.edition}
              />
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={() => navigate(`/acr/workflow/${jobId}`)}>
            Back to Verification
          </Button>
          <Button onClick={handleApproveAndExport} disabled={isApproving} size="lg">
            {isApproving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Approving...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                Approve & Export Report
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
