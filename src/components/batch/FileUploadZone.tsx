import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function FileUploadZone({ onFilesSelected, disabled }: FileUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const epubFiles = acceptedFiles.filter((file) =>
        file.name.toLowerCase().endsWith('.epub')
      );

      if (epubFiles.length !== acceptedFiles.length) {
        toast.error('Only EPUB files are supported');
      }

      if (epubFiles.length > 0) {
        onFilesSelected(epubFiles);
      }
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/epub+zip': ['.epub'],
    },
    multiple: true,
    disabled,
    maxSize: 100 * 1024 * 1024,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
        transition-colors duration-200
        ${
          isDragActive
            ? 'border-sky-500 bg-sky-50'
            : 'border-gray-300 hover:border-gray-400'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} aria-label="Upload EPUB files" />

      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" aria-hidden="true" />

      <p className="text-lg font-medium text-gray-900 mb-2">
        {isDragActive ? 'Drop files here' : 'Drag & drop EPUB files'}
      </p>

      <p className="text-sm text-gray-600 mb-4">or click to browse</p>

      <p className="text-xs text-gray-500">Supports: .epub files up to 100MB each</p>
    </div>
  );
}
