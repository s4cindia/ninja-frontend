import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, Circle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { Alert } from '../ui/Alert';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';
import { uploadService } from '@/services/upload.service';
import { tenantConfigService } from '@/services/tenant-config.service';
import { useJobPolling, JobData } from '@/hooks/useJobPolling';
import { detectFileType, getAcceptedMimeTypes, DocumentFileType } from '@/utils/fileUtils';
import type { AuditSummary } from '@/types/audit.types';

type UploadState = 'idle' | 'uploading' | 'queued' | 'processing' | 'complete' | 'error';

interface DocumentUploaderProps {
  acceptedFileTypes?: Array<'epub' | 'pdf'>;
  endpoints?: {
    epub?: {
      directUpload?: string;
      auditFile?: string;
    };
    pdf?: {
      directUpload?: string;
      auditFile?: string;
    };
  };
  onUploadComplete?: (result: AuditSummary) => void;
  onError?: (error: string) => void;
}

interface EPUBUploaderProps {
  onUploadComplete?: (result: AuditSummary) => void;
  onError?: (error: string) => void;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024;

function fmtTime(d: Date | null | undefined): string {
  if (!d) return '—';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function fmtDur(start: Date | null | undefined, end?: Date | null): string {
  if (!start) return '—';
  const ms = (end ?? new Date()).getTime() - start.getTime();
  if (ms < 0) return '—';
  if (ms < 1000) return '< 1s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  acceptedFileTypes = ['epub', 'pdf'],
  endpoints,
  onUploadComplete,
  onError,
}) => {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [workflowEnabled, setWorkflowEnabled] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileNameRef = useRef<string>('');
  const fileTypeRef = useRef<DocumentFileType>('epub');
  const workflowIdRef = useRef<string | undefined>(undefined);
  const uploadStartRef = useRef<Date | null>(null);
  const uploadEndRef = useRef<Date | null>(null);

  const handleJobComplete = useCallback((jobData: JobData) => {
    setState('complete');
    setProgress(100);

    const output = jobData.output || {};
    const fileType = fileTypeRef.current;

    const result: AuditSummary = {
      jobId: jobData.id,
      fileName: fileNameRef.current,
      fileType,
      epubVersion: fileType === 'epub' ? ((output.epubVersion as string) || '3.0') : undefined,
      pdfVersion: fileType === 'pdf' ? ((output.pdfVersion as string) || '1.7') : undefined,
      isValid: (output.isValid as boolean) ?? true,
      accessibilityScore: (output.accessibilityScore as number) || (output.score as number) || 0,
      issuesSummary: (output.issuesSummary as AuditSummary['issuesSummary']) || {
        total: 0,
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0,
      },
      // Use workflowId from upload response (stored in ref), not from job output
      workflowId: workflowIdRef.current,
    };
    onUploadComplete?.(result);
  }, [onUploadComplete]);

  const handleJobError = useCallback((errorMsg: string) => {
    setState('error');
    setError(errorMsg);
    onError?.(errorMsg);
  }, [onError]);

  const { status: jobStatus, data: jobData, startPolling } = useJobPolling({
    interval: 2000,
    onComplete: handleJobComplete,
    onError: handleJobError,
  });

  useEffect(() => {
    if (jobStatus === 'QUEUED') {
      setState('queued');
      setProgress(88);
    } else if (jobStatus === 'PROCESSING') {
      setState('processing');
      // Use the actual progress from the worker (20–88% page range), not a hardcoded value
      const jobProgress = jobData?.progress;
      if (typeof jobProgress === 'number' && jobProgress > 20) {
        setProgress(jobProgress);
      }
    }
  }, [jobStatus, jobData?.progress]);

  // Fetch workflow configuration on mount
  useEffect(() => {
    const fetchWorkflowConfig = async () => {
      try {
        const config = await tenantConfigService.getWorkflowConfig();
        setWorkflowEnabled(config.enabled);
      } catch (error) {
        console.error('[DocumentUploader] Failed to fetch workflow config:', error);
        // Default to false on error (manual audit button shown)
        setWorkflowEnabled(false);
      }
    };

    fetchWorkflowConfig();
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    const fileType = detectFileType(file);

    if (!fileType) {
      return 'Invalid file type';
    }

    if (!acceptedFileTypes.includes(fileType)) {
      const accepted = acceptedFileTypes.join(', ').toUpperCase();
      return `Only ${accepted} files are accepted`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`;
    }

    return null;
  }, [acceptedFileTypes]);

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }
    setSelectedFile(file);
    setError(null);
  }, [validateFile, onError]);

  // Auto-upload when workflow is enabled and file is selected
  useEffect(() => {
    if (selectedFile && workflowEnabled && state === 'idle') {
      // Small delay to show the selected file UI before upload starts
      const timer = setTimeout(() => {
        handleUpload();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile, workflowEnabled, state]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setState('uploading');
    uploadStartRef.current = new Date();
    setProgress(0);
    setError(null);
    fileNameRef.current = selectedFile.name;

    // Detect file type
    const fileType = detectFileType(selectedFile);
    if (!fileType) {
      setError('Unable to determine file type');
      setState('error');
      return;
    }

    // Store file type for callback
    fileTypeRef.current = fileType;

    // Determine endpoints based on file type
    const defaultEndpoints = {
      epub: {
        directUpload: '/epub/audit-upload',
        auditFile: '/epub/audit-file',
      },
      pdf: {
        directUpload: '/pdf/audit-upload',
        auditFile: '/pdf/audit-file',
      },
    };

    const endpoint = endpoints?.[fileType] || defaultEndpoints[fileType];

    try {
      const uploadResult = await uploadService.uploadFile(
        selectedFile,
        (uploadProgress) => {
          setProgress(Math.round(uploadProgress.percentage * 0.8));
        },
        endpoint.directUpload
      );

      setProgress(85);
      setState('queued');
      uploadEndRef.current = new Date();

      let jobId: string;
      let workflowId: string | undefined;

      if (uploadResult.uploadMethod === 'direct' && uploadResult.jobId) {
        jobId = uploadResult.jobId;
        // Extract workflowId from upload response
        workflowId = uploadResult.workflowId;
        console.log('[DocumentUploader] Upload response:', { jobId, workflowId });
      } else {
        if (!endpoint.auditFile) {
          throw new Error(`Missing auditFile endpoint for ${fileType}`);
        }
        const response = await api.post(endpoint.auditFile, {
          fileId: uploadResult.fileId,
        });
        const responseData = response.data.data || response.data;
        jobId = responseData.jobId || responseData.id;
        workflowId = responseData.workflowId;
        console.log('[DocumentUploader] Audit response:', { jobId, workflowId });
      }

      // Store workflowId in ref so it's available in handleJobComplete
      workflowIdRef.current = workflowId;

      if (jobId) {
        startPolling(jobId);
      } else {
        throw new Error('No job ID returned from audit endpoint');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      setState('error');
      onError?.(errorMessage);
    }
  };

  const handleReset = () => {
    setState('idle');
    setProgress(0);
    setError(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getUploadText = () => {
    if (acceptedFileTypes.length === 1) {
      const type = acceptedFileTypes[0].toUpperCase();
      return {
        title: `Upload ${type} for Accessibility Audit`,
        description: `Drag and drop your .${acceptedFileTypes[0]} file here, or click to browse`,
        acceptsText: `Accepts .${acceptedFileTypes[0]} files up to 100MB`
      };
    }

    const types = acceptedFileTypes.map(t => `.${t}`).join(' or ');
    const typesUpper = acceptedFileTypes.map(t => t.toUpperCase()).join(' or ');

    return {
      title: `Upload ${typesUpper} for Accessibility Audit`,
      description: `Drag and drop your ${types} file here, or click to browse`,
      acceptsText: `Accepts ${types} files up to 100MB`
    };
  };

  const uploadText = getUploadText();

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          'hover:border-primary-400 hover:bg-primary-50',
          isDragging && 'border-primary-500 bg-primary-100',
          selectedFile && 'border-primary-300 bg-primary-50',
          state === 'error' && 'border-red-300 bg-red-50',
          (state === 'uploading' || state === 'queued' || state === 'processing') && 'pointer-events-none opacity-75'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        {state === 'idle' && !selectedFile && (
          <>
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              {uploadText.title}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {uploadText.description}
            </p>
            <label className="cursor-pointer inline-flex items-center justify-center font-medium rounded-md transition-colors border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 text-sm">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={getAcceptedMimeTypes(acceptedFileTypes)}
                onChange={handleInputChange}
              />
              Browse Files
            </label>
            <p className="text-xs text-gray-400 mt-3">
              {uploadText.acceptsText}
            </p>
          </>
        )}

        {selectedFile && state === 'idle' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <FileText className="h-10 w-10 text-primary-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {!workflowEnabled && (
              <Button onClick={handleUpload} className="w-full max-w-xs">
                Start Accessibility Audit
              </Button>
            )}
            {workflowEnabled && (
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                  <p className="text-sm text-gray-600 font-medium">
                    Starting agentic workflow...
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  File will be automatically processed through the accessibility workflow
                </p>
              </div>
            )}
          </div>
        )}

        {(state === 'uploading' || state === 'queued' || state === 'processing') && (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 mx-auto text-primary-600 animate-spin" />
            <p className="font-medium text-gray-900">
              {state === 'uploading' && 'Uploading and auditing...'}
              {state === 'queued' && 'Audit queued...'}
              {state === 'processing' && 'Running accessibility audit...'}
            </p>
            <div className="max-w-xs mx-auto">
              <Progress value={progress} showLabel />
            </div>
            {state === 'processing' && (() => {
              const totalPages = jobData?.input?.totalPages as number | undefined;
              const validatorProgress = jobData?.input?.validatorProgress as Array<{ label: string; issuesFound: number }> | undefined;

              // Page extraction phase
              if (totalPages && totalPages > 0) {
                const currentPage = Math.min(Math.round(((progress - 20) / 68) * totalPages), totalPages);
                const extractionDone = currentPage >= totalPages;

                const VALIDATOR_LABELS = ['Structure & Tags', 'Alt Text', 'Color Contrast', 'Tables'];
                const doneNames = new Set((validatorProgress ?? []).map(v => v.label));

                return (
                  <div className="space-y-2">
                    {!extractionDone ? (
                      <p className="text-xs font-mono text-primary-700">
                        Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}
                      </p>
                    ) : (
                      <div className="text-left mx-auto max-w-xs space-y-1">
                        {VALIDATOR_LABELS.map((label) => {
                          const done = doneNames.has(label);
                          const stat = validatorProgress?.find(v => v.label === label);
                          const isNext = !done && (validatorProgress ?? []).length === VALIDATOR_LABELS.indexOf(label);
                          return (
                            <div key={label} className="flex items-center gap-2 text-xs">
                              {done ? (
                                <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                              ) : isNext ? (
                                <Loader2 className="h-3.5 w-3.5 text-primary-500 animate-spin shrink-0" />
                              ) : (
                                <Circle className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                              )}
                              <span className={done ? 'text-gray-700' : 'text-gray-400'}>
                                {label}
                                {done && stat && (
                                  <span className={stat.issuesFound > 0 ? 'text-amber-600' : 'text-green-600'}>
                                    {' — '}{stat.issuesFound} {stat.issuesFound === 1 ? 'issue' : 'issues'}
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })()}
            <p className="text-sm text-gray-500">
              {state === 'uploading' && 'Please wait while your file is being uploaded and audited'}
              {state === 'queued' && 'Your audit is in the queue and will start shortly'}
              {state === 'processing' && 'Analyzing document structure and accessibility features'}
            </p>
            {/* Timing table — visible once upload has started */}
            {uploadStartRef.current && (() => {
              type TR = { label: string; start: Date | null; end: Date | null; detail?: string; status: 'done' | 'running' | 'pending' };
              const vp = (jobData?.input?.validatorProgress ?? []) as Array<{ label: string; issuesFound: number; startedAt: string; completedAt: string }>;
              const auditStart = jobData?.startedAt ? new Date(jobData.startedAt) : null;
              const auditEnd   = jobData?.completedAt ? new Date(jobData.completedAt) : null;
              const totalPages = jobData?.input?.totalPages as number | undefined;
              const extractionDone = (totalPages ? progress >= 88 : false) || vp.length > 0 || auditEnd !== null;
              const extractionEnd  = vp.length > 0 ? new Date(vp[0].startedAt) : (extractionDone ? auditEnd : null);
              const VLABELS = ['Structure & Tags', 'Alt Text', 'Color Contrast', 'Tables'];
              const rows: TR[] = [
                { label: 'Upload',    start: uploadStartRef.current, end: uploadEndRef.current, status: uploadEndRef.current ? 'done' : 'running' },
                { label: 'Queue',     start: uploadEndRef.current,   end: auditStart,            status: auditStart ? 'done' : uploadEndRef.current ? 'running' : 'pending' },
                { label: 'Extraction', start: auditStart,            end: extractionEnd,          status: extractionDone ? 'done' : auditStart ? 'running' : 'pending' },
                ...VLABELS.map((lbl, idx) => {
                  const done = vp.find(v => v.label === lbl);
                  if (done) return { label: lbl, start: new Date(done.startedAt), end: new Date(done.completedAt), status: 'done' as const, detail: `${done.issuesFound} issue${done.issuesFound !== 1 ? 's' : ''}` };
                  const isRunning = extractionDone && vp.length === idx;
                  const prevEnd = vp.length > 0 ? new Date(vp[vp.length - 1].completedAt) : (isRunning ? auditStart : null);
                  return { label: lbl, start: isRunning ? prevEnd : null, end: null, status: isRunning ? 'running' as const : 'pending' as const };
                }),
              ];
              return (
                <div className="mt-2 border border-gray-100 rounded-md overflow-hidden text-left text-xs">
                  <div className="bg-gray-50 px-3 py-1 font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 text-[10px]">
                    Timing
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400">
                        <th className="px-3 py-1 text-left font-medium">Phase</th>
                        <th className="px-3 py-1 text-left font-medium">Started</th>
                        <th className="px-3 py-1 text-left font-medium">Ended</th>
                        <th className="px-3 py-1 text-left font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => (
                        <tr key={row.label} className="border-b border-gray-50 last:border-0">
                          <td className="px-3 py-1 font-medium text-gray-700">
                            {row.label}
                            {row.detail && <span className="ml-1 font-normal text-gray-400">· {row.detail}</span>}
                          </td>
                          <td className="px-3 py-1 font-mono text-gray-500">{fmtTime(row.start)}</td>
                          <td className="px-3 py-1 font-mono text-gray-500">
                            {row.status === 'running' ? <span className="text-primary-500 not-italic">running…</span> : row.status === 'pending' ? <span className="text-gray-300">—</span> : fmtTime(row.end)}
                          </td>
                          <td className="px-3 py-1 font-mono">
                            {row.status === 'pending'
                              ? <span className="text-gray-300">—</span>
                              : row.status === 'running'
                                ? <span className="text-primary-500">{fmtDur(row.start)}</span>
                                : <span className="text-gray-600">{fmtDur(row.start, row.end)}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {state === 'complete' && (
          <div className="space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
            <p className="font-medium text-gray-900">Audit Complete!</p>
            <p className="text-sm text-gray-500">
              Your document has been analyzed. View the results below.
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-red-600" />
            <p className="font-medium text-gray-900">Upload Failed</p>
            <Button variant="outline" onClick={handleReset}>
              Try Again
            </Button>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </div>
  );
};

/**
 * Backward-compatible wrapper for EPUBUploader that restricts to EPUB files only.
 * This maintains existing behavior for components that only need EPUB support.
 */
export const EPUBUploader: React.FC<EPUBUploaderProps> = (props) => {
  return <DocumentUploader {...props} acceptedFileTypes={['epub']} />;
};

export { DocumentUploader };
// Re-export AuditSummary for backward compatibility
export type { AuditSummary } from '@/types/audit.types';
