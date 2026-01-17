import { IssueSummary, SEVERITY_CONFIG, SeverityLevel } from '../../types/job-output.types';

interface SeveritySummaryProps {
  summary: IssueSummary;
}

const SEVERITY_ORDER: SeverityLevel[] = ['critical', 'serious', 'moderate', 'minor'];

export function SeveritySummary({ summary }: SeveritySummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {SEVERITY_ORDER.map((severity) => {
        const config = SEVERITY_CONFIG[severity];
        const count = summary[severity];

        return (
          <div
            key={severity}
            className={`rounded-lg p-4 border ${config.bgColor} ${config.borderColor}`}
            data-testid={`${severity}-count`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{config.icon}</span>
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
}
