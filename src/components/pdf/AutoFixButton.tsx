import { useState } from 'react';
import { Button } from '../ui/Button';
import { Loader2, Wand2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePdfAutoRemediation } from '../../hooks/usePdfRemediation';

interface AutoFixButtonProps {
  jobId: string;
  autoFixableCount: number;
  onSuccess?: () => void;
}

export function AutoFixButton({ jobId, autoFixableCount, onSuccess }: AutoFixButtonProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const { executeAutoFix, isLoading } = usePdfAutoRemediation();

  const handleAutoFix = async () => {
    try {
      setIsExecuting(true);
      const toastId = toast.loading(`Fixing ${autoFixableCount} issues automatically...`);

      const result = await executeAutoFix(jobId);

      if (result.success) {
        toast.success(
          `Successfully fixed ${result.completedTasks} of ${result.totalTasks} issues`,
          { id: toastId }
        );
        onSuccess?.();
      } else {
        toast.error(result.error || 'Auto-fix failed', {
          id: toastId,
        });
      }
    } catch (error) {
      toast.error('Failed to run auto-fix');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Button
      onClick={handleAutoFix}
      disabled={isLoading || isExecuting || autoFixableCount === 0}
      variant="primary"
      size="lg"
    >
      {isExecuting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Fixing...
        </>
      ) : (
        <>
          <Wand2 className="mr-2 h-4 w-4" />
          Fix Automatically ({Number(autoFixableCount) || 0})
        </>
      )}
    </Button>
  );
}
