import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Download, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { ROUTES } from '../../constants/routes';

interface JobActionsProps {
  jobId: string;
  batchId?: string;
  onDownloadReport?: () => void;
  onReAudit?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const BATCH_REMEDIATION_TOOLTIP =
  'This file is managed by an active batch — approve at the AI Review gate on the batch dashboard to proceed with remediation.';

const BATCH_REAUDIT_TOOLTIP =
  'Re-auditing a file mid-batch may produce results inconsistent with the pipeline. Use the batch dashboard to manage this file.';

interface ActionButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  tooltip?: string;
  tooltipId: string;
  leftIcon?: React.ReactNode;
  ariaLabel: string;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
}

const ActionButton = React.memo(function ActionButton({
  onClick,
  disabled,
  tooltip,
  tooltipId,
  leftIcon,
  ariaLabel,
  children,
  type = 'button',
}: ActionButtonProps) {
  const button = (
    <Button
      type={type}
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
  batchId,
  onDownloadReport,
  onReAudit,
  loading = false,
  disabled = false,
}: JobActionsProps) {
  const navigate = useNavigate();
  const isDisabled = loading || disabled;
  const isBatchContext = !!batchId;

  const handleStartRemediation = useCallback(() => {
    navigate(ROUTES.REMEDIATION(jobId));
  }, [navigate, jobId]);

  const startRemediationButton = (
    <Button
      type="button"
      onClick={isBatchContext ? undefined : handleStartRemediation}
      disabled={isDisabled || isBatchContext}
      variant="primary"
      leftIcon={<Play className="w-4 h-4" />}
      aria-label="Start accessibility remediation for this document"
    >
      Start Remediation
    </Button>
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {isBatchContext ? (
        <Tooltip content={BATCH_REMEDIATION_TOOLTIP} id="tooltip-start-remediation">
          <span>{startRemediationButton}</span>
        </Tooltip>
      ) : startRemediationButton}

      <ActionButton
        type="button"
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
        type="button"
        onClick={onReAudit}
        disabled={isDisabled || isBatchContext || !onReAudit}
        tooltip={isBatchContext ? BATCH_REAUDIT_TOOLTIP : !onReAudit ? 'Coming soon' : undefined}
        tooltipId="tooltip-re-audit"
        leftIcon={<RefreshCw className="w-4 h-4" />}
        ariaLabel="Re-run accessibility audit"
      >
        Re-Audit
      </ActionButton>
    </div>
  );
});
