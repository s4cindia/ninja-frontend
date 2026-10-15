import { useCallback } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface PdfBatchFileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024;

export function PdfBatchFileUploadZone({ onFilesSelected, disabled }: PdfBatchFileUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const pdfFiles = acceptedFiles.filter((file) => file.name.toLowerCase().endsWith('.pdf'));

      if (pdfFiles.length !== acceptedFiles.length) {
        toast.error('Only PDF files are supported');
      }

      if (pdfFiles.length > 0) {
        onFilesSelected(pdfFiles);
      }
    },
    [onFilesSelected]
  );

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    rejections.forEach((rejection) => {
      const { file, errors } = rejection;
      errors.forEach((e) => {
        if (e.code === 'file-too-large') {
          toast.error(`${file.name}: File is too large (max 500MB)`);
        } else if (e.code === 'file-invalid-type') {
          toast.error(`${file.name}: Invalid file type (only PDF files allowed)`);
        } else {
          toast.error(`${file.name}: ${e.message}`);
        }
      });
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true,
    disabled,
    maxSize: MAX_FILE_SIZE,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
        transition-colors duration-200
        ${isDragActive ? 'border-sky-500 bg-sky-50' : 'border-gray-300 hover:border-gray-400'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} aria-label="Upload PDF files" />

      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" aria-hidden="true" />

      <p className="text-lg font-medium text-gray-900 mb-2">
        {isDragActive ? 'Drop files here' : 'Drag & drop PDF files'}
      </p>

      <p className="text-sm text-gray-600 mb-4">or click to browse</p>

      <p className="text-xs text-gray-500">Supports: .pdf files up to 500MB each, up to 50 per batch</p>
    </div>
  );
}
