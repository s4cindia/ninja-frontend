/**
 * Citation Intelligence Tool - Analysis Results Page
 * THIS IS THE HOOK - "We found 27 citation issues in 2.3 seconds"
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, Clock, FileText, Target, Download, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useJobProgress, useAnalysisResults } from '@/hooks/useCitationIntel';
import { ExportOptionsModal } from '@/components/citation/ExportOptionsModal';
import { citationIntelService } from '@/services/citation-intel.service';
import toast from 'react-hot-toast';

export default function CitationAnalysisPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [downloading, setDownloading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: progress, isLoading: progressLoading, error: progressError } = useJobProgress(jobId);
  const { data: analysis, error: analysisError } = useAnalysisResults(jobId);

  // Debug logging
  console.log('[CitationAnalysisPage] JobId:', jobId);
  console.log('[CitationAnalysisPage] Progress data:', progress);
  console.log('[CitationAnalysisPage] Analysis data:', analysis);
  console.log('[CitationAnalysisPage] Progress loading:', progressLoading);

  const isProcessing = progress?.status === 'PROCESSING' || progress?.status === 'QUEUED';
  const isComplete = progress?.status === 'COMPLETED';
  const isFailed = progress?.status === 'FAILED';

  console.log('[CitationAnalysisPage] isProcessing:', isProcessing);
  console.log('[CitationAnalysisPage] isComplete:', isComplete);
  console.log('[CitationAnalysisPage] isFailed:', isFailed);

  // Calculate estimated time based on references count
  const getEstimatedTime = () => {
    const refCount = progress?.totalReferences || 0;
    if (refCount === 0) return '10-15';
    if (refCount < 10) return '3-5';
    if (refCount < 20) return '5-8';
    if (refCount < 50) return '8-12';
    return '12-20';
  };

  // Invalidate analysis query when job completes to fetch fresh data
  useEffect(() => {
    if (isComplete && jobId) {
      console.log('[CitationAnalysisPage] Job completed, invalidating analysis query');
      queryClient.invalidateQueries({ queryKey: ['citation-analysis', jobId] });
    }
  }, [isComplete, jobId, queryClient]);

  const handleExport = async (options: { includeOriginal: boolean; highlightChanges: boolean }) => {
    if (!jobId) return;
    try {
      setIsExporting(true);
      await citationIntelService.exportWithCorrections(jobId, options);
      toast.success('✓ Manuscript exported successfully');
      setShowExportModal(false);
    } catch (error: any) {
      toast.error('Failed to export manuscript');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSummary = async () => {
    if (!jobId) return;
    try {
      setDownloading(true);
      await citationIntelService.downloadChangeSummary(jobId);
      toast.success('✓ Change summary downloaded');
    } catch (error: any) {
      toast.error('Failed to download summary');
    } finally {
      setDownloading(false);
    }
  };

  // Show processing animation
  if (isProcessing || progressLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-12 max-w-2xl w-full">
          <div className="text-center">
            <Spinner size="lg" className="mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Analyzing manuscript...</h2>

            <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress?.progress || 0}%` }}
              />
            </div>

            <div className="space-y-2 text-left">
              <div className="flex items-center text-sm text-gray-700">
                {progress?.totalReferences && progress.totalReferences > 0 ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Extracted {progress.totalReferences} references
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 text-blue-500 mr-2 animate-spin" />
                    Extracting references...
                  </>
                )}
              </div>
              <div className="flex items-center text-sm text-gray-700">
                {progress?.totalCitations && progress.totalCitations > 0 ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Found {progress.totalCitations} in-text citations
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 text-blue-500 mr-2 animate-spin" />
                    Finding in-text citations...
                  </>
                )}
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <Clock className="h-4 w-4 text-blue-500 mr-2 animate-spin" />
                Verifying DOIs with Crossref...
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <Clock className="h-4 w-4 text-blue-500 mr-2 animate-spin" />
                Detecting formatting issues...
              </div>
            </div>

            <p className="text-sm text-gray-500 mt-6">
              Estimated time: {getEstimatedTime()} seconds
              {progress?.totalReferences && progress.totalReferences > 0 && (
                <span className="text-gray-400 ml-2">
                  (based on {progress.totalReferences} references)
                </span>
              )}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Check for 404 error (job not found)
  const isJobNotFound = (progressError as any)?.response?.status === 404 ||
                        (analysisError as any)?.response?.status === 404;

  if (isJobNotFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-12 max-w-2xl w-full text-center">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Citation Job Not Found</h2>
          <p className="text-gray-600 mb-2">
            The citation analysis job you're looking for doesn't exist.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Job ID: <span className="font-mono">{jobId}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/citation/upload')} variant="primary">
              Upload New Manuscript
            </Button>
            <Button onClick={() => navigate('/citation/jobs')} variant="outline">
              View All Jobs
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Show error state
  if (isFailed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-12 max-w-2xl w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Analysis Failed</h2>
          <p className="text-gray-600 mb-6">
            We encountered an error while analyzing your manuscript.
          </p>
          <Button onClick={() => navigate('/citation/upload')}>Upload Another File</Button>
        </Card>
      </div>
    );
  }

  // Show results (THE HOOK!)
  if (isComplete && analysis) {
    const { totalIssues, breakdown, stats, processingTime } = analysis;

    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          {/* Success Banner */}
          <Card className="p-8 mb-8 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                  <h1 className="text-3xl font-bold text-gray-900">Analysis Complete</h1>
                </div>
                <p className="text-xl text-gray-700 ml-11">
                  🎯 We found <span className="font-bold text-red-600">{totalIssues} citation issues</span> in{' '}
                  <span className="font-bold text-blue-600">{processingTime?.toFixed(1) || '0.0'} seconds</span>
                </p>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => navigate(`/citation/manuscript/${jobId}`)}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Manuscript
                </Button>
                <Button variant="outline" onClick={() => navigate(`/citation/ghosts/${jobId}`)}>
                  View Ghost Citations
                </Button>
                <Button variant="outline" onClick={() => navigate(`/citation/references/${jobId}`)}>
                  Review Manually
                </Button>
                <Button onClick={() => alert('Auto-correction coming soon!')}>
                  Start Auto-Correction
                </Button>
              </div>
            </div>
          </Card>

          {/* Issue Breakdown */}
          <Card className="p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Issue Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <IssueCard
                icon="🔴"
                label="Missing DOIs"
                count={breakdown.missingDois}
                color="red"
                tooltip="References exist but don't have DOI links"
              />
              <IssueCard
                icon="🟡"
                label="Duplicate References"
                count={breakdown.duplicates}
                color="yellow"
              />
              <IssueCard
                icon="🟠"
                label="Uncited References"
                count={breakdown.uncited}
                color="orange"
              />
              <IssueCard
                icon="🔵"
                label="Ghost Citations"
                count={breakdown.mismatches}
                color="blue"
                tooltip="Citations in text with no matching reference entry"
              />
              <IssueCard
                icon="🟣"
                label="Formatting Inconsistencies"
                count={breakdown.formattingIssues}
                color="purple"
              />
              <IssueCard
                icon="⚫"
                label="Numbering Mismatches"
                count={breakdown.numberingMismatches}
                color="gray"
              />
            </div>
          </Card>

          {/* Document Stats */}
          <Card className="p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Document Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatBox
                icon={<FileText className="h-8 w-8 text-blue-500" />}
                label="Total References"
                value={stats.totalReferences}
              />
              <StatBox
                icon={<Target className="h-8 w-8 text-green-500" />}
                label="In-Text Citations"
                value={stats.totalCitations}
              />
              <StatBox
                icon={<CheckCircle className="h-8 w-8 text-purple-500" />}
                label="Detected Style"
                value={stats.detectedStyle}
              />
              <StatBox
                icon={<Clock className="h-8 w-8 text-orange-500" />}
                label="Confidence"
                value={`${Math.round(stats.confidence * 100)}%`}
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="mt-8 flex justify-center flex-wrap gap-3">
            <Button variant="outline" onClick={() => navigate(`/citation/diff/${jobId}`)}>
              View Before/After Diff
            </Button>
            <Button variant="outline" onClick={() => navigate(`/citation/style/${jobId}`)}>
              Normalize Citation Style
            </Button>
            <Button variant="primary" onClick={() => setShowExportModal(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export Corrected Manuscript
            </Button>
            <Button variant="outline" onClick={handleDownloadSummary} disabled={downloading}>
              <Download className="h-4 w-4 mr-2" />
              Download Change Summary
            </Button>
            <Button variant="outline" onClick={() => navigate('/citation/upload')}>
              Analyze Another Manuscript
            </Button>
          </div>

          {/* Export Options Modal */}
          <ExportOptionsModal
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
            onExport={handleExport}
            isExporting={isExporting}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

// Issue Card Component
function IssueCard({
  icon,
  label,
  count,
  color,
  tooltip,
}: {
  icon: string;
  label: string;
  count: number;
  color: string;
  tooltip?: string;
}) {
  const colorClasses: Record<string, string> = {
    red: 'bg-red-50 border-red-200 hover:bg-red-100',
    yellow: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
    orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    gray: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${colorClasses[color]}`}
      title={tooltip}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      {tooltip && (
        <div className="text-xs text-gray-500 mb-2 italic">{tooltip}</div>
      )}
      <div className="text-3xl font-bold text-gray-900">{count}</div>
    </div>
  );
}

// Stat Box Component
function StatBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-3">{icon}</div>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
