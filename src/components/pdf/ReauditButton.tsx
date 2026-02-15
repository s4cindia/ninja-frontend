import { useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePdfReaudit } from '../../hooks/usePdfRemediation';
import type { ReauditComparisonResult } from '../../types/pdf-remediation.types';

interface ReauditButtonProps {
  jobId: string;
  onSuccess?: (result: ReauditComparisonResult) => void;
}

export function ReauditButton({ jobId, onSuccess }: ReauditButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { reauditPdf, isLoading } = usePdfReaudit();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file is PDF
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a PDF file');
      return;
    }

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File size must be less than 100MB');
      return;
    }

    let toastId: string | undefined;

    try {
      setIsUploading(true);
      toastId = toast.loading('Re-auditing PDF...');

      const result = await reauditPdf(jobId, file);

      if (result.success) {
        toast.success(
          `Re-audit complete! ${result.metrics.resolvedCount} issues resolved`,
          { id: toastId }
        );
        onSuccess?.(result);
      } else {
        toast.error('Re-audit failed', { id: toastId });
      }
    } catch (error) {
      // Dismiss/replace the loading toast with error message
      if (toastId) {
        toast.error('Failed to re-audit PDF', { id: toastId });
      } else {
        toast.error('Failed to re-audit PDF');
      }
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading || isUploading}
        variant="primary"
        size="lg"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Re-auditing...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Re-Audit Remediated PDF
          </>
        )}
      </Button>
    </>
  );
}
