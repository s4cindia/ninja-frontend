import React, { useState, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { FileText, Upload, Check, X, Loader2 } from 'lucide-react';
import { SUPPORTED_FORMATS, SupportedFormat } from './fileFormats';

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  format: SupportedFormat | 'UNKNOWN';
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  url?: string;
}

export interface FileUploaderProps {
  acceptedFormats?: SupportedFormat[];
  multiple?: boolean;
  maxFileSize?: number;
  maxFiles?: number;
  onFilesSelected?: (files: UploadedFile[]) => void;
  onUploadProgress?: (fileId: string, progress: number) => void;
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (fileId: string, error: string) => void;
  onRemoveFile?: (fileId: string) => void;
  uploadFile?: (file: File, onProgress: (progress: number) => void) => Promise<string>;
  className?: string;
  disabled?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  acceptedFormats = ['PDF', 'EPUB', 'DOCX', 'TXT', 'XML'],
  multiple = false,
  maxFileSize = 50 * 1024 * 1024,
  maxFiles = 10,
  onFilesSelected,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  onRemoveFile,
  uploadFile,
  className = '',
  disabled = false,
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onFilesSelectedRef = useRef(onFilesSelected);
  onFilesSelectedRef.current = onFilesSelected;

  const generateId = () => 
    typeof crypto !== 'undefined' && crypto.randomUUID 
      ? `file-${crypto.randomUUID()}` 
      : `file-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  const detectFormat = (file: File): SupportedFormat | 'UNKNOWN' => {
    const extension = file.name.toLowerCase().split('.').pop();
    for (const [format, config] of Object.entries(SUPPORTED_FORMATS)) {
      if (config.extension === `.${extension}` || config.mimeType === file.type) {
        return format as SupportedFormat;
      }
    }
    return 'UNKNOWN';
  };

  const validateFile = useCallback((file: File): string | null => {
    const format = detectFormat(file);
    
    if (format === 'UNKNOWN' || !acceptedFormats.includes(format)) {
      return `Unsupported format. Accepted: ${acceptedFormats.join(', ')}`;
    }
    
    if (file.size > maxFileSize) {
      return `File too large. Maximum: ${(maxFileSize / 1024 / 1024).toFixed(0)}MB`;
    }
    
    return null;
  }, [acceptedFormats, maxFileSize]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const handleFiles = useCallback((selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    
    setFiles(prevFiles => {
      if (multiple && prevFiles.length + fileArray.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return prevFiles;
      }

      const newFiles: UploadedFile[] = fileArray.map(file => {
        const error = validateFile(file);
        return {
          id: generateId(),
          file,
          name: file.name,
          size: file.size,
          format: detectFormat(file),
          status: error ? 'error' : 'pending',
          progress: 0,
          error: error || undefined,
        };
      });

      const updatedFiles = multiple ? [...prevFiles, ...newFiles] : newFiles.slice(0, 1);
      onFilesSelectedRef.current?.(updatedFiles);
      return updatedFiles;
    });
  }, [multiple, maxFiles, validateFile]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, handleFiles]);

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemove = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    onRemoveFile?.(fileId);
  };

  const handleUpload = useCallback(async (uploadedFile: UploadedFile) => {
    if (!uploadFile || uploadedFile.status !== 'pending') return;

    setFiles(prev => prev.map(f => 
      f.id === uploadedFile.id ? { ...f, status: 'uploading' as const } : f
    ));

    try {
      const url = await uploadFile(uploadedFile.file, (progress) => {
        setFiles(prev => prev.map(f => 
          f.id === uploadedFile.id ? { ...f, progress } : f
        ));
        onUploadProgress?.(uploadedFile.id, progress);
      });

      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, status: 'success' as const, progress: 100, url } : f
      ));
      onUploadComplete?.({ ...uploadedFile, status: 'success', progress: 100, url });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload failed';
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, status: 'error' as const, error: errorMsg } : f
      ));
      onUploadError?.(uploadedFile.id, errorMsg);
    }
  }, [uploadFile, onUploadProgress, onUploadComplete, onUploadError]);

  const handleUploadAll = useCallback(() => {
    setFiles(currentFiles => {
      currentFiles.filter(f => f.status === 'pending').forEach(handleUpload);
      return currentFiles;
    });
  }, [handleUpload]);

  const acceptString = acceptedFormats
    .map(f => SUPPORTED_FORMATS[f].extension)
    .join(',');

  const renderStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return <Upload className="w-4 h-4 text-gray-400" aria-label="Pending" />;
      case 'uploading':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" aria-label="Uploading" />;
      case 'success':
        return <Check className="w-4 h-4 text-green-500" aria-label="Success" />;
      case 'error':
        return <X className="w-4 h-4 text-red-500" aria-label="Error" />;
    }
  };

  return (
    <div className={clsx('w-full', className)}>
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={`File upload area. ${isDragging ? 'Drop files here' : 'Click or drag files to upload'}. Accepted formats: ${acceptedFormats.join(', ')}. Maximum size: ${formatSize(maxFileSize)}`}
        aria-disabled={disabled}
        className={clsx(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer',
          'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptString}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
          aria-hidden="true"
        />
        
        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" aria-hidden="true" />
        <p className="text-gray-600 mb-1">
          {isDragging ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-gray-400 text-sm">
          or click to browse
        </p>
        <p className="text-gray-400 text-xs mt-2">
          Supported: {acceptedFormats.join(', ')} • Max {formatSize(maxFileSize)}
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2" role="list" aria-label="Uploaded files">
          {files.map(file => (
            <div
              key={file.id}
              role="listitem"
              className={clsx(
                'flex items-center p-3 rounded-lg border',
                file.status === 'error' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
              )}
            >
              {renderStatusIcon(file.status)}
              
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatSize(file.size)} • {file.format}
                  {file.error && <span className="text-red-500 ml-2">{file.error}</span>}
                </p>
                
                {file.status === 'uploading' && (
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5" role="progressbar" aria-valuenow={file.progress} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="ml-2 flex items-center space-x-2">
                {file.status === 'pending' && uploadFile && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleUpload(file); }}
                    className="text-blue-500 hover:text-blue-700 text-sm focus:outline-none focus:underline"
                    aria-label={`Upload ${file.name}`}
                  >
                    Upload
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemove(file.id); }}
                  className="text-gray-400 hover:text-red-500 focus:outline-none focus:text-red-500"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {uploadFile && files.some(f => f.status === 'pending') && (
            <button
              type="button"
              onClick={handleUploadAll}
              className="w-full mt-2 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Upload All ({files.filter(f => f.status === 'pending').length} files)
            </button>
          )}
        </div>
      )}
    </div>
  );
};
