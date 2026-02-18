/**
 * Citation Intelligence Tool - Upload Page
 * "One-click manuscript analysis"
 */

import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useUploadManuscript } from '@/hooks/useCitationIntel';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import toast from 'react-hot-toast';

// Type for recent citation jobs
interface RecentJob {
  jobId: string;
  documentId: string;
  filename: string;
  createdAt: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export default function CitationUploadPage() {
  const navigate = useNavigate();
  const uploadMutation = useUploadManuscript();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch recent citation jobs
  const { data: recentJobs } = useQuery({
    queryKey: ['recent-citation-jobs'],
    queryFn: async () => {
      const response = await api.get('/citation-management/jobs/recent?limit=3');
      return response.data.data;
    },
    staleTime: 30000, // 30 seconds
  });


  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/pdf': ['.pdf'],
    },
    multiple: false,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const handleUpload = async (e?: React.MouseEvent) => {
    // Prevent dropzone from opening file picker
    if (e) {
      e.stopPropagation();
    }

    if (!selectedFile) return;

    try {
      const result = await uploadMutation.mutateAsync(selectedFile);
      console.log('Upload result:', result);
      console.log('Upload result stringified:', JSON.stringify(result, null, 2));
      console.log('JobId:', result?.jobId);
      console.log('Has jobId?', !!result?.jobId);

      // Use documentId for navigation (sync processing returns documentId directly)
      const navigateId = result?.documentId || result?.jobId;
      if (navigateId) {
        console.log('Navigating to:', `/citation/editor/${navigateId}`);
        navigate(`/citation/editor/${navigateId}`);
      } else {
        console.error('No documentId/jobId in response:', result);
        toast.error('Upload succeeded but no document ID returned');
      }
    } catch (error) {
      console.error('Upload error:', error);
      // Error toast is already shown by the mutation
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return then.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Citation Intelligence Platform
          </h1>
          <p className="text-lg text-gray-600">
            Upload your manuscript and get instant citation diagnostics in seconds
          </p>
        </div>

        {/* Upload Card */}
        <Card className="p-8 mb-8">
          <div
            {...getRootProps()}
            className={`border-3 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />

            <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />

            {isDragActive ? (
              <p className="text-lg text-blue-600 font-medium">Drop manuscript here...</p>
            ) : selectedFile ? (
              <div>
                <p className="text-lg text-gray-900 font-medium mb-2">
                  Selected: {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button onClick={(e) => handleUpload(e)} disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? 'Uploading...' : 'Analyze Manuscript'}
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-lg text-gray-700 font-medium mb-2">
                  📄 Drag & drop manuscript here
                </p>
                <p className="text-sm text-gray-500 mb-4">or click to browse</p>
                <p className="text-xs text-gray-400">
                  Supported: DOCX, PDF • Max size: 50MB
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Uploads */}
        {recentJobs && recentJobs.length > 0 && (
          <Card className="p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Uploads</h2>
            <div className="space-y-3">
              {(recentJobs as RecentJob[]).map((job) => (
                <Link
                  key={job.jobId}
                  to={`/citation/analysis/${job.documentId}`}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{job.filename}</p>
                      <p className="text-xs text-gray-500">{formatTimeAgo(job.createdAt)}</p>
                    </div>
                  </div>
                  {job.status === 'COMPLETED' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : job.status === 'PROCESSING' ? (
                    <Clock className="h-4 w-4 text-blue-500 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* Features Preview */}
        <div className="mt-12 grid grid-cols-2 gap-6 text-center max-w-md mx-auto">
          <div>
            <div className="text-3xl font-bold text-green-600 mb-2">95%</div>
            <p className="text-sm text-gray-600">DOI Recovery Rate</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-600 mb-2">6</div>
            <p className="text-sm text-gray-600">Issue Types Detected</p>
          </div>
        </div>
      </div>
    </div>
  );
}
