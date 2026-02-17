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
import { useAnalysisResults } from '@/hooks/useCitationIntel';
import { ExportOptionsModal } from '@/components/citation/ExportOptionsModal';
import { citationIntelService } from '@/services/citation-intel.service';
import toast from 'react-hot-toast';

export default function CitationAnalysisPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [_downloading, setDownloading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  void _downloading; // Used in handleDownloadSummary

  const { data: analysis, isLoading: analysisLoading, error: analysisError } = useAnalysisResults(documentId);

  // Debug logging
  console.log('[CitationAnalysisPage] DocumentId:', documentId);
  console.log('[CitationAnalysisPage] Analysis data:', analysis);
  console.log('[CitationAnalysisPage] Analysis loading:', analysisLoading);

  // Derive status from analysis data (sync processing completes immediately)
  const isProcessing = analysisLoading;
  const isComplete = !!analysis && !analysisLoading;
  const isFailed = !!analysisError && !analysisLoading;

  console.log('[CitationAnalysisPage] isProcessing:', isProcessing);
  console.log('[CitationAnalysisPage] isComplete:', isComplete);
  console.log('[CitationAnalysisPage] isFailed:', isFailed);

  // Calculate estimated time based on references count
  const getEstimatedTime = () => {
    const refCount = analysis?.document?.statistics?.totalReferences || 0;
    if (refCount === 0) return '10-15';
    if (refCount < 10) return '3-5';
    if (refCount < 20) return '5-8';
    if (refCount < 50) return '8-12';
    return '12-20';
  };
  // Suppress unused variable warning - function used in commented code
  void getEstimatedTime;

  // Invalidate analysis query when job completes to fetch fresh data
  useEffect(() => {
    if (isComplete && documentId) {
      console.log('[CitationAnalysisPage] Job completed, invalidating analysis query');
      queryClient.invalidateQueries({ queryKey: ['citation-analysis', documentId] });
    }
  }, [isComplete, documentId, queryClient]);

  const handleExport = async (options: { includeOriginal: boolean; highlightChanges: boolean }) => {
    if (!documentId) return;
    try {
      setIsExporting(true);
      await citationIntelService.exportWithCorrections(documentId, options);
      toast.success('✓ Manuscript exported successfully');
      setShowExportModal(false);
    } catch (error: any) {
      toast.error('Failed to export manuscript');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSummary = async () => {
    if (!documentId) return;
    try {
      setDownloading(true);
      await citationIntelService.downloadChangeSummary(documentId);
      toast.success('✓ Change summary downloaded');
    } catch (error: any) {
      toast.error('Failed to download summary');
    } finally {
      setDownloading(false);
    }
  };
  void handleDownloadSummary; // Available for future use

  // Show loading state
  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-12 max-w-2xl w-full">
          <div className="text-center">
            <Spinner size="lg" className="mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading analysis results...</h2>
            <p className="text-sm text-gray-500">Please wait while we fetch the citation analysis.</p>
          </div>
        </Card>
      </div>
    );
  }

  // Check for 404 error (document not found)
  const isJobNotFound = (analysisError as any)?.response?.status === 404;

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
            Job ID: <span className="font-mono">{documentId}</span>
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
    const { document, references, detectedStyle } = analysis;
    const statistics = document.statistics;
    const filename = document.filename;

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
                  📄 <span className="font-semibold">{filename}</span> - Detected style:{' '}
                  <span className="font-bold text-blue-600">{detectedStyle || 'Unknown'}</span>
                </p>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => navigate(`/citation/manuscript/${documentId}`)}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Manuscript
                </Button>
                <Button variant="outline" onClick={() => navigate(`/citation/editor/${documentId}`)}>
                  Edit References
                </Button>
                <Button onClick={() => setShowExportModal(true)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </Card>

          {/* Document Stats */}
          <Card className="p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Document Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-900">{statistics?.totalReferences || 0}</p>
                <p className="text-sm text-gray-600">References</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Target className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-900">{statistics?.totalCitations || 0}</p>
                <p className="text-sm text-gray-600">In-Text Citations</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-900">{document.wordCount || 0}</p>
                <p className="text-sm text-gray-600">Words</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-900">{document.pageCount || 0}</p>
                <p className="text-sm text-gray-600">Pages</p>
              </div>
            </div>
          </Card>

          {/* Reference List Preview */}
          {references && references.length > 0 && (
            <Card className="p-8 mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">References ({references.length})</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {references.slice(0, 10).map((ref: any, index: number) => (
                  <div key={ref.id} className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-semibold text-blue-600 mr-2">[{index + 1}]</span>
                    <span className="text-gray-800">
                      {ref.authors?.join(', ') || 'Unknown'} ({ref.year || 'n.d.'}).{' '}
                      <em>{ref.title || 'Untitled'}</em>
                      {ref.journalName && `. ${ref.journalName}`}
                      {ref.doi && (
                        <a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 ml-2">
                          DOI: {ref.doi}
                        </a>
                      )}
                    </span>
                  </div>
                ))}
                {references.length > 10 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... and {references.length - 10} more references
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-center flex-wrap gap-3">
            <Button variant="primary" onClick={() => navigate(`/citation/editor/${documentId}`)}>
              Open in Editor
            </Button>
            <Button variant="outline" onClick={() => setShowExportModal(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={() => navigate('/citation/upload')}>
              Analyze Another
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

// Suppressing unused function warnings - these components are available for future use
void IssueCard;
void StatBox;

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
