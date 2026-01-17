import React from 'react';
import { IssueSummary, SEVERITY_CONFIG, SEVERITY_ORDER } from '../../types/job-output.types';

interface SeveritySummaryProps {
  summary: IssueSummary;
}

export const SeveritySummary = React.memo(function SeveritySummary({ summary }: SeveritySummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {SEVERITY_ORDER.map((severity) => {
        const config = SEVERITY_CONFIG[severity];
        const count = summary[severity];
        const Icon = config.icon;

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
