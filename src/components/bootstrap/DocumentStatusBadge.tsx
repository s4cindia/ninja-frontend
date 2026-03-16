type CalibrationStatus = 'PENDING' | 'IN_PROGRESS' | 'NEEDS_REVIEW' | 'COMPLETE';

interface DocumentStatusBadgeProps {
  status: CalibrationStatus;
}

const statusConfig: Record<CalibrationStatus, { label: string; classes: string }> = {
  PENDING: { label: 'Pending', classes: 'bg-gray-100 text-gray-600' },
  IN_PROGRESS: { label: 'In Progress', classes: 'bg-amber-100 text-amber-700' },
  NEEDS_REVIEW: { label: 'Needs Review', classes: 'bg-orange-100 text-orange-700' },
  COMPLETE: { label: 'Complete', classes: 'bg-green-100 text-green-700' },
};

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      role="status"
      aria-label={`Status: ${config.label}`}
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
