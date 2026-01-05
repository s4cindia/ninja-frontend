import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, PlayCircle, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { FileUploadZone } from '@/components/files/FileUploadZone';
import { FilesList } from '@/components/files/FilesList';
import { useFiles, useUploadFile, useDeleteFile, useTriggerAudit, useBulkDeleteFiles, useBulkAuditFiles } from '@/hooks/useFiles';
import { cn } from '@/utils/cn';
import { isEpubFile } from '@/utils/fileUtils';
import toast from 'react-hot-toast';
import type { FileItem } from '@/services/files.service';

export function Files() {
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  const { data: filesData, isLoading, error } = useFiles(undefined, {
    autoRefreshWhileProcessing: true,
  });
  const uploadMutation = useUploadFile();
  const deleteMutation = useDeleteFile();
  const auditMutation = useTriggerAudit();
  const bulkDeleteMutation = useBulkDeleteFiles();
  const bulkAuditMutation = useBulkAuditFiles();

  const canBulkAudit = useMemo(() => {
    if (selectedFiles.length === 0) return false;
    const selectedFileObjects = filesData?.files.filter(f => selectedFiles.includes(f.id)) || [];
    return selectedFileObjects.every(f =>
      (f.status === 'UPLOADED' || f.status === 'PROCESSED') && isEpubFile(f)
    );
  }, [selectedFiles, filesData?.files]);

  const handleUpload = async (file: File) => {
    try {
      await uploadMutation.mutateAsync(file);
      setShowUpload(false);
    } catch {
      // Error handled by mutation state
    }
  };

  const handleView = (file: FileItem) => {
    if (file.latestJobId) {
      navigate(`/epub?jobId=${file.latestJobId}`);
    } else {
      navigate(`/validation/${file.id}`);
    }
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

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedFiles.length} file(s)? This cannot be undone.`)) {
      return;
    }

    try {
      const result = await bulkDeleteMutation.mutateAsync(selectedFiles);
      toast.success(`Deleted ${result.deleted} file(s)`);
      if (result.failed > 0) {
        toast.error(`Failed to delete ${result.failed} file(s)`);
      }
      setSelectedFiles([]);
    } catch {
      toast.error('Bulk delete failed');
    }
  };

  const handleBulkAudit = async () => {
    try {
      const result = await bulkAuditMutation.mutateAsync(selectedFiles);
      toast.success(`Started ${result.successful} audit(s)`);
      if (result.failed > 0) {
        toast.error(`Failed to start ${result.failed} audit(s)`);
      }
      setSelectedFiles([]);
    } catch {
      toast.error('Bulk audit failed');
    }
  };

  const handleClearSelection = () => {
    setSelectedFiles([]);
  };

  return (
    <div className={cn("space-y-6", selectedFiles.length > 0 && "pb-20")}>
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
          selectable={true}
          selectedIds={selectedFiles}
          onSelectionChange={setSelectedFiles}
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">
                  {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={handleClearSelection}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkAudit}
                  disabled={bulkAuditMutation.isPending || !canBulkAudit}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Run Audit ({selectedFiles.length})
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedFiles.length})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
