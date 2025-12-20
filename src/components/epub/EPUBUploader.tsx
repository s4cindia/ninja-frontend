import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { Alert } from '../ui/Alert';
import { cn } from '@/utils/cn';

type UploadState = 'idle' | 'uploading' | 'auditing' | 'complete' | 'error';

interface AuditSummary {
  jobId: string;
  epubVersion: string;
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

interface EPUBUploaderProps {
  onUploadComplete?: (result: AuditSummary) => void;
  onError?: (error: string) => void;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export const EPUBUploader: React.FC<EPUBUploaderProps> = ({
  onUploadComplete,
  onError,
}) => {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.epub')) {
      return 'Only .epub files are accepted';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`;
    }
    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }
    setSelectedFile(file);
    setError(null);
  }, [onError]);

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

    let progressInterval: ReturnType<typeof setInterval> | null = null;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/v1/epub/audit-upload', {
        method: 'POST',
        body: formData,
      });

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      setProgress(95);
      setState('auditing');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }

      const result: AuditSummary = await response.json();
      setProgress(100);
      setState('complete');
      onUploadComplete?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      setState('error');
      onError?.(errorMessage);
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
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

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          'hover:border-primary-400 hover:bg-primary-50',
          isDragging && 'border-primary-500 bg-primary-100',
          selectedFile && 'border-primary-300 bg-primary-50',
          state === 'error' && 'border-red-300 bg-red-50',
          (state === 'uploading' || state === 'auditing') && 'pointer-events-none opacity-75'
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
              Upload EPUB for Accessibility Audit
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Drag and drop your .epub file here, or click to browse
            </p>
            <label className="cursor-pointer inline-flex items-center justify-center font-medium rounded-md transition-colors border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 text-sm">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".epub"
                onChange={handleInputChange}
              />
              Browse Files
            </label>
            <p className="text-xs text-gray-400 mt-3">
              Accepts .epub files up to 100MB
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

        {(state === 'uploading' || state === 'auditing') && (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 mx-auto text-primary-600 animate-spin" />
            <p className="font-medium text-gray-900">
              {state === 'uploading' ? 'Uploading EPUB...' : 'Running accessibility audit...'}
            </p>
            <div className="max-w-xs mx-auto">
              <Progress value={progress} showLabel />
            </div>
            <p className="text-sm text-gray-500">
              {state === 'auditing' 
                ? 'Analyzing document structure and accessibility features' 
                : 'Please wait while your file is being uploaded'}
            </p>
          </div>
        )}

        {state === 'complete' && (
          <div className="space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
            <p className="font-medium text-gray-900">Audit Complete!</p>
            <p className="text-sm text-gray-500">
              Your EPUB has been analyzed. View the results below.
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
