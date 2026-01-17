import React, { useCallback } from 'react';
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

interface TooltipButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tooltip?: string;
  leftIcon?: React.ReactNode;
}

const TooltipButton = React.memo(function TooltipButton({ children, onClick, disabled, tooltip, leftIcon }: TooltipButtonProps) {
  return (
    <div className="relative group">
      <Button
        onClick={onClick}
        disabled={disabled}
        variant="outline"
        leftIcon={leftIcon}
      >
        {children}
      </Button>
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
});

export const JobActions = React.memo(function JobActions({
  jobId,
  onDownloadReport,
  onReAudit,
  loading = false,
  disabled = false,
}: JobActionsProps) {
  const navigate = useNavigate();
  const isDisabled = loading || disabled;

  const handleStartRemediation = useCallback(() => {
    navigate(ROUTES.REMEDIATION(jobId));
  }, [navigate, jobId]);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Button
        onClick={handleStartRemediation}
        disabled={isDisabled}
        variant="primary"
        leftIcon={<Play className="w-4 h-4" />}
      >
        Start Remediation
      </Button>

      <TooltipButton
        onClick={onDownloadReport}
        disabled={isDisabled || !onDownloadReport}
        tooltip={!onDownloadReport ? 'Coming soon' : undefined}
        leftIcon={<Download className="w-4 h-4" />}
      >
        Download Report
      </TooltipButton>

      <TooltipButton
        onClick={onReAudit}
        disabled={isDisabled || !onReAudit}
        tooltip={!onReAudit ? 'Coming soon' : undefined}
        leftIcon={<RefreshCw className="w-4 h-4" />}
      >
        Re-Audit
      </TooltipButton>
    </div>
  );
});
