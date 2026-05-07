import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import {
  ANNOTATION_STATUSES,
  STATUS_LABELS,
  type AnnotationStatus,
} from '@/services/corpus-status.service';

interface StatusPillProps {
  status: AnnotationStatus;
  isOverride?: boolean;
  isSaving?: boolean;
  disabled?: boolean;
  onChange?: (next: AnnotationStatus) => void;
}

const STATUS_TONE: Record<AnnotationStatus, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200',
  PENDING_REVIEW: 'bg-violet-100 text-violet-800 border-violet-300 hover:bg-violet-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
  BLOCKED: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200',
};

export function StatusPill({
  status,
  isOverride,
  isSaving,
  disabled,
  onChange,
}: StatusPillProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const handleSelect = (next: AnnotationStatus) => {
    setOpen(false);
    if (next !== status) onChange?.(next);
  };

  const tone = STATUS_TONE[status];
  const isReadOnly = !onChange || disabled;

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => !isReadOnly && setOpen((v) => !v)}
        disabled={isReadOnly}
        title={
          isOverride
            ? `${STATUS_LABELS[status]} (manual override). Click to change.`
            : isReadOnly
              ? STATUS_LABELS[status]
              : `${STATUS_LABELS[status]}. Click to change.`
        }
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border transition-colors ${tone} ${
          isReadOnly ? 'cursor-default' : 'cursor-pointer'
        }`}
        aria-label={`Status: ${STATUS_LABELS[status]}`}
        aria-haspopup={!isReadOnly}
        aria-expanded={open}
      >
        {isSaving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isOverride ? (
          <span className="text-[8px] leading-none" aria-hidden="true">
            ●
          </span>
        ) : null}
        {STATUS_LABELS[status]}
        {!isReadOnly && <ChevronDown className="h-3 w-3" />}
      </button>

      {open && !isReadOnly && (
        <div
          role="menu"
          className="absolute top-full left-0 mt-1 z-30 min-w-[10rem] bg-white border border-gray-200 rounded-md shadow-lg py-1"
        >
          {ANNOTATION_STATUSES.map((value) => {
            const isCurrent = value === status;
            return (
              <button
                key={value}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(value)}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${
                  isCurrent ? 'font-semibold text-gray-900' : 'text-gray-700'
                }`}
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-2 align-middle ${pillDot(value)}`} />
                {STATUS_LABELS[value]}
                {isCurrent && (
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400">
                    current
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function pillDot(status: AnnotationStatus): string {
  switch (status) {
    case 'NOT_STARTED':
      return 'bg-gray-400';
    case 'IN_PROGRESS':
      return 'bg-amber-500';
    case 'PENDING_REVIEW':
      return 'bg-violet-500';
    case 'COMPLETED':
      return 'bg-green-500';
    case 'BLOCKED':
      return 'bg-red-500';
  }
}
