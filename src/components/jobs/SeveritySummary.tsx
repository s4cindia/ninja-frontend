import React from 'react';
import { AlertCircle, AlertTriangle, Info, LucideIcon } from 'lucide-react';
import { IssueSummary, SEVERITY_CONFIG, SeverityLevel } from '../../types/job-output.types';

interface SeveritySummaryProps {
  summary: IssueSummary;
}

const SEVERITY_ORDER: SeverityLevel[] = ['critical', 'serious', 'moderate', 'minor'];

const SEVERITY_ICONS: Record<SeverityLevel, LucideIcon> = {
  critical: AlertCircle,
  serious: AlertTriangle,
  moderate: AlertTriangle,
  minor: Info,
};

export const SeveritySummary = React.memo(function SeveritySummary({ summary }: SeveritySummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {SEVERITY_ORDER.map((severity) => {
        const config = SEVERITY_CONFIG[severity];
        const count = summary[severity];
        const Icon = SEVERITY_ICONS[severity];

        return (
          <div
            key={severity}
            className={`rounded-lg p-4 border ${config.bgColor} ${config.borderColor}`}
            data-testid={`${severity}-count`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${config.textColor}`} />
              <span className={`text-sm font-medium ${config.textColor}`}>
                {config.label}
              </span>
            </div>
            <div className={`text-2xl font-bold ${config.textColor}`}>
              {count}
            </div>
          </div>
        );
      })}
    </div>
  );
});
