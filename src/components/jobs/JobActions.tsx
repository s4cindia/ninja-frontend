import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Download, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { ROUTES } from '../../constants/routes';

interface JobActionsProps {
  jobId: string;
  onDownloadReport?: () => void;
  onReAudit?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

interface ActionButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  tooltip?: string;
  tooltipId: string;
  leftIcon?: React.ReactNode;
  ariaLabel: string;
  children: React.ReactNode;
}

const ActionButton = React.memo(function ActionButton({
  onClick,
  disabled,
  tooltip,
  tooltipId,
  leftIcon,
  ariaLabel,
  children,
}: ActionButtonProps) {
  const button = (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="outline"
      leftIcon={leftIcon}
      aria-label={ariaLabel}
    >
      {children}
    </Button>
  );

  if (tooltip) {
    return (
      <Tooltip content={tooltip} id={tooltipId}>
        {button}
      </Tooltip>
    );
  }

  return button;
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
        aria-label="Start accessibility remediation for this document"
      >
        Start Remediation
      </Button>

      <ActionButton
        onClick={onDownloadReport}
        disabled={isDisabled || !onDownloadReport}
        tooltip={!onDownloadReport ? 'Coming soon' : undefined}
        tooltipId="tooltip-download-report"
        leftIcon={<Download className="w-4 h-4" />}
        ariaLabel="Download accessibility report"
      >
        Download Report
      </ActionButton>

      <ActionButton
        onClick={onReAudit}
        disabled={isDisabled || !onReAudit}
        tooltip={!onReAudit ? 'Coming soon' : undefined}
        tooltipId="tooltip-re-audit"
        leftIcon={<RefreshCw className="w-4 h-4" />}
        ariaLabel="Re-run accessibility audit"
      >
        Re-Audit
      </ActionButton>
    </div>
  );
});
