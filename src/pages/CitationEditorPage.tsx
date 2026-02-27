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
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ArrowUpDown,
  Loader2,
  Trash2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Checkbox } from '@/components/ui/Checkbox';
import ReferenceEditor from '@/components/citation/ReferenceEditor';
import DragDropGuide from '@/components/citation/DragDropGuide';
import DocumentViewer from '@/components/citation/DocumentViewer';
import { ExportOptionsModal } from '@/components/citation/ExportOptionsModal';
import { api } from '@/services/api';
import { useDeleteDocument } from '@/hooks/useCitationIntel';
import toast from 'react-hot-toast';

interface AnalysisCitation {
  id: string;
  rawText: string;
  referenceId?: string;
  referenceNumber?: number;
  citationType?: string;
  paragraphIndex?: number;
  paragraphNumber?: number;
  startOffset: number;
  endOffset: number;
  citationNumber?: number | null;
  linkedReferenceNumbers?: number[];
  isOrphaned?: boolean;
}

interface AnalysisReference {
  id: string;
  number: number;
  authors: string[];
  year: string;
  title: string;
  sourceType?: string;
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
  citationCount?: number;
  formattedText?: string;
}

interface AnalysisValidation {
  id: string;
  type: string;
  message: string;
  severity: string;
  citationId?: string;
}

interface AnalysisData {
  document: {
    id: string;
    filename: string;
    status: string;
    wordCount: number;
    pageCount?: number;
    fileSize?: number;
    processingTime?: number | null;
    fullText?: string;
    fullHtml?: string;
    statistics: {
      totalCitations: number;
      totalReferences: number;
    };
  };
  citations: AnalysisCitation[];
  references: AnalysisReference[];
  detectedStyle: string;
  validations?: AnalysisValidation[];
}

interface RecentChange {
  citationId: string;
  changeId?: string; // CitationChange ID for dismiss operations
  oldNumber: number;
  newNumber: number | null; // null means orphaned (reference deleted)
  oldText?: string; // Original citation text (e.g., "[3–5]")
  newText?: string; // New citation text after changes (e.g., "[3,4]")
  changeType?: 'style' | 'renumber' | 'deleted' | 'unchanged' | 'reference_edit'; // Type of change
}

interface PreviewCitation {
  id: string;
  changeId?: string;
  changeType: string;
  isOrphaned?: boolean;
  referenceNumber?: number;
  originalText?: string;
  newText?: string;
}

interface ApiError {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
  message?: string;
}

export default function CitationEditorPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const deleteDocumentMutation = useDeleteDocument();
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
  const [showSequenceWarning, setShowSequenceWarning] = useState(false);
  const [showDismissDropdown, setShowDismissDropdown] = useState(false);
  const [selectedChangesToDismiss, setSelectedChangesToDismiss] = useState<Set<string>>(new Set());

  // Detect out-of-sequence citations for Vancouver style
  const sequenceAnalysis = useMemo(() => {
    if (!data?.citations || data.citations.length === 0) {
      return { isSequential: true, outOfOrder: [], gaps: [], expectedOrder: [] };
    }

    // Only check for numeric citation styles (Vancouver, IEEE)
    const isNumericStyle = data.detectedStyle?.toLowerCase() === 'vancouver' ||
                          data.detectedStyle?.toLowerCase() === 'ieee' ||
                          data.citations.some((c: AnalysisCitation) => /^\s*[([]?\d+[)\]]?\s*$/.test(c.rawText?.replace(/[,\-–]/g, '')));

    if (!isNumericStyle) {
      return { isSequential: true, outOfOrder: [], gaps: [], expectedOrder: [] };
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
      return { isSequential: true, outOfOrder: [], gaps: [], expectedOrder: [] };
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

    // Also detect gaps (e.g., 1, 3, 4 — missing 2 after a deletion)
    const gaps: number[] = [];
    if (firstOccurrence.length > 0) {
      const sorted = [...firstOccurrence].sort((a, b) => a - b);
      // Should start from 1 and be contiguous
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i] !== i + 1) {
          gaps.push(i + 1); // Expected number that's missing
        }
      }
    }

    // Calculate expected order (sorted by first appearance)
    const expectedOrder = [...firstOccurrence].sort((a, b) => a - b);

    const hasIssues = outOfOrder.length > 0 || gaps.length > 0;

    return {
      isSequential: !hasIssues,
      outOfOrder,
      gaps,
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

      // Re-create citation-reference links before fetching analysis
      // This ensures any unlinked citations (e.g., after reorder/delete) get linked
      try {
        await api.post(`/citation-management/document/${documentId}/create-links`);
        console.log('[CitationEditorPage] Citation-reference links refreshed');
      } catch (linkErr) {
        console.log('[CitationEditorPage] Could not refresh links (non-critical):', linkErr);
      }

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
              changeId?: string;
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
                changeId: p.changeId,
                oldNumber: 0,
                newNumber: p.isOrphaned || p.changeType === 'deleted' ? null : (p.referenceNumber ?? null),
                oldText: p.originalText,
                newText: p.isOrphaned || p.changeType === 'deleted' ? p.originalText : p.newText,
                changeType: p.changeType as 'style' | 'renumber' | 'deleted' | 'unchanged' | 'reference_edit'
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
              .filter((p: PreviewCitation) => p.changeType !== 'unchanged')
              .map((p: PreviewCitation) => ({
                citationId: p.id,
                changeId: p.changeId,
                oldNumber: 0,
                newNumber: p.isOrphaned || p.changeType === 'deleted' ? null : p.referenceNumber,
                oldText: p.originalText,
                newText: p.isOrphaned || p.changeType === 'deleted' ? p.originalText : p.newText,
                changeType: p.changeType as 'style' | 'renumber' | 'deleted' | 'unchanged' | 'reference_edit'
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
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr.response?.data?.error?.message || apiErr.message || 'Conversion failed');
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
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr.response?.data?.error?.message || apiErr.message || 'Validation failed');
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

      // Use original filename
      link.download = data?.document.filename || 'export.docx';

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

  const handleReorderComplete = useCallback(async () => {
    console.log('[CitationEditorPage] handleReorderComplete called');

    // Reload data without showing full-page loading spinner (smooth update)
    await loadAnalysis(false);

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
          .filter((p: PreviewCitation) => p.changeType !== 'unchanged')
          .map((p: PreviewCitation) => ({
            citationId: p.id,
            changeId: p.changeId,
            oldNumber: 0, // Not used for display, we use oldText/newText
            newNumber: p.isOrphaned || p.changeType === 'deleted' ? null : p.referenceNumber,
            oldText: p.originalText,
            newText: p.isOrphaned || p.changeType === 'deleted' ? p.originalText : p.newText,
            changeType: p.changeType as 'style' | 'renumber' | 'deleted' | 'unchanged' | 'reference_edit'
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
  }, [loadAnalysis, documentId]);

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
              .filter((p: PreviewCitation) => p.changeType !== 'unchanged')
              .map((p: PreviewCitation) => ({
                citationId: p.id,
                changeId: p.changeId,
                oldNumber: 0,
                newNumber: p.isOrphaned || p.changeType === 'deleted' ? null : p.referenceNumber,
                oldText: p.originalText,
                newText: p.isOrphaned || p.changeType === 'deleted' ? p.originalText : p.newText,
                changeType: p.changeType as 'style' | 'renumber' | 'deleted' | 'unchanged' | 'reference_edit'
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
    } catch (err: unknown) {
      console.error('[CitationEditorPage] Resequence failed:', err);
      const apiErr = err as ApiError;
      setError(apiErr.response?.data?.error?.message || apiErr.message || 'Failed to resequence citations');
    } finally {
      setIsResequencing(false);
    }
  };

  // Handle dismiss/reset all changes
  const [isResetting, setIsResetting] = useState(false);
  const handleDismissChanges = async () => {
    if (!documentId) return;

    const confirmed = window.confirm(
      'This will revert ALL changes (reference edits, style conversions, reordering) to original values. Continue?'
    );
    if (!confirmed) return;

    setIsResetting(true);
    try {
      const response = await api.post(`/citation-management/document/${documentId}/reset-changes`);

      if (response.data.success) {
        toast.success(response.data.data?.message || 'All changes reverted successfully');
        // Clear local state
        setShowChangeHighlights(false);
        setRecentChanges([]);
        // Reload data from server to get reverted values
        await loadAnalysis();
      } else {
        toast.error(response.data.error?.message || 'Failed to reset changes');
      }
    } catch (err: unknown) {
      console.error('[CitationEditorPage] Reset changes failed:', err);
      const apiErr = err as ApiError;
      toast.error(apiErr.response?.data?.error?.message || 'Failed to reset changes');
    } finally {
      setIsResetting(false);
    }
  };

  // Handle dismissing selected changes only
  const handleDismissSelected = async () => {
    if (!documentId || selectedChangesToDismiss.size === 0) return;

    setIsResetting(true);
    try {
      // Map selected citationIds to their CitationChange IDs for the backend
      const changeIds = recentChanges
        .filter(c => selectedChangesToDismiss.has(c.citationId) && c.changeId)
        .map(c => c.changeId!);

      if (changeIds.length === 0) {
        toast.error('No valid change IDs found for selected changes');
        setIsResetting(false);
        return;
      }

      const response = await api.post(`/citation-management/document/${documentId}/dismiss-changes`, {
        changeIds
      });

      if (response.data.success) {
        const restored = response.data.data?.referencesRestored || 0;
        const dismissed = response.data.data?.dismissedCount || changeIds.length;
        toast.success(
          restored > 0
            ? `Restored ${restored} deleted reference(s) and dismissed ${dismissed} change(s)`
            : `Dismissed ${dismissed} change(s)`
        );
        // Remove dismissed changes from local state
        setRecentChanges(prev => prev.filter(c => !selectedChangesToDismiss.has(c.citationId)));
        setSelectedChangesToDismiss(new Set());
        setShowDismissDropdown(false);
        // Reload to get fresh state (critical for DELETE undos that restore references, citations, and HTML)
        await loadAnalysis();
      } else {
        toast.error(response.data.error?.message || 'Failed to dismiss changes');
      }
    } catch (err: unknown) {
      console.error('[CitationEditorPage] Dismiss changes failed:', err);
      const apiErr = err as ApiError;
      toast.error(apiErr.response?.data?.error?.message || 'Failed to dismiss changes');
    } finally {
      setIsResetting(false);
    }
  };

  // Toggle change selection
  const toggleChangeSelection = (citationId: string) => {
    setSelectedChangesToDismiss(prev => {
      const newSet = new Set(prev);
      if (newSet.has(citationId)) {
        newSet.delete(citationId);
      } else {
        newSet.add(citationId);
      }
      return newSet;
    });
  };

  // Select/deselect all changes
  const toggleSelectAll = () => {
    if (selectedChangesToDismiss.size === recentChanges.length) {
      setSelectedChangesToDismiss(new Set());
    } else {
      setSelectedChangesToDismiss(new Set(recentChanges.map(c => c.citationId)));
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
        <Button onClick={() => navigate('/citation/upload')}>
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
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Row 1: Navigation + Title + Actions */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/citation/upload')}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <h1 className="text-lg font-bold text-gray-900">Citation Management</h1>
              <span className="text-gray-300">·</span>
              <span className="text-sm text-gray-600 flex items-center">
                <FileText className="h-3 w-3 mr-1" />
                {data.document.filename}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="danger"
                size="sm"
                disabled={deleteDocumentMutation.isPending}
                onClick={() => {
                  if (!documentId) return;
                  if (confirm('Delete this document? This cannot be undone.')) {
                    deleteDocumentMutation.mutate(documentId, {
                      onSuccess: () => navigate('/citation/upload'),
                    });
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {deleteDocumentMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => loadAnalysis()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setShowExportModal(true)}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>

          {/* Row 2: Inline stats with colored labels */}
          <div className="flex items-center gap-3 pb-2 text-xs flex-wrap">
            <Badge variant="success">{data.detectedStyle}</Badge>
            <span className="inline-flex items-center gap-1">
              <span className="text-blue-500 font-medium">Citations</span>
              <span className="font-semibold text-blue-700">{data.document.statistics.totalCitations}</span>
            </span>
            <span className="text-gray-300">·</span>
            <span className="inline-flex items-center gap-1">
              <span className="text-green-500 font-medium">Refs</span>
              <span className="font-semibold text-green-700">{data.document.statistics.totalReferences}</span>
            </span>
            <span className="text-gray-300">·</span>
            <span className="inline-flex items-center gap-1">
              <span className="text-purple-500 font-medium">Words</span>
              <span className="font-semibold text-purple-700">{data.document.wordCount.toLocaleString()}</span>
            </span>
            <span className="text-gray-300">·</span>
            <span className="inline-flex items-center gap-1">
              <span className="text-indigo-500 font-medium">Size</span>
              <span className="font-semibold text-indigo-700">
                {data.document.fileSize != null
                  ? data.document.fileSize >= 1048576
                    ? `${(data.document.fileSize / 1048576).toFixed(1)} MB`
                    : `${(data.document.fileSize / 1024).toFixed(1)} KB`
                  : '—'}
              </span>
            </span>
            <span className="text-gray-300">·</span>
            <span className="inline-flex items-center gap-1">
              <span className="text-amber-500 font-medium">Time</span>
              <span className="font-semibold text-amber-700">
                {data.document.processingTime != null
                  ? data.document.processingTime >= 60000
                    ? `${Math.floor(data.document.processingTime / 60000)}m ${Math.round((data.document.processingTime % 60000) / 1000)}s`
                    : `${(data.document.processingTime / 1000).toFixed(1)}s`
                  : '—'}
              </span>
            </span>
          </div>

          {/* Row 3: Compact tools toolbar */}
          <div className="flex items-center gap-3 pb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Convert:</span>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="text-sm px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                disabled={converting}
              >
                <option value="APA">APA</option>
                <option value="MLA">MLA</option>
                <option value="Chicago">Chicago</option>
                <option value="Vancouver">Vancouver</option>
                <option value="IEEE">IEEE</option>
                <option value="Harvard">Harvard</option>
                <option value="AMA">AMA</option>
              </select>
              <Button
                size="sm"
                onClick={handleConvertStyle}
                disabled={converting || selectedStyle === data.detectedStyle}
              >
                {converting ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Converting...
                  </>
                ) : (
                  'Convert'
                )}
              </Button>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleValidateDOIs}
              disabled={validating}
            >
              {validating ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Validate DOIs
                </>
              )}
            </Button>
            {doiValidationResults && doiValidationResults.validated > 0 && (
              <button
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                onClick={() => setShowDoiValidationResults(true)}
              >
                Results: {doiValidationResults.valid}/{doiValidationResults.validated} valid
                {doiValidationResults.withDiscrepancies > 0 && `, ${doiValidationResults.withDiscrepancies} mismatches`}
              </button>
            )}
            <div className="h-4 w-px bg-gray-300" />
            <Button
              variant={showCitations ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowCitations(!showCitations)}
            >
              <Eye className="h-3 w-3 mr-1" />
              Citations ({data.citations.length})
            </Button>
            {(data.detectedStyle?.toLowerCase() === 'vancouver' ||
              data.detectedStyle?.toLowerCase() === 'ieee') && (
              <>
                <div className="h-4 w-px bg-gray-300" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSequenceWarning(true)}
                >
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  Check Seq
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-7xl">
        {error && (
          <Alert variant="error" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        {/* Processing indicator when document is being analyzed */}
        {['ANALYZING', 'QUEUED', 'PROCESSING'].includes(data.document.status) && pollCount < MAX_POLLS && (
          <div className="flex items-center gap-2 text-sm text-blue-600 mb-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Analyzing... auto-refreshing</span>
          </div>
        )}

        {/* Timeout message when polling stopped */}
        {['ANALYZING', 'QUEUED', 'PROCESSING'].includes(data.document.status) && pollCount >= MAX_POLLS && (
          <div className="flex items-center gap-2 text-sm text-amber-600 mb-3">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Analysis taking longer than expected — click Refresh</span>
          </div>
        )}

        {/* Sequence Warning/Success Banner - Show when user clicks Check Sequence */}
        {showSequenceWarning && !sequenceAnalysis.isSequential && (
          <Alert variant="warning" className="mb-6">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <ArrowUpDown className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-800">Citations Out of Sequence</p>
                  <p className="text-sm text-amber-700 mt-1">
                    {sequenceAnalysis.outOfOrder.length > 0 && (
                      <>Out of order: [{sequenceAnalysis.outOfOrder.join(', ')}]. </>
                    )}
                    {sequenceAnalysis.gaps.length > 0 && (
                      <>Missing numbers: [{sequenceAnalysis.gaps.join(', ')}]. </>
                    )}
                    For Vancouver style, citations should appear in numerical order (1, 2, 3...).
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSequenceWarning(false)}
                >
                  Dismiss
                </Button>
                <Button
                  onClick={handleResequence}
                  disabled={isResequencing}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
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
            </div>
          </Alert>
        )}

        {/* Success Banner - Citations are in sequence */}
        {showSequenceWarning && sequenceAnalysis.isSequential && (
          <Alert variant="success" className="mb-6">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-800">
                  All citations are in correct sequence.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSequenceWarning(false)}
              >
                Dismiss
              </Button>
            </div>
          </Alert>
        )}

        {/* In-Text Citations — Compact pill/chip view */}
        {showCitations && data.citations.length > 0 && (
          <div className="mb-4 border border-gray-200 rounded-lg bg-white p-3">
            <div className="flex flex-wrap gap-1.5">
              {data.citations.map((citation: AnalysisCitation) => {
                const hasNoReference = !citation.referenceNumber && (!citation.linkedReferenceNumbers || citation.linkedReferenceNumbers.length === 0) && !citation.isOrphaned;
                const refNums = (citation.linkedReferenceNumbers?.length ?? 0) > 0
                  ? citation.linkedReferenceNumbers!
                  : citation.referenceNumber ? [citation.referenceNumber] : [];

                return (
                  <button
                    key={citation.id}
                    onClick={() => {
                      if (refNums.length > 0) {
                        setActiveTab('references');
                        setTimeout(() => {
                          const refElement = document.getElementById(`ref-${refNums[0]}`);
                          refElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          refElement?.classList.add('ring-2', 'ring-blue-500');
                          setTimeout(() => refElement?.classList.remove('ring-2', 'ring-blue-500'), 2000);
                        }, 100);
                      }
                    }}
                    title={`¶${citation.paragraphIndex || citation.paragraphNumber || 0} · ${citation.citationType || 'citation'}${refNums.length > 0 ? ` · Ref ${refNums.join(', ')}` : ''}${citation.isOrphaned ? ' · Orphaned' : ''}${hasNoReference ? ' · No matching ref' : ''}`}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono font-medium transition-colors cursor-pointer ${
                      citation.isOrphaned
                        ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200'
                        : hasNoReference
                        ? 'bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200'
                        : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                    }`}
                  >
                    {citation.rawText}
                    {citation.isOrphaned && <span className="text-red-500 text-[10px]">✗</span>}
                    {hasNoReference && <span className="text-orange-500 text-[10px]">?</span>}
                  </button>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Linked</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> No match</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Orphaned</span>
              <span className="text-gray-400 ml-auto">Click to jump to reference</span>
            </div>
          </div>
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
            {recentChanges.length > 0 && (
            <div className="mb-2 flex justify-end">
                {/* Dismiss Changes Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowDismissDropdown(!showDismissDropdown)}
                      disabled={isResetting}
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      {isResetting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      {isResetting ? 'Dismissing...' : `Dismiss changes (${recentChanges.length})`}
                    </button>
                    {showDismissDropdown && (
                      <div className="absolute right-0 mt-1 w-72 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
                        <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
                          <span className="font-medium text-xs text-gray-700">Select changes to dismiss</span>
                          <button
                            onClick={() => setShowDismissDropdown(false)}
                            className="text-gray-400 hover:text-gray-600 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="px-2 py-1.5 border-b">
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded text-xs">
                            <Checkbox
                              checked={selectedChangesToDismiss.size === recentChanges.length}
                              onChange={toggleSelectAll}
                            />
                            <span className="font-medium">
                              {selectedChangesToDismiss.size === recentChanges.length ? 'Deselect All' : 'Select All'}
                            </span>
                          </label>
                        </div>
                        <div className="max-h-48 overflow-y-auto px-2 py-1">
                          {recentChanges.map((change) => (
                            <label
                              key={change.citationId}
                              className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 px-1 py-1 rounded"
                            >
                              <Checkbox
                                checked={selectedChangesToDismiss.has(change.citationId)}
                                onChange={() => toggleChangeSelection(change.citationId)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                {change.changeType === 'deleted' && change.citationId.startsWith('ref-delete-') ? (
                                  <div className="text-xs">
                                    <span className="text-red-500 line-through truncate">{change.oldText || 'Ref deleted'}</span>
                                  </div>
                                ) : (
                                  <div className="text-xs">
                                    <span className="text-green-600 font-medium">{change.newText || `(${change.newNumber})`}</span>
                                    <span className="text-gray-400 mx-0.5">&larr;</span>
                                    <span className="text-red-500 line-through">{change.oldText || `(${change.oldNumber})`}</span>
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                        <div className="px-2 py-2 border-t bg-gray-50 flex items-center gap-2">
                          <button
                            onClick={() => {
                              setShowDismissDropdown(false);
                              setSelectedChangesToDismiss(new Set());
                            }}
                            className="flex-1 text-xs text-gray-600 hover:text-gray-800 py-1 rounded border hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={handleDismissSelected}
                            disabled={selectedChangesToDismiss.size === 0 || isResetting}
                            className="flex-1 !text-xs !py-1"
                          >
                            Dismiss ({selectedChangesToDismiss.size})
                          </Button>
                          <button
                            onClick={() => {
                              setShowDismissDropdown(false);
                              handleDismissChanges();
                            }}
                            disabled={isResetting}
                            className="text-xs text-red-500 hover:text-red-700 hover:underline whitespace-nowrap disabled:opacity-50"
                          >
                            Reset all
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
            </div>
            )}
            <DocumentViewer
              fullText={data.document.fullText}
              fullHtml={data.document.fullHtml}
              citations={data.citations}
              references={data.references.map((r: AnalysisReference) => ({
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
            <p className="text-sm text-gray-500 mb-3">Drag and drop to reorder. All in-text citations update automatically.</p>
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
