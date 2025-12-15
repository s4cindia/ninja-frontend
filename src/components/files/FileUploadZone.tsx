import React, { useCallback, useState, useRef, useMemo } from 'react';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FileUploadZoneProps {
  onUpload: (file: File) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024;

export function FileUploadZone({
  onUpload,
  accept = '.pdf,.epub,.docx',
  maxSize = DEFAULT_MAX_SIZE,
  disabled = false,
  className,
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validExtensions = useMemo(() => {
    return accept
      .split(',')
      .map(ext => ext.trim().toLowerCase())
      .filter(ext => ext.startsWith('.'));
  }, [accept]);

  const validateFile = useCallback((file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(extension)) {
      return `Invalid file type. Accepted: ${validExtensions.join(', ')}`;
    }

    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / 1024 / 1024);
      return `File too large. Maximum size: ${maxMB}MB`;
    }

    return null;
  }, [maxSize, validExtensions]);

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
    onUpload(file);
  }, [validateFile, onUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [disabled, handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const displayAcceptedTypes = useMemo(() => {
    return validExtensions
      .map(ext => ext.replace('.', '').toUpperCase())
      .join(', ');
  }, [validExtensions]);

  return (
    <div className={cn('w-full', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragOver && !disabled && 'border-primary-500 bg-primary-50',
          !isDragOver && !disabled && 'border-gray-300 hover:border-gray-400',
          disabled && 'border-gray-200 bg-gray-50 cursor-not-allowed',
          error && 'border-red-300 bg-red-50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Upload file"
        />

        {selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            <File className="h-8 w-8 text-primary-500" aria-hidden="true" />
            <div className="text-left">
              <p className="font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearSelection();
              }}
              className="p-1 hover:bg-gray-100 rounded"
              aria-label="Clear file selection"
            >
              <X className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <>
            <Upload 
              className={cn(
                'mx-auto h-12 w-12',
                isDragOver ? 'text-primary-500' : 'text-gray-400'
              )} 
              aria-hidden="true"
            />
            <p className="mt-4 text-sm font-medium text-gray-900">
              {isDragOver ? 'Drop file here' : 'Drag and drop your file here'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              or click to browse
            </p>
            <p className="mt-2 text-xs text-gray-400">
              {displayAcceptedTypes} up to {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-600" role="alert">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
}
