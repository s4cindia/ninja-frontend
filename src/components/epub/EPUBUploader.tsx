import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { Alert } from '../ui/Alert';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';
import { uploadService } from '@/services/upload.service';
import { useJobPolling, JobData } from '@/hooks/useJobPolling';
import { detectFileType, getAcceptedMimeTypes, DocumentFileType } from '@/utils/fileUtils';

type UploadState = 'idle' | 'uploading' | 'queued' | 'processing' | 'complete' | 'error';

interface AuditSummary {
  jobId: string;
  fileName?: string;
  fileType: 'epub' | 'pdf';
  epubVersion?: string;
  pdfVersion?: string;
  isValid: boolean;
  accessibilityScore: number;
  issuesSummary: {
    total: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
}

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

const MAX_FILE_SIZE = 100 * 1024 * 1024;

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileNameRef = useRef<string>('');
  const fileTypeRef = useRef<DocumentFileType>('epub');

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
    };
    onUploadComplete?.(result);
  }, [onUploadComplete]);

  const handleJobError = useCallback((errorMsg: string) => {
    setState('error');
    setError(errorMsg);
    onError?.(errorMsg);
  }, [onError]);

  const { status: jobStatus, startPolling } = useJobPolling({
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
      setProgress(92);
    }
  }, [jobStatus]);

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

      let jobId: string;

      if (uploadResult.uploadMethod === 'direct' && uploadResult.jobId) {
        jobId = uploadResult.jobId;
      } else {
        if (!endpoint.auditFile) {
          throw new Error(`Missing auditFile endpoint for ${fileType}`);
        }
        const response = await api.post(endpoint.auditFile, {
          fileId: uploadResult.fileId,
        });
        const responseData = response.data.data || response.data;
        jobId = responseData.jobId || responseData.id;
      }

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
            <Button onClick={handleUpload} className="w-full max-w-xs">
              Start Accessibility Audit
            </Button>
          </div>
        )}

        {(state === 'uploading' || state === 'queued' || state === 'processing') && (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 mx-auto text-primary-600 animate-spin" />
            <p className="font-medium text-gray-900">
              {state === 'uploading' && 'Uploading file...'}
              {state === 'queued' && 'Audit queued...'}
              {state === 'processing' && 'Running accessibility audit...'}
            </p>
            <div className="max-w-xs mx-auto">
              <Progress value={progress} showLabel />
            </div>
            <p className="text-sm text-gray-500">
              {state === 'uploading' && 'Please wait while your file is being uploaded'}
              {state === 'queued' && 'Your audit is in the queue and will start shortly'}
              {state === 'processing' && 'Analyzing document structure and accessibility features'}
            </p>
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
