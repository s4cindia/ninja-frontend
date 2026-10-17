import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PdfBatchFileUploadZone } from '@/components/pdf-batch/PdfBatchFileUploadZone';
import { PdfBatchUploadList, type PdfBatchUploadItem } from '@/components/pdf-batch/PdfBatchUploadList';
import { useCreatePdfBatch } from '@/hooks/usePdfBatch';
import { pdfBatchService } from '@/services/pdfBatch.service';
import { uploadService } from '@/services/upload.service';
import { getErrorMessage } from '@/services/api';
import { Layers } from 'lucide-react';
import toast from 'react-hot-toast';

const MAX_ITEMS_PER_ADD_REQUEST = 50;

export default function PdfBatchCreatePage() {
  const navigate = useNavigate();
  const [batchName, setBatchName] = useState('');
  const [uploadItems, setUploadItems] = useState<PdfBatchUploadItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createBatchMutation = useCreatePdfBatch();

  const handleFilesSelected = (files: File[]) => {
    setUploadItems((prev) => [
      ...prev,
      ...files.map((file): PdfBatchUploadItem => ({ file, state: 'pending', progress: 0 })),
    ]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, patch: Partial<PdfBatchUploadItem>) => {
    setUploadItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const handleCreateBatch = async () => {
    if (uploadItems.length === 0) {
      toast.error('Please select at least one PDF file');
      return;
    }

    setIsSubmitting(true);

    try {
      const batch = await createBatchMutation.mutateAsync({ name: batchName || undefined });

      // Upload all files in parallel (via the same presign -> S3 -> confirm
      // flow upload.service.ts already exposes). Each row tracks its own
      // progress independently via its index, so concurrent XHRs don't
      // interleave each other's progress -- a large file no longer blocks
      // smaller ones behind it in the queue.
      const uploadResults = await Promise.all(
        uploadItems.map(async (item, i): Promise<string | null> => {
          const file = item.file;
          updateItem(i, { state: 'uploading', progress: 0 });

          try {
            const contentType = file.type || 'application/pdf';
            const presigned = await uploadService.getPresignedUrl(file.name, file.size, contentType);
            await uploadService.uploadToS3(
              presigned.uploadUrl,
              file,
              (progress) => updateItem(i, { progress: progress.percentage }),
              contentType
            );
            await uploadService.confirmUpload(presigned.fileId);

            updateItem(i, { state: 'uploaded', progress: 100, fileId: presigned.fileId });
            return presigned.fileId;
          } catch (err) {
            updateItem(i, { state: 'error', error: getErrorMessage(err) });
            return null;
          }
        })
      );
      const uploadedFileIds = uploadResults.filter((id): id is string => id !== null);

      if (uploadedFileIds.length > 0) {
        for (let i = 0; i < uploadedFileIds.length; i += MAX_ITEMS_PER_ADD_REQUEST) {
          const chunk = uploadedFileIds
            .slice(i, i + MAX_ITEMS_PER_ADD_REQUEST)
            .map((sourceFileId) => ({ sourceFileId }));
          await pdfBatchService.addItems(batch.batchId, chunk);
        }
      }

      if (uploadedFileIds.length === uploadItems.length) {
        toast.success('Batch created successfully');
      } else if (uploadedFileIds.length > 0) {
        toast.error(`${uploadItems.length - uploadedFileIds.length} file(s) failed to upload — the rest were added to the batch`);
      } else {
        toast.error('All files failed to upload');
      }

      navigate(`/pdf-batches/${batch.batchId}`);
    } catch {
      toast.error('Failed to create batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = createBatchMutation.isPending || isSubmitting;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Breadcrumbs
        items={[
          { label: 'PDF Batches', path: '/pdf-batches' },
          { label: 'Create Batch' },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Layers className="h-6 w-6" aria-hidden="true" />
          Create PDF Batch
        </h1>
        <p className="text-gray-600">
          Upload PDF files to audit and remediate in batch. Each file runs a full
          multi-round AI remediation pass — large batches can take hours.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="pdf-batch-name" className="block text-sm font-medium text-gray-700 mb-2">
            Batch Name (Optional)
          </label>
          <Input
            id="pdf-batch-name"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="e.g., Q1 2026 PDF Batch"
            disabled={isLoading}
          />
        </div>

        <PdfBatchFileUploadZone onFilesSelected={handleFilesSelected} disabled={isLoading} />

        {uploadItems.length > 0 && (
          <PdfBatchUploadList items={uploadItems} onRemove={handleRemoveFile} disabled={isLoading} />
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            {uploadItems.length} file{uploadItems.length !== 1 ? 's' : ''} selected
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/pdf-batches')} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateBatch}
              disabled={uploadItems.length === 0 || isLoading}
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
