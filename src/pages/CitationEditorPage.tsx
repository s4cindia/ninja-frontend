/**
 * Citation Editor Page
 * Full-featured citation management with drag-drop reference editor
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Link as LinkIcon,
  Eye,
  ArrowUpDown,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import ReferenceEditor from '@/components/citation/ReferenceEditor';
import DragDropGuide from '@/components/citation/DragDropGuide';
import DocumentViewer from '@/components/citation/DocumentViewer';
import { ExportOptionsModal } from '@/components/citation/ExportOptionsModal';
import { api } from '@/services/api';
import toast from 'react-hot-toast';

interface AnalysisData {
  document: {
    id: string;
    filename: string;
    status: string;
    wordCount: number;
    pageCount?: number;
    fullText?: string;
    fullHtml?: string;
    statistics: {
      totalCitations: number;
      totalReferences: number;
    };
  };
  citations: any[];
  references: any[];
  detectedStyle: string;
  validations?: any[];
}

interface RecentChange {
  citationId: string;
  oldNumber: number;
  newNumber: number | null; // null means orphaned (reference deleted)
  oldText?: string; // Original citation text (e.g., "[3–5]")
  newText?: string; // New citation text after changes (e.g., "[3,4]")
  changeType?: 'style' | 'renumber' | 'deleted' | 'unchanged'; // Type of change
}

export default function CitationEditorPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState('APA');
  const [converting, setConverting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const [activeTab, setActiveTab] = useState<'document' | 'references'>('document');
  const [recentChanges, setRecentChanges] = useState<RecentChange[]>([]);
  const [showChangeHighlights, setShowChangeHighlights] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isResequencing, setIsResequencing] = useState(false);
  const [doiValidationResults, setDoiValidationResults] = useState<{
    validated: number;
    valid: number;
    invalid: number;
    withDiscrepancies: number;
    results: Array<{
      referenceId: string;
      referenceNumber: number;
      doi: string;
      valid: boolean;
      discrepancies?: Array<{ field: string; referenceValue: string; crossrefValue: string }>;
      error?: string;
    }>;
  } | null>(null);
  const [showDoiValidationResults, setShowDoiValidationResults] = useState(false);

  // Detect out-of-sequence citations for Vancouver style
  const sequenceAnalysis = useMemo(() => {
    if (!data?.citations || data.citations.length === 0) {
      return { isSequential: true, outOfOrder: [], expectedOrder: [] };
    }

    // Only check for numeric citation styles (Vancouver, IEEE)
    const isNumericStyle = data.detectedStyle?.toLowerCase() === 'vancouver' ||
                          data.detectedStyle?.toLowerCase() === 'ieee' ||
                          data.citations.some((c: any) => /^\s*[([]?\d+[)\]]?\s*$/.test(c.rawText?.replace(/[,\-–]/g, '')));

    if (!isNumericStyle) {
      return { isSequential: true, outOfOrder: [], expectedOrder: [] };
    }

    // Extract citation numbers in order of appearance
    const citationNumbers: number[] = [];
    for (const citation of data.citations) {
      const rawText = citation.rawText || '';
      // Extract all numbers from the citation
      const matches = rawText.match(/\d+/g);
      if (matches) {
        for (const match of matches) {
          const num = parseInt(match, 10);
          if (!isNaN(num) && num > 0 && num <= 1000) {
            citationNumbers.push(num);
          }
        }
      }
    }

    if (citationNumbers.length === 0) {
      return { isSequential: true, outOfOrder: [], expectedOrder: [] };
    }

    // Track first occurrence of each number
    const firstOccurrence: number[] = [];
    const seen = new Set<number>();
    for (const num of citationNumbers) {
      if (!seen.has(num)) {
        firstOccurrence.push(num);
        seen.add(num);
      }
    }

    // Check if citations are in sequence (1, 2, 3, 4...)
    const outOfOrder: number[] = [];
    let lastSeen = 0;
    for (const num of firstOccurrence) {
      if (num < lastSeen) {
        outOfOrder.push(num);
      } else {
        lastSeen = num;
      }
    }

    // Calculate expected order (sorted by first appearance)
    const expectedOrder = [...firstOccurrence].sort((a, b) => a - b);

    return {
      isSequential: outOfOrder.length === 0,
      outOfOrder,
      expectedOrder,
      actualOrder: firstOccurrence
    };
  }, [data?.citations, data?.detectedStyle]);

  const loadAnalysis = useCallback(async (showLoadingSpinner = true) => {
    // Only show loading spinner on initial load, not during polling
    if (showLoadingSpinner) {
      setLoading(true);
    }
    setError(null);
    try {
      console.log('[CitationEditorPage] Loading analysis for document:', documentId);

      const response = await api.get(
        `/citation-management/document/${documentId}/analysis`
      );

      console.log('[CitationEditorPage] API response:', {
        success: response.data.success,
        hasCitations: !!response.data.data?.citations,
        citationsCount: response.data.data?.citations?.length || 0,
        hasFullText: !!response.data.data?.document?.fullText,
        fullTextLength: response.data.data?.document?.fullText?.length || 0
      });

      if (response.data.data?.citations && response.data.data.citations.length > 0) {
        const citationsWithText = response.data.data.citations.filter((c: { rawText?: string }) => c.rawText && c.rawText.trim() !== '');
        console.log('[CitationEditorPage] Citations with rawText:', citationsWithText.length, '/', response.data.data.citations.length);

        if (citationsWithText.length < response.data.data.citations.length) {
          console.warn('[CitationEditorPage] Some citations missing rawText!');
        }

        console.log('[CitationEditorPage] Sample citations from API:', response.data.data.citations.slice(0, 3));
      }

      if (response.data.success) {
        setData(response.data.data);
        setSelectedStyle(response.data.data.detectedStyle || 'APA');

        // Also fetch preview data to show any pending track changes
        try {
          const previewResponse = await api.get(
            `/citation-management/document/${documentId}/preview`
          );

          if (previewResponse.data.success && previewResponse.data.data?.citations) {
            const previews = previewResponse.data.data.citations;
            console.log('[CitationEditorPage] Preview data on load:', previews.length, 'changes');

            // Convert preview data to RecentChange format
            interface PreviewCitation {
              id: string;
              changeType: string;
              isOrphaned?: boolean;
              referenceNumber?: number;
              originalText?: string;
              newText?: string;
            }
            const changes: RecentChange[] = (previews as PreviewCitation[])
              .filter((p) => p.changeType !== 'unchanged')
              .map((p) => ({
                citationId: p.id,
                oldNumber: 0,
                newNumber: p.isOrphaned || p.changeType === 'deleted' ? null : (p.referenceNumber ?? null),
                oldText: p.originalText,
                newText: p.isOrphaned || p.changeType === 'deleted' ? p.originalText : p.newText,
                changeType: p.changeType as 'style' | 'renumber' | 'deleted' | 'unchanged'
              }));

            if (changes.length > 0) {
              console.log('[CitationEditorPage] Setting recent changes on load:', changes.length);
              setRecentChanges(changes);
              setShowChangeHighlights(true);
            }
          }
        } catch (previewErr) {
          console.log('[CitationEditorPage] No preview data available (this is normal for fresh documents)');
        }
      } else {
        setError(response.data.error?.message || 'Failed to load analysis');
      }
    } catch (err: unknown) {
      console.error('[CitationEditorPage] Error loading analysis:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analysis';
      const apiError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(apiError.response?.data?.error?.message || errorMessage);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  // Track poll count to prevent infinite polling
  const [pollCount, setPollCount] = useState(0);
  const MAX_POLLS = 30; // Max 60 seconds (30 * 2s)

  // Initial load
  useEffect(() => {
    loadAnalysis();
    setPollCount(0); // Reset poll count on initial load
  }, [loadAnalysis]);

  // Polling effect - refetch when document is still being analyzed (with limit)
  useEffect(() => {
    if (!data?.document?.status) return;

    const isProcessing = ['ANALYZING', 'QUEUED', 'PROCESSING'].includes(data.document.status);

    if (isProcessing && pollCount < MAX_POLLS) {
      console.log(`[CitationEditorPage] Document still processing, poll ${pollCount + 1}/${MAX_POLLS}...`);
      const pollTimer = setTimeout(() => {
        setPollCount(prev => prev + 1);
        loadAnalysis(false); // Don't show loading spinner during polling
      }, 2000);

      return () => clearTimeout(pollTimer);
    } else if (isProcessing && pollCount >= MAX_POLLS) {
      console.log('[CitationEditorPage] Max polls reached, stopping auto-refresh');
    }
  }, [data?.document?.status, loadAnalysis, pollCount]);

  const handleConvertStyle = async () => {
    setConverting(true);
    setError(null);
    try {
      const response = await api.post(
        `/citation-management/document/${documentId}/convert-style`,
        { targetStyle: selectedStyle }
      );

      if (response.data.success) {
        await loadAnalysis();

        // Fetch preview data to show style conversion changes
        try {
          const previewResponse = await api.get(
            `/citation-management/document/${documentId}/preview`
          );

          if (previewResponse.data.success && previewResponse.data.data?.citations) {
            const previews = previewResponse.data.data.citations;
            console.log('[CitationEditorPage] Style conversion preview data:', previews.length, 'citations');
            console.log('[CitationEditorPage] Preview summary:', previewResponse.data.data.summary);

            // Convert preview data to RecentChange format for display
            // Include both style changes and renumber changes
            const changes: RecentChange[] = previews
              .filter((p: any) => p.changeType !== 'unchanged')
              .map((p: any) => ({
                citationId: p.id,
                oldNumber: 0,
                newNumber: p.isOrphaned || p.changeType === 'deleted' ? null : p.referenceNumber,
                oldText: p.originalText,
                newText: p.isOrphaned || p.changeType === 'deleted' ? p.originalText : p.newText,
                changeType: p.changeType as 'style' | 'renumber' | 'deleted' | 'unchanged'
              }));

            console.log('[CitationEditorPage] Style conversion changes to display:', changes.length);
            console.log('[CitationEditorPage] Changes detail:', JSON.stringify(changes, null, 2));

            if (changes.length > 0) {
              setRecentChanges(changes);
              setShowChangeHighlights(true);
              console.log('[CitationEditorPage] Set recentChanges and showChangeHighlights=true');
            }
          }
        } catch (previewErr) {
          console.error('[CitationEditorPage] Failed to fetch preview after style conversion:', previewErr);
        }

        toast.success(`Successfully converted to ${selectedStyle} style!`);
      } else {
        setError(response.data.error?.message || 'Conversion failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  const handleValidateDOIs = async () => {
    setValidating(true);
    setError(null);
    try {
      const response = await api.post(
        `/citation-management/document/${documentId}/validate-dois`
      );

      if (response.data.success) {
        const validationData = response.data.data;
        console.log('[DOI Validation] Results:', validationData);
        setDoiValidationResults(validationData);

        // Build toast message
        let message = `DOI Validation: ${validationData.valid}/${validationData.validated} valid`;
        if (validationData.invalid > 0) {
          message += `, ${validationData.invalid} invalid`;
        }
        if (validationData.withDiscrepancies > 0) {
          message += `, ${validationData.withDiscrepancies} with metadata mismatches`;
        }

        // Always show the results modal if there are any results
        if (validationData.validated > 0) {
          toast.success(message, { duration: 5000 });
          setShowDoiValidationResults(true); // Show results modal
        } else {
          toast.success(validationData.message || 'No DOIs found in references');
        }
      } else {
        setError(response.data.error?.message || 'Validation failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleExport = async (options: { includeOriginal: boolean; highlightChanges: boolean; acceptChanges: boolean }) => {
    try {
      setIsExporting(true);

      // Build query params based on options
      const params = new URLSearchParams();
      if (options.acceptChanges) {
        params.append('acceptChanges', 'true');
      }
      // Note: includeOriginal and highlightChanges are handled by the backend
      // if acceptChanges is false (Track Changes mode)

      const queryString = params.toString();
      const url = `/citation-management/document/${documentId}/export${queryString ? `?${queryString}` : ''}`;

      // Download the modified DOCX with updated citations
      const response = await api.get(url, { responseType: 'blob' });

      // Create download link
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Use different filename based on export type
      const suffix = options.acceptChanges ? '_corrected' : '_tracked_changes';
      link.download = `${data?.document.filename.replace('.docx', '')}${suffix}.docx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setShowExportModal(false);
      toast.success('Document exported successfully! Check your downloads folder.');
    } catch (error: unknown) {
      console.error('Export failed:', error);
      toast.error('Failed to export document. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCitationClick = (referenceNumber: number) => {
    // Switch to references tab and scroll to reference
    setActiveTab('references');
    setTimeout(() => {
      const refElement = document.getElementById(`ref-${referenceNumber}`);
      refElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleReorderComplete = async () => {
    console.log('[CitationEditorPage] handleReorderComplete called');

    // Reload data first
    await loadAnalysis();

    // Fetch preview data from backend to get correctly computed changes
    // This uses the backend's chaining logic: ORIGINAL DOCX → CURRENT → FINAL
    try {
      const previewResponse = await api.get(
        `/citation-management/document/${documentId}/preview`
      );

      if (previewResponse.data.success && previewResponse.data.data?.citations) {
        const previews = previewResponse.data.data.citations;
        console.log('[CitationEditorPage] Got preview data:', previews.length, 'citations');

        // Convert preview data to RecentChange format
        // Only include changed or orphaned citations
        const changes: RecentChange[] = previews
          .filter((p: any) => p.changeType !== 'unchanged')
          .map((p: any) => ({
            citationId: p.id,
            oldNumber: 0, // Not used for display, we use oldText/newText
            newNumber: p.isOrphaned || p.changeType === 'deleted' ? null : p.referenceNumber,
            oldText: p.originalText,
            newText: p.isOrphaned || p.changeType === 'deleted' ? p.originalText : p.newText,
            changeType: p.changeType as 'style' | 'renumber' | 'deleted' | 'unchanged'
          }));

        console.log('[CitationEditorPage] Computed changes from preview:', changes.length);

        if (changes.length > 0) {
          setRecentChanges(changes);
          setShowChangeHighlights(true);
        }
      }
    } catch (err) {
      console.error('[CitationEditorPage] Failed to fetch preview:', err);
      // Preview failed - changes won't be highlighted but data is still reloaded
    }
  };

  // Handle resequencing citations by appearance order
  const handleResequence = async () => {
    setIsResequencing(true);
    setError(null);
    try {
      console.log('[CitationEditorPage] Resequencing citations by appearance order');

      // Call the resequence API
      const response = await api.post(
        `/citation-management/document/${documentId}/resequence`
      );

      if (response.data.success) {
        console.log('[CitationEditorPage] Resequence successful:', response.data.data);

        // Reload data to get updated references
        await loadAnalysis();

        // Fetch preview data to show track changes
        try {
          const previewResponse = await api.get(
            `/citation-management/document/${documentId}/preview`
          );

          if (previewResponse.data.success && previewResponse.data.data?.citations) {
            const previews = previewResponse.data.data.citations;
            console.log('[CitationEditorPage] Got preview data after resequence:', previews.length, 'citations');

            // Convert preview data to RecentChange format
            const changes: RecentChange[] = previews
              .filter((p: any) => p.changeType !== 'unchanged')
              .map((p: any) => ({
                citationId: p.id,
                oldNumber: 0,
                newNumber: p.isOrphaned || p.changeType === 'deleted' ? null : p.referenceNumber,
                oldText: p.originalText,
                newText: p.isOrphaned || p.changeType === 'deleted' ? p.originalText : p.newText,
                changeType: p.changeType as 'style' | 'renumber' | 'deleted' | 'unchanged'
              }));

            console.log('[CitationEditorPage] Resequence changes to display:', changes.length);

            if (changes.length > 0) {
              setRecentChanges(changes);
              setShowChangeHighlights(true);
            }
          }
        } catch (previewErr) {
          console.error('[CitationEditorPage] Failed to fetch preview after resequence:', previewErr);
        }
      } else {
        setError(response.data.error?.message || 'Resequencing failed');
      }
    } catch (err: any) {
      console.error('[CitationEditorPage] Resequence failed:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to resequence citations');
    } finally {
      setIsResequencing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading citation analysis...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="error" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
        <Button onClick={() => navigate('/citation-management')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Upload
        </Button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      <DragDropGuide />
      <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/citation-management')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Citation Editor
                </h1>
                <p className="text-sm text-gray-600 flex items-center mt-1">
                  <FileText className="h-3 w-3 mr-1" />
                  {data.document.filename}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => loadAnalysis()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setShowExportModal(true)}>
                <Download className="h-4 w-4 mr-2" />
                Export DOCX
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {error && (
          <Alert variant="error" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        {/* Processing indicator when document is being analyzed */}
        {['ANALYZING', 'QUEUED', 'PROCESSING'].includes(data.document.status) && pollCount < MAX_POLLS && (
          <Alert variant="info" className="mb-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Document is being analyzed. This page will update automatically when complete...</span>
          </Alert>
        )}

        {/* Timeout message when polling stopped */}
        {['ANALYZING', 'QUEUED', 'PROCESSING'].includes(data.document.status) && pollCount >= MAX_POLLS && (
          <Alert variant="warning" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <span>Analysis is taking longer than expected. Click Refresh to check status.</span>
          </Alert>
        )}

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Citations</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {data.document.statistics.totalCitations}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">References</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {data.document.statistics.totalReferences}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📚</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Word Count</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {data.document.wordCount.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📄</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Citation Style</p>
                <Badge variant="success" className="mt-2 text-lg">
                  {data.detectedStyle}
                </Badge>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">✨</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Sequence Warning Banner */}
        {!sequenceAnalysis.isSequential && (
          <Alert variant="warning" className="mb-6">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <ArrowUpDown className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-800">Citations Out of Sequence</p>
                  <p className="text-sm text-amber-700 mt-1">
                    The following citations appear out of order: [{sequenceAnalysis.outOfOrder.join(', ')}].
                    For Vancouver style, citations should appear in numerical order (1, 2, 3...).
                  </p>
                </div>
              </div>
              <Button
                onClick={handleResequence}
                disabled={isResequencing}
                className="ml-4 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isResequencing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Fix Sequence
                  </>
                )}
              </Button>
            </div>
          </Alert>
        )}

        {/* Action Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <h3 className="font-semibold mb-3 text-gray-900">
              Convert Citation Style
            </h3>
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              disabled={converting}
            >
              <option value="APA">APA 7th Edition</option>
              <option value="MLA">MLA 9th Edition</option>
              <option value="Chicago">Chicago Manual</option>
              <option value="Vancouver">Vancouver</option>
              <option value="IEEE">IEEE</option>
              <option value="Harvard">Harvard</option>
              <option value="AMA">AMA</option>
            </select>
            <Button
              className="w-full"
              onClick={handleConvertStyle}
              disabled={converting || selectedStyle === data.detectedStyle}
            >
              {converting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                <>Convert to {selectedStyle}</>
              )}
            </Button>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3 text-gray-900 flex items-center">
              <LinkIcon className="h-4 w-4 mr-2" />
              DOI Validation
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Validate all DOIs and check metadata accuracy
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleValidateDOIs}
              disabled={validating}
            >
              {validating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Validate DOIs
                </>
              )}
            </Button>
            {doiValidationResults && doiValidationResults.validated > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-blue-600 hover:text-blue-800"
                onClick={() => setShowDoiValidationResults(true)}
              >
                View Results ({doiValidationResults.valid}/{doiValidationResults.validated} valid
                {doiValidationResults.withDiscrepancies > 0 && `, ${doiValidationResults.withDiscrepancies} mismatches`})
              </Button>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3 text-gray-900 flex items-center">
              <Eye className="h-4 w-4 mr-2" />
              In-Text Citations
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              View {data.citations.length} citation{data.citations.length !== 1 ? 's' : ''} in document
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCitations(!showCitations)}
            >
              {showCitations ? 'Hide' : 'Show'} Citations
            </Button>
          </Card>
        </div>

        {/* In-Text Citations Preview */}
        {showCitations && data.citations.length > 0 && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">In-Text Citations</h3>
            {/* Warning for citations without references */}
            {data.citations.filter((c: any) => !c.referenceNumber && (!c.linkedReferenceNumbers || c.linkedReferenceNumbers.length === 0) && !c.isOrphaned).length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4">
                <p className="text-sm text-orange-800">
                  <AlertTriangle className="inline h-4 w-4 mr-1" />
                  <strong>{data.citations.filter((c: any) => !c.referenceNumber && (!c.linkedReferenceNumbers || c.linkedReferenceNumbers.length === 0) && !c.isOrphaned).length} citation(s)</strong> don't have matching references in the reference list.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {data.citations.map((citation: any) => {
                const hasNoReference = !citation.referenceNumber && (!citation.linkedReferenceNumbers || citation.linkedReferenceNumbers.length === 0) && !citation.isOrphaned;
                return (
                  <div
                    key={citation.id}
                    className={`p-3 border rounded-md transition-colors ${
                      citation.isOrphaned
                        ? 'border-red-300 bg-red-50 hover:bg-red-100'
                        : hasNoReference
                        ? 'border-orange-300 bg-orange-50 hover:bg-orange-100'
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="default" className="text-xs">
                        ¶{citation.paragraphIndex || citation.paragraphNumber || 0}
                      </Badge>
                      <span className="text-sm font-mono text-gray-700">
                        {citation.rawText}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500 italic">
                        {citation.citationType || 'Citation'}
                      </p>
                      {citation.isOrphaned ? (
                        <span className="text-xs text-red-600 font-medium">
                          ⚠️ Reference deleted
                        </span>
                      ) : hasNoReference ? (
                        <span className="text-xs text-orange-600 font-medium">
                          ⚠️ No matching reference
                        </span>
                      ) : (citation.linkedReferenceNumbers?.length > 0 || citation.referenceNumber) ? (
                        <div className="flex flex-wrap gap-1">
                          {/* Show all linked reference numbers as clickable buttons */}
                          {(citation.linkedReferenceNumbers?.length > 0 ? citation.linkedReferenceNumbers : [citation.referenceNumber]).map((refNum: number, idx: number) => (
                            <button
                              key={refNum}
                              onClick={() => {
                                setActiveTab('references');
                                setTimeout(() => {
                                  const refElement = document.getElementById(`ref-${refNum}`);
                                  refElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  // Highlight the reference briefly
                                  refElement?.classList.add('ring-2', 'ring-blue-500');
                                  setTimeout(() => refElement?.classList.remove('ring-2', 'ring-blue-500'), 2000);
                                }, 100);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            >
                              {idx === 0 ? '→ ' : ''}#{refNum}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('document')}
                className={`${
                  activeTab === 'document'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                📄 Document Preview
              </button>
              <button
                onClick={() => setActiveTab('references')}
                className={`${
                  activeTab === 'references'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                📚 Reference List ({data.references.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Document Preview Tab */}
        {activeTab === 'document' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Document Preview</h2>
                <p className="text-gray-600 mt-1">
                  View your document with citations highlighted in context
                </p>
              </div>
              {recentChanges.length > 0 && showChangeHighlights && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowChangeHighlights(false);
                    setRecentChanges([]);
                  }}
                >
                  ✓ Dismiss Changes ({recentChanges.length})
                </Button>
              )}
            </div>
            <DocumentViewer
              fullText={data.document.fullText}
              fullHtml={data.document.fullHtml}
              citations={data.citations}
              references={data.references.map((r: any) => ({
                id: r.id,
                number: r.number,
                authors: r.authors,
                year: r.year
              }))}
              onCitationClick={handleCitationClick}
              recentChanges={showChangeHighlights ? recentChanges : []}
            />
          </div>
        )}

        {/* Reference List Tab */}
        {activeTab === 'references' && (
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Reference List</h2>
              <p className="text-gray-600 mt-1">
                Drag and drop to reorder • All in-text citations update automatically
              </p>
            </div>
            <ReferenceEditor
              documentId={documentId!}
              references={data.references}
              citations={data.citations}
              onReload={loadAnalysis}
              onReorderComplete={handleReorderComplete}
            />
          </div>
        )}
      </div>
    </div>

    {/* Export Options Modal */}
    <ExportOptionsModal
      isOpen={showExportModal}
      onClose={() => setShowExportModal(false)}
      onExport={handleExport}
      isExporting={isExporting}
    />

    {/* DOI Validation Results Modal */}
    {showDoiValidationResults && doiValidationResults && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">DOI Validation Results</h3>
            <button
              onClick={() => setShowDoiValidationResults(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900">{doiValidationResults.validated}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{doiValidationResults.valid}</div>
                <div className="text-sm text-gray-500">Valid</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{doiValidationResults.invalid}</div>
                <div className="text-sm text-gray-500">Invalid</div>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-amber-600">{doiValidationResults.withDiscrepancies}</div>
                <div className="text-sm text-gray-500">Mismatches</div>
              </div>
            </div>

            {doiValidationResults.results.filter(r => r.discrepancies && r.discrepancies.length > 0).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Metadata Mismatches (CrossRef vs Reference)</h4>
                {doiValidationResults.results
                  .filter(r => r.discrepancies && r.discrepancies.length > 0)
                  .map(result => (
                    <div key={result.referenceId} className="border rounded-lg p-3 bg-amber-50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">Reference #{result.referenceNumber}</span>
                        <span className="text-xs text-gray-500">{result.doi}</span>
                      </div>
                      <div className="space-y-2">
                        {result.discrepancies!.map((disc, idx) => (
                          <div key={idx} className="text-sm grid grid-cols-3 gap-2">
                            <div className="font-medium capitalize">{disc.field}:</div>
                            <div className="text-red-700 line-through">{disc.referenceValue}</div>
                            <div className="text-green-700">{disc.crossrefValue}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {doiValidationResults.results.filter(r => !r.valid).length > 0 && (
              <div className="space-y-3 mt-4">
                <h4 className="font-medium text-gray-900">Invalid DOIs</h4>
                {doiValidationResults.results
                  .filter(r => !r.valid)
                  .map(result => (
                    <div key={result.referenceId} className="border rounded-lg p-3 bg-red-50">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Reference #{result.referenceNumber}</span>
                        <span className="text-xs text-gray-500">{result.doi}</span>
                      </div>
                      {result.error && (
                        <div className="text-sm text-red-600 mt-1">{result.error}</div>
                      )}
                    </div>
                  ))
                }
              </div>
            )}

            {doiValidationResults.results.filter(r => r.valid && (!r.discrepancies || r.discrepancies.length === 0)).length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Valid DOIs</h4>
                <div className="text-sm text-green-600">
                  {doiValidationResults.results.filter(r => r.valid && (!r.discrepancies || r.discrepancies.length === 0)).length} references have valid DOIs with matching metadata
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t flex justify-end">
            <Button onClick={() => setShowDoiValidationResults(false)}>Close</Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
