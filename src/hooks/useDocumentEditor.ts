/**
 * useDocumentEditor Hook
 *
 * Manages document loading, saving, version management, and auto-save logic
 * for the Document Editor page.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type * as XLSXTypes from 'xlsx';
import type { TipTapEditorRef } from '@/components/editor';
import { validatorService, type DocumentVersion } from '@/services/validator.service';
import { styleService } from '@/services/style.service';
import { integrityService } from '@/services/integrity.service';
import { plagiarismService } from '@/services/plagiarism.service';

export interface DocStats {
  fileSize?: number;
  wordCount?: number;
  processingTime?: number | null;
}

export function useDocumentEditor() {
  const { documentId } = useParams<{ documentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [documentName, setDocumentName] = useState(searchParams.get('name') || 'Document');
  const editorRef = useRef<TipTapEditorRef>(null);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [showValidatorPanel, setShowValidatorPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [content, setContent] = useState<string>('<p>Loading document...</p>');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [docStats, setDocStats] = useState<DocStats>({});
  const [contentType, setContentType] = useState<string>('UNKNOWN');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!documentId) { setError('No document ID provided'); setLoading(false); return; }
    const loadDocument = async () => {
      try {
        setLoading(true); setError(null);
        const result = await validatorService.getDocumentContent(documentId);
        setContent(result.content);
        setDocStats({ fileSize: result.fileSize, wordCount: result.wordCount, processingTime: result.processingTime });
        if (result.contentType) setContentType(result.contentType);
        if (result.fileName) setDocumentName(result.fileName);
        if (result.conversionWarnings?.length) toast.error(`Conversion warnings: ${result.conversionWarnings.join(', ')}`);
        setLoading(false);
      } catch {
        setError('Failed to load document. Please check if the document exists.');
        setLoading(false);
      }
    };
    loadDocument();
  }, [documentId]);

  const loadVersions = useCallback(async () => {
    if (!documentId) return;
    try {
      setLoadingVersions(true);
      const result = await validatorService.getDocumentVersions(documentId);
      setVersions(result.versions);
    } catch {
      toast.error('Failed to load version history');
    } finally { setLoadingVersions(false); }
  }, [documentId]);

  useEffect(() => { if (documentId && !loading && showVersionPanel) loadVersions(); }, [documentId, loading, showVersionPanel, loadVersions]);

  const handleSave = useCallback(async () => {
    if (!documentId || !editorRef.current) return;
    try {
      setSaving(true);
      const htmlContent = editorRef.current.getHTML();
      const result = await validatorService.saveDocumentContent(documentId, htmlContent);
      setLastSaved(new Date()); setHasUnsavedChanges(false);
      if (result.version) { setCurrentVersion(result.version); loadVersions(); }
    } catch { toast.error('Failed to save document'); }
    finally { setSaving(false); }
  }, [documentId, loadVersions]);

  useEffect(() => {
    if (!hasUnsavedChanges || !documentId) return;
    const timer = setTimeout(async () => { if (editorRef.current && hasUnsavedChanges) await handleSave(); }, 30000);
    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, documentId, handleSave]);

  const handleRestoreVersion = useCallback(async (versionId: string, versionNumber: number) => {
    if (!documentId) return;
    if (!window.confirm(`Restore to version ${versionNumber}? This will create a new version with the restored content.`)) return;
    try {
      setRestoring(true);
      const result = await validatorService.restoreDocumentVersion(documentId, versionId);
      const contentResult = await validatorService.getDocumentContent(documentId);
      setContent(contentResult.content);
      if (editorRef.current) editorRef.current.setContent(contentResult.content);
      setCurrentVersion(result.newVersion); setHasUnsavedChanges(false); loadVersions();
    } catch { toast.error('Failed to restore version. Please try again.'); }
    finally { setRestoring(false); }
  }, [documentId, loadVersions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleBack = () => navigate('/editorial');

  const toggleVersionPanel = () => {
    const next = !showVersionPanel;
    setShowVersionPanel(next);
    if (next) { setShowValidatorPanel(false); loadVersions(); }
  };
  const toggleValidatorPanel = () => {
    setShowValidatorPanel(!showValidatorPanel);
    if (!showValidatorPanel) { setShowVersionPanel(false); }
  };
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  const handleApplyFixToDocument = useCallback((originalText: string, fixText: string, source?: 'integrity' | 'plagiarism' | 'style') => {
    if (!editorRef.current) return;
    if (!editorRef.current.isTrackChangesEnabled()) editorRef.current.enableTrackChanges();
    const success = editorRef.current.replaceWithTracking(originalText, fixText, source || 'integrity');
    if (success) { setHasUnsavedChanges(true); toast.success('Fix applied with track changes'); }
    else { toast.error('Could not apply fix - text may have been modified'); }
  }, []);

  const handleContentChange = useCallback((_newContent: string) => { setHasUnsavedChanges(true); }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fn = file.name.toLowerCase();
    if (fn.endsWith('.docx') || fn.endsWith('.pdf')) toast.error('Please upload DOCX/PDF files through the upload page for proper processing.');
    else toast.error('Only DOCX and PDF files are supported.');
    e.target.value = '';
  }, []);

  const handleDownload = useCallback(async (mode: 'clean' | 'tracked' = 'clean') => {
    if (!documentId) return;
    try {
      setExporting(true);
      // Always save current editor HTML before export so the backend has the
      // latest content including track-change spans for "tracked" mode.
      if (editorRef.current) {
        try { await handleSave(); } catch { /* save error handled internally */ }
      }
      const blob = await validatorService.exportDocument(documentId, mode);
      const suffix = mode === 'tracked' ? '_tracked' : '_edited';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = documentName.replace(/\.docx$/i, '') + suffix + '.docx';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Document exported successfully');
    } catch { toast.error('Failed to export document. Please try again.'); }
    finally { setExporting(false); }
  }, [documentId, documentName, handleSave]);

  const handleConsolidatedReport = useCallback(async () => {
    if (!documentId) return;
    try {
      setExporting(true);
      // Fetch all three reports in parallel
      const [styleData, integrityData, plagiarismData] = await Promise.allSettled([
        styleService.getViolations(documentId, { take: 1000 }),
        integrityService.getIssues(documentId, { limit: 1000 }),
        plagiarismService.getMatches(documentId, { limit: 1000 }),
      ]);

      const XLSX: typeof XLSXTypes = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // Sheet 1: Style Validation
      const styleRows = styleData.status === 'fulfilled'
        ? styleData.value.violations.map((v, i) => ({
            '#': i + 1,
            'Title': v.title || '',
            'Category': v.category || '',
            'Severity': v.severity || '',
            'Status': v.status || '',
            'Original Text': v.originalText || '',
            'Suggested Text': v.suggestedText || '',
            'Description': v.description || '',
          }))
        : [{ '#': '', 'Title': 'No style validation data available', 'Category': '', 'Severity': '', 'Status': '', 'Original Text': '', 'Suggested Text': '', 'Description': '' }];
      const styleWs = XLSX.utils.json_to_sheet(styleRows);
      XLSX.utils.book_append_sheet(wb, styleWs, 'Style Validation');

      // Sheet 2: Integrity Check
      const integrityRows = integrityData.status === 'fulfilled'
        ? integrityData.value.issues.map((v, i) => ({
            '#': i + 1,
            'Title': v.title || '',
            'Type': v.checkType || '',
            'Severity': v.severity || '',
            'Status': v.status || '',
            'Description': v.description || '',
            'Original Text': v.originalText || '',
            'Suggested Fix': v.suggestedFix || '',
          }))
        : [{ '#': '', 'Title': 'No integrity check data available', 'Type': '', 'Severity': '', 'Status': '', 'Description': '', 'Original Text': '', 'Suggested Fix': '' }];
      const integrityWs = XLSX.utils.json_to_sheet(integrityRows);
      XLSX.utils.book_append_sheet(wb, integrityWs, 'Integrity Check');

      // Sheet 3: Plagiarism Check
      const plagiarismRows = plagiarismData.status === 'fulfilled'
        ? plagiarismData.value.matches.map((v, i) => ({
            '#': i + 1,
            'Match Type': v.matchType || '',
            'Classification': v.classification || '',
            'Similarity %': v.similarityScore != null ? Math.round(v.similarityScore * 100) : '',
            'Confidence %': v.confidence != null ? Math.round(v.confidence * 100) : '',
            'Status': v.status || '',
            'Source Text': v.sourceText || '',
            'Matched Text': v.matchedText || '',
            'AI Reasoning': v.aiReasoning || '',
          }))
        : [{ '#': '', 'Match Type': 'No plagiarism check data available', 'Classification': '', 'Similarity %': '', 'Confidence %': '', 'Status': '', 'Source Text': '', 'Matched Text': '', 'AI Reasoning': '' }];
      const plagiarismWs = XLSX.utils.json_to_sheet(plagiarismRows);
      XLSX.utils.book_append_sheet(wb, plagiarismWs, 'Plagiarism Check');

      // Auto-size columns for each sheet
      [styleWs, integrityWs, plagiarismWs].forEach(ws => {
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        const colWidths: number[] = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          let max = 10;
          for (let r = range.s.r; r <= range.e.r; r++) {
            const cell = ws[XLSX.utils.encode_cell({ r, c })];
            if (cell?.v) max = Math.max(max, Math.min(String(cell.v).length + 2, 50));
          }
          colWidths.push(max);
        }
        ws['!cols'] = colWidths.map(w => ({ wch: w }));
      });

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consolidated-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Consolidated report downloaded');
    } catch {
      toast.error('Failed to generate consolidated report');
    } finally {
      setExporting(false);
    }
  }, [documentId]);

  return {
    editorRef, documentId, documentName, content, docStats, contentType,
    loading, saving, exporting, error, hasUnsavedChanges, lastSaved,
    showVersionPanel, showValidatorPanel, isFullscreen,
    versions, loadingVersions, currentVersion, restoring,
    handleBack, handleSave, handleDownload, handleConsolidatedReport, handleFileUpload,
    handleContentChange, handleApplyFixToDocument, handleRestoreVersion,
    toggleVersionPanel, toggleValidatorPanel, toggleFullscreen,
  };
}
