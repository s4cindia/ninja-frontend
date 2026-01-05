import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { FileUploadZone } from '@/components/files/FileUploadZone';
import { FilesList } from '@/components/files/FilesList';
import { useFiles, useUploadFile, useDeleteFile, useTriggerAudit } from '@/hooks/useFiles';
import type { FileItem } from '@/services/files.service';

export function Files() {
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  
  const { data: filesData, isLoading, error } = useFiles();
  const uploadMutation = useUploadFile();
  const deleteMutation = useDeleteFile();
  const auditMutation = useTriggerAudit();

  const handleUpload = async (file: File) => {
    try {
      await uploadMutation.mutateAsync(file);
      setShowUpload(false);
    } catch {
      // Error handled by mutation state
    }
  };

  const handleView = (file: FileItem) => {
    navigate(`/validation/${file.id}`);
  };

  const handleDelete = async (file: FileItem) => {
    if (window.confirm(`Delete "${file.originalName}"?`)) {
      await deleteMutation.mutateAsync(file.id);
    }
  };

  const handleAudit = async (file: FileItem) => {
    try {
      const result = await auditMutation.mutateAsync(file.id);
      navigate(`/epub?jobId=${result.jobId}`);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Files' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Files</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload and manage your documents for accessibility validation
          </p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)}>
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          Upload File
        </Button>
      </div>

      {showUpload && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Document</h2>
          <FileUploadZone 
            onUpload={handleUpload} 
            disabled={uploadMutation.isPending} 
          />
          {uploadMutation.isPending && (
            <p className="mt-2 text-sm text-gray-500">Uploading...</p>
          )}
          {uploadMutation.isError && (
            <Alert variant="error" className="mt-4">
              Upload failed. Please try again.
            </Alert>
          )}
        </div>
      )}

      {error && (
        <Alert variant="error">
          Failed to load files. Please refresh the page.
        </Alert>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Your Files</h2>
        </div>
        <FilesList
          files={filesData?.files || []}
          isLoading={isLoading}
          onView={handleView}
          onDelete={handleDelete}
          onAudit={handleAudit}
        />
      </div>
    </div>
  );
}
