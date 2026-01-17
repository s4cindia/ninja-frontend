import { useNavigate } from 'react-router-dom';
import { Play, Download, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface JobActionsProps {
  jobId: string;
  onDownloadReport?: () => void;
  onReAudit?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function JobActions({
  jobId,
  onDownloadReport,
  onReAudit,
  loading = false,
  disabled = false,
}: JobActionsProps) {
  const navigate = useNavigate();

  const handleStartRemediation = () => {
    navigate(`/remediation/${jobId}`);
  };

  const handleDownloadReport = () => {
    if (onDownloadReport) {
      onDownloadReport();
    } else {
      alert('Download report functionality coming soon');
    }
  };

  const handleReAudit = () => {
    if (onReAudit) {
      onReAudit();
    } else {
      alert('Re-audit functionality coming soon');
    }
  };

  const isDisabled = loading || disabled;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Button
        variant="primary"
        onClick={handleStartRemediation}
        disabled={isDisabled}
        isLoading={loading}
        leftIcon={<Play className="w-4 h-4" />}
      >
        Start Remediation
      </Button>
      <Button
        variant="outline"
        onClick={handleDownloadReport}
        disabled={isDisabled}
        leftIcon={<Download className="w-4 h-4" />}
      >
        Download Report
      </Button>
      <Button
        variant="outline"
        onClick={handleReAudit}
        disabled={isDisabled}
        leftIcon={<RefreshCw className="w-4 h-4" />}
      >
        Re-Audit
      </Button>
    </div>
  );
}
