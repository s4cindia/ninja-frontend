import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FileUploadZone } from '@/components/batch/FileUploadZone';
import { FileList } from '@/components/batch/FileList';
import { useCreateBatch, useUploadFiles } from '@/hooks/useBatch';
import { computeUploadProgressStats, formatBytes } from '@/utils/uploadProgress';
import { formatDuration } from '@/utils/duration';
import { Layers } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BatchCreationPage() {
  const navigate = useNavigate();
  const [batchName, setBatchName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadBytes, setUploadBytes] = useState<{ loaded: number; total: number } | null>(null);
  const [uploadNow, setUploadNow] = useState(() => Date.now());
  const uploadStartRef = useRef<Date | null>(null);

  const createBatchMutation = useCreateBatch();
  const uploadFilesMutation = useUploadFiles();

  // Ticks once a second while uploading so elapsed/ETA stay live even if
  // progress events are sparse (one multipart request for all files, so
  // there's only ever aggregate bytes, not per-file).
  useEffect(() => {
    if (!uploadFilesMutation.isPending) return;
    const intervalId = setInterval(() => setUploadNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [uploadFilesMutation.isPending]);

  const uploadStats = uploadBytes && uploadBytes.total > 0 && uploadStartRef.current
    ? computeUploadProgressStats(uploadBytes.loaded, uploadBytes.total, uploadNow - uploadStartRef.current.getTime())
    : null;

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateBatch = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    let createdBatchId: string | null = null;

    try {
      const result = await createBatchMutation.mutateAsync({
        name: batchName || undefined,
      });

      createdBatchId = result.batchId;

      try {
        uploadStartRef.current = new Date();
        setUploadBytes(null);
        setUploadNow(Date.now());

        await uploadFilesMutation.mutateAsync({
          batchId: result.batchId,
          files: selectedFiles,
          onProgress: (p) => {
            setUploadBytes({ loaded: p.loaded, total: p.total });
            setUploadNow(Date.now());
          },
        });

        toast.success('Batch created successfully');
        navigate(`/batch/${result.batchId}`);
      } catch (uploadError) {
        toast.error('Files failed to upload. Navigating to batch to retry.');
        navigate(`/batch/${result.batchId}`);
      }
    } catch {
      if (!createdBatchId) {
        toast.error('Failed to create batch');
      }
    }
  };

  const isLoading = createBatchMutation.isPending || uploadFilesMutation.isPending;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Breadcrumbs
        items={[
          { label: 'Batches', path: '/batches' },
          { label: 'Create Batch' },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Layers className="h-6 w-6" aria-hidden="true" />
          Create Batch
        </h1>
        <p className="text-gray-600">
          Upload EPUB files to process in batch. Files will be automatically audited,
          planned, and remediated.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label
            htmlFor="batch-name"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Batch Name (Optional)
          </label>
          <Input
            id="batch-name"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="e.g., Q1 2026 EPUB Batch"
            disabled={isLoading}
          />
        </div>

        <FileUploadZone onFilesSelected={handleFilesSelected} disabled={isLoading} />

        {selectedFiles.length > 0 && (
          <FileList
            files={selectedFiles}
            onRemove={handleRemoveFile}
            disabled={isLoading}
          />
        )}

        {uploadFilesMutation.isPending && (
          <div className="text-xs text-gray-500 space-y-0.5" data-testid="batch-upload-progress-detail">
            {uploadStats ? (
              <>
                <p>
                  {formatBytes(uploadStats.loaded)} of {formatBytes(uploadStats.total)} uploaded
                  {' · '}
                  {formatDuration(uploadStats.elapsedMs)} elapsed
                </p>
                <p>
                  {uploadStats.etaMs != null
                    ? `~${formatDuration(uploadStats.etaMs)} remaining (${formatBytes(uploadStats.remaining)} left)`
                    : 'Calculating time remaining…'}
                </p>
              </>
            ) : (
              <p>Uploading files…</p>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/batches')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBatch}
              disabled={selectedFiles.length === 0 || isLoading}
              isLoading={isLoading}
            >
              Create & Upload
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
