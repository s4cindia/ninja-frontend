import { useNavigate } from 'react-router-dom';
import { Play, Download, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { ROUTES } from '../../constants/routes';

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
  const isDisabled = loading || disabled;

  const handleStartRemediation = () => {
    navigate(ROUTES.REMEDIATION(jobId));
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Button
        onClick={handleStartRemediation}
        disabled={isDisabled}
        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Play className="w-4 h-4" />
        Start Remediation
      </Button>

      <div className="relative group">
        <Button
          onClick={onDownloadReport}
          disabled={isDisabled || !onDownloadReport}
          variant="outline"
          className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-gray-300 rounded-md font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Download Report
        </Button>
        {!onDownloadReport && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            Coming soon
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
          </div>
        )}
      </div>

      <div className="relative group">
        <Button
          onClick={onReAudit}
          disabled={isDisabled || !onReAudit}
          variant="outline"
          className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-gray-300 rounded-md font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-4 h-4" />
          Re-Audit
        </Button>
        {!onReAudit && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            Coming soon
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
          </div>
        )}
      </div>
    </div>
  );
}
