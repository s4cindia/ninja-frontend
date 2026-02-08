import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, ChevronDown, ChevronRight, Edit2, Save, X, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { useAcrReport, useApproveReport, useUpdateCriterion, useUpdateReportMetadata } from '@/hooks/useAcrReport';
// import { useExportAcr } from '@/hooks/useAcrExport';
import { VerificationSummaryCard } from '@/components/acr/VerificationSummaryCard';
import { VersionTimelineSidebar } from '@/components/acr/VersionTimelineSidebar';
import { VersionCompareModal } from '@/components/acr/VersionCompareModal';
import { ExportDialog } from '@/components/acr/ExportDialog';
import { cn } from '@/utils/cn';

/**
 * ACR Report Review & Edit Page - Enhanced Design
 *
 * Features:
 * - Verification Summary Dashboard (reused from AI Analysis)
 * - Collapsible criteria cards (summary view by default)
 * - AI-generated executive summary (editable)
 * - Inline editing for criteria
 * - N/A section collapsed by default
 */

interface CriterionCardProps {
  criterion: Record<string, unknown>;
  acrJobId: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function CriterionCard({ criterion, acrJobId, isExpanded, onToggleExpand }: CriterionCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedStatus, setEditedStatus] = useState(criterion.verificationStatus || 'pass');
  const [editedMethod, setEditedMethod] = useState(criterion.verificationMethod || 'Manual Review');
  const [editedNotes, setEditedNotes] = useState(criterion.verificationNotes || '');

  const { mutate: updateCriterion, isPending: isUpdating } = useUpdateCriterion(acrJobId);

  const handleSave = () => {
    updateCriterion({
      criterionId: criterion.id,
      updates: {
        verificationStatus: editedStatus,
        verificationMethod: editedMethod,
        verificationNotes: editedNotes,
      }
    }, {
      onSuccess: () => {
        setShowEditModal(false);
      }
    });
  };

  const handleCancel = () => {
    setEditedStatus(criterion.verificationStatus || 'pass');
    setEditedMethod(criterion.verificationMethod || 'Manual Review');
    setEditedNotes(criterion.verificationNotes || '');
    setShowEditModal(false);
  };

  const getStatusColor = (status: string) => {
    if (status === 'verified_pass' || status === 'pass') return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'verified_fail' || status === 'fail') return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusBorderColor = (status: string) => {
    if (status === 'verified_pass' || status === 'pass') return 'border-green-200 bg-green-50/30';
    if (status === 'verified_fail' || status === 'fail') return 'border-red-200 bg-red-50/30';
    return 'border-gray-200 bg-white';
  };

  return (
    <div className={cn(
      'border rounded-lg overflow-hidden transition-shadow hover:shadow-sm',
      getStatusBorderColor(editedStatus)
    )}>
      {/* Card Header - Always Visible */}
      <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => !showEditModal && onToggleExpand()}
        onKeyDown={(e) => {
          if (!showEditModal && (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar')) {
            e.preventDefault();
            onToggleExpand();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-900">{criterion.criterionNumber}</span>
              <span className="text-sm text-gray-600 truncate">{criterion.criterionName || `WCAG ${criterion.criterionNumber}`}</span>
              {criterion.level && (
                <Badge variant="outline" className="text-xs">Level {criterion.level}</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {criterion.confidence != null && (
              <span className="text-xs text-gray-500">
                Confidence: {Math.round(criterion.confidence)}%
              </span>
            )}

            <Badge variant="default" className={cn('text-xs px-2 py-0.5', getStatusColor(editedStatus))}>
              {editedStatus === 'verified_pass' || editedStatus === 'pass' ? 'Pass' :
               editedStatus === 'verified_fail' || editedStatus === 'fail' ? 'Fail' : editedStatus}
            </Badge>

            {!showEditModal && !isExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditModal(true);
                  onToggleExpand();
                }}
                className="text-gray-400 hover:text-primary-600 transition-colors"
                aria-label="Edit criterion"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card Body - Expandable */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200 bg-white">
          <div className="mt-4 space-y-4">
          {showEditModal ? (
            // Edit Mode
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editedStatus}
                    onChange={(e) => setEditedStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="verified_pass">Pass</option>
                    <option value="verified_fail">Fail</option>
                    <option value="needs_review">Needs Review</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Verification Method
                  </label>
                  <select
                    value={editedMethod}
                    onChange={(e) => setEditedMethod(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="Manual Review">Manual Review</option>
                    <option value="NVDA 2024.1">NVDA 2024.1</option>
                    <option value="JAWS 2024">JAWS 2024</option>
                    <option value="VoiceOver">VoiceOver</option>
                    <option value="Keyboard Only">Keyboard Only</option>
                    <option value="Axe DevTools">Axe DevTools</option>
                    <option value="WAVE">WAVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Notes
                </label>
                <textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Add verification notes..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            // View Mode
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Verification Method</div>
                  <div className="text-sm text-gray-900">{criterion.verificationMethod || 'Manual Review'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Verified By</div>
                  <div className="text-sm text-gray-900">{criterion.reviewerName || criterion.reviewedBy || 'Pending Verification'}</div>
                </div>
              </div>

              {criterion.verificationNotes && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Verification Notes</div>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded p-2">
                    {criterion.verificationNotes}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AcrReportReviewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());
  const [showNACriteria, setShowNACriteria] = useState(false); // Collapsed by default
  const [isEditingExecutiveSummary, setIsEditingExecutiveSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');

  // Version history state
  const [showVersionSidebar, setShowVersionSidebar] = useState(true);
  const [currentVersionId, setCurrentVersionId] = useState<string | undefined>();
  const [compareVersions, setCompareVersions] = useState<{ v1: string; v2: string } | null>(null);

  // Export state
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Fetch report data (pre-populated from verification)
  const { data: reportData, isLoading, error } = useAcrReport(jobId || '', {
    enabled: !!jobId,
  });

  const { mutate: approveReport, isPending: isApproving } = useApproveReport(
    reportData?.acrJob.id || ''
  );

  const { mutate: updateReportMetadata, isPending: isSavingMetadata } = useUpdateReportMetadata(
    reportData?.acrJob.id || ''
  );

  const handleToggleExpand = (criterionId: string) => {
    setExpandedCriteria(prev => {
      const next = new Set(prev);
      if (next.has(criterionId)) {
        next.delete(criterionId);
      } else {
        next.add(criterionId);
      }
      return next;
    });
  };

  const handleApproveAndExport = () => {
    if (!reportData?.acrJob.id) return;

    approveReport(undefined, {
      onSuccess: () => {
        // After approval, show export dialog for user to configure export
        setShowExportDialog(true);
      },
      onError: (error) => {
        console.error('Failed to approve report:', error);
        alert('Failed to approve report. Please try again.');
      },
    });
  };

  // Version history handlers
  const handleVersionSelect = (versionId: string) => {
    // For now, just navigate to the same page but with different version context
    // In future, could load specific version data
    setCurrentVersionId(versionId);
    alert(`Viewing version ${versionId}. Full version switching coming soon!`);
  };

  const handleCompare = (v1: string, v2: string) => {
    setCompareVersions({ v1, v2 });
  };

  const handleRestore = async (versionId: string) => {
    try {
      // Get auth token
      let token: string | null = null;
      try {
        const authData = localStorage.getItem('ninja-auth');
        token = authData ? JSON.parse(authData).token : null;
      } catch (error) {
        console.error('Failed to parse auth data from localStorage:', error);
      }

      // Copy the version data to create a new latest version
      const response = await fetch(`/api/v1/acr/report/version/${versionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch version');

      await response.json(); // Parse response but not used yet

      // Re-initialize with this version's data
      alert('Restore functionality coming soon! This will create a new draft based on this version.');
      // TODO: Implement actual restore by posting to initialize endpoint
    } catch (error) {
      console.error('Failed to restore version:', error);
      alert('Failed to restore version. Please try again.');
    }
  };

  if (!jobId) {
    return (
      <div className="p-8">
        <Alert variant="error">
          Job ID is required
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
          Failed to load report. {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      </div>
    );
  }

  const { acrJob, summary, criteria, naCriteria } = reportData;

  // Transform ALL criteria (applicable + N/A) for VerificationSummaryCard to match Verification Queue
  const allCriteria = [...criteria, ...naCriteria];
  const verificationItems = allCriteria.map(c => ({
    id: c.id,
    criterionId: c.criterionNumber,
    criterionName: c.criterionName || `WCAG ${c.criterionNumber}`,
    status: c.verificationStatus === 'verified_pass' ? 'verified_pass' :
            c.verificationStatus === 'verified_fail' ? 'verified_fail' :
            c.isNotApplicable ? 'not_applicable' : 'pending',
    // IMPORTANT: VerificationSummaryCard expects 0-1 scale, backend returns 0-100
    confidenceScore: (c.confidence || 0) / 100, // Convert 0-100 to 0-1 scale
    confidenceLevel: (() => {
      const score = c.confidence || 0;
      if (score >= 90) return 'high';
      if (score >= 70) return 'medium';
      if (score > 0) return 'low';
      return 'manual';
    })(),
    isNotApplicable: c.isNotApplicable || false,
    // Add naSuggestion for N/A criteria so VerificationSummaryCard can count them correctly
    naSuggestion: c.isNotApplicable ? {
      suggestedStatus: 'not_applicable' as const,
      confidence: c.confidence || 95,
      rationale: c.naReason || 'Not applicable to this document',
      criterionId: c.criterionNumber,
      detectionChecks: [],
      edgeCases: []
    } : undefined,
  }));

  const verifiedCount = allCriteria.filter(c =>
    c.verificationStatus === 'verified_pass' || c.verificationStatus === 'verified_fail'
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="max-w-full px-6 py-4">
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
                  {acrJob.documentTitle || `Job ${jobId}`} • {acrJob.editionName || acrJob.edition}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVersionSidebar(!showVersionSidebar)}
                className="flex items-center gap-2"
              >
                {showVersionSidebar ? (
                  <>
                    <PanelLeftClose className="h-4 w-4" />
                    Hide Versions
                  </>
                ) : (
                  <>
                    <PanelLeft className="h-4 w-4" />
                    Show Versions
                  </>
                )}
              </Button>
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

      {/* Main content area with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Version Timeline Sidebar */}
        {showVersionSidebar && jobId && (
          <VersionTimelineSidebar
            jobId={jobId}
            currentVersionId={currentVersionId || acrJob.id}
            onVersionSelect={handleVersionSelect}
            onCompare={handleCompare}
            onRestore={handleRestore}
            className="flex-shrink-0"
          />
        )}

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Info Banner */}
        <Alert>
          <strong>Pre-populated from verification:</strong> All verification data (status,
          method, notes) has been imported. Review and make any final adjustments before export.
        </Alert>

        {/* Verification Summary Dashboard */}
        <VerificationSummaryCard
          items={verificationItems}
          verifiedCount={verifiedCount}
        />

        {/* Executive Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Executive Summary</h2>
            {!isEditingExecutiveSummary && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditedSummary(acrJob.executiveSummary || '');
                  setIsEditingExecutiveSummary(true);
                }}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>

          {isEditingExecutiveSummary ? (
            <div className="space-y-4">
              <textarea
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                rows={6}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="Enter executive summary..."
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    updateReportMetadata(
                      { executiveSummary: editedSummary },
                      {
                        onSuccess: () => {
                          setIsEditingExecutiveSummary(false);
                        },
                        onError: (error) => {
                          console.error('Failed to update executive summary:', error);
                          alert('Failed to save changes. Please try again.');
                        },
                      }
                    );
                  }}
                  disabled={isSavingMetadata}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSavingMetadata ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingExecutiveSummary(false)}
                  disabled={isSavingMetadata}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">
              {acrJob.executiveSummary || 'No executive summary provided. Click "Edit" to add one.'}
            </p>
          )}
        </div>

        {/* Report Metadata */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Document Type</div>
              <div className="text-base font-medium text-gray-900">{acrJob.documentType || 'Not Specified'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Edition</div>
              <div className="text-base font-medium text-gray-900">{acrJob.editionName || acrJob.edition}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="text-base font-medium text-gray-900 capitalize">{acrJob.status.replaceAll('_', ' ')}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Last Updated</div>
              <div className="text-base font-medium text-gray-900">
                {new Date(acrJob.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Conformance Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
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

        {/* Applicable Criteria Cards */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Applicable Criteria ({criteria.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Pre-populated from verification. Click any criterion to expand and edit.
            </p>
          </div>

          <div className="p-4 space-y-2">
            {criteria.map((criterion) => (
              <CriterionCard
                key={criterion.id}
                criterion={criterion}
                acrJobId={acrJob.id}
                isExpanded={expandedCriteria.has(criterion.id)}
                onToggleExpand={() => handleToggleExpand(criterion.id)}
              />
            ))}
          </div>
        </div>

        {/* N/A Criteria Section - Collapsed by Default */}
        {naCriteria.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200">
            <button
              onClick={() => setShowNACriteria(!showNACriteria)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {showNACriteria ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Not Applicable Criteria ({naCriteria.length})
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Excluded from conformance calculations
                  </p>
                </div>
              </div>
            </button>

            {showNACriteria && (
              <div className="border-t border-gray-200 p-4 space-y-2">
                {naCriteria.map((criterion) => (
                  <div key={criterion.id} className="border border-blue-200 rounded-lg p-4 bg-blue-50/30 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="font-semibold text-gray-900">{criterion.criterionNumber}</span>
                        <span className="text-sm text-gray-600 truncate">{criterion.criterionName || `WCAG ${criterion.criterionNumber}`}</span>
                        {criterion.level && (
                          <Badge variant="outline" className="text-xs">Level {criterion.level}</Badge>
                        )}
                        <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5">N/A</Badge>
                      </div>
                    </div>
                    {criterion.naReason && (
                      <div className="mt-3 ml-0 bg-white p-3 rounded text-sm text-gray-700 border border-blue-100">
                        <strong className="text-blue-900">Reason:</strong> {criterion.naReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
      </div>

      {/* Version Comparison Modal */}
      {compareVersions && (
        <VersionCompareModal
          isOpen={!!compareVersions}
          onClose={() => setCompareVersions(null)}
          version1Id={compareVersions.v1}
          version2Id={compareVersions.v2}
        />
      )}

      {/* Export Dialog */}
      {showExportDialog && reportData && (
        <ExportDialog
          acrId={reportData.acrJob.id}
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  );
}

export default AcrReportReviewPage;
