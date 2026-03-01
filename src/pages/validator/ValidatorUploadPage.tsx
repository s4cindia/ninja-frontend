import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, FileText, X, AlertCircle, ArrowLeft, FileCheck, ShieldCheck, Search, BookOpen } from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface ValidatorStats {
  totalDocuments: number;
  totalWords: number;
  integrityIssues: number;
  plagiarismMatches: number;
  styleViolations: number;
  recentDocuments: { id: string; originalName: string; wordCount: number; contentType: string; createdAt: string }[];
}

export function ValidatorUploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState<ValidatorStats | null>(null);

  useEffect(() => {
    api.get('/validator/stats')
      .then(r => setStats(r.data?.data))
      .catch((err) => { console.debug('[ValidatorUpload] Failed to load stats:', err?.message); });
  }, []);

  const validateFile = (file: File): string | null => {
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.docx') && !fileName.endsWith('.pdf')) {
      return 'Only DOCX and PDF files are supported';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`;
    }
    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validationError = validateFile(droppedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setFile(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setFile(selectedFile);
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setError(null);
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload using the api client (handles auth automatically)
      const response = await api.post('/validator/upload', formData);

      // Navigate to the appropriate viewer based on file type
      if (response.data?.data?.documentId) {
        const documentId = response.data.data.documentId;
        const isPdf = file.name.toLowerCase().endsWith('.pdf');

        if (isPdf) {
          // PDF files: Navigate to PDF viewer (no editing, just viewing)
          navigate(`/validator/pdf/${documentId}?name=${encodeURIComponent(file.name)}`);
        } else {
          // DOCX files: Navigate to document editor
          navigate(`/validator/editor/${documentId}`);
        }
      } else {
        navigate('/editorial');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/editorial"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Editorial Services
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">
            Validator - Upload Document
          </h1>
          <p className="text-gray-500 mt-1">
            Upload a DOCX or PDF file to edit with version control and track changes
          </p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Upload className={`w-12 h-12 mx-auto mb-4 ${
                isDragging ? 'text-emerald-500' : 'text-gray-400'
              }`} />
              <p className="text-lg font-medium text-gray-700 mb-1">
                Drop your DOCX or PDF file here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse
              </p>
              <label className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 mr-2" />
                Select File
                <input
                  type="file"
                  accept=".docx,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-400 mt-4">
                Supported formats: DOCX, PDF (up to 50MB)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected File */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <FileText className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isUploading ? 'Uploading...' : 'Upload and Open Editor'}
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="mt-8 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border shadow-sm p-4 text-center">
                <FileCheck className="w-5 h-5 mx-auto mb-1.5 text-emerald-500" />
                <p className="text-2xl font-semibold text-gray-900">{stats.totalDocuments}</p>
                <p className="text-xs text-gray-500">Documents</p>
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-4 text-center">
                <BookOpen className="w-5 h-5 mx-auto mb-1.5 text-blue-500" />
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.totalWords >= 1000 ? `${(stats.totalWords / 1000).toFixed(1)}k` : stats.totalWords}
                </p>
                <p className="text-xs text-gray-500">Total Words</p>
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-4 text-center">
                <ShieldCheck className="w-5 h-5 mx-auto mb-1.5 text-amber-500" />
                <p className="text-2xl font-semibold text-gray-900">{stats.integrityIssues + stats.styleViolations}</p>
                <p className="text-xs text-gray-500">Issues Found</p>
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-4 text-center">
                <Search className="w-5 h-5 mx-auto mb-1.5 text-purple-500" />
                <p className="text-2xl font-semibold text-gray-900">{stats.plagiarismMatches}</p>
                <p className="text-xs text-gray-500">Similarity Matches</p>
              </div>
            </div>

            {stats.recentDocuments.length > 0 && (
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Documents</h3>
                <div className="space-y-2">
                  {stats.recentDocuments.map((doc) => (
                    <Link
                      key={doc.id}
                      to={`/validator/editor/${doc.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700 truncate group-hover:text-emerald-600">
                          {doc.originalName}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {doc.wordCount > 0 ? `${doc.wordCount.toLocaleString()} words` : ''}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ValidatorUploadPage;
