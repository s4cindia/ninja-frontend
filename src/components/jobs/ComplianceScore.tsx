import { CheckCircle, AlertTriangle } from 'lucide-react';
import { getScoreColor } from '../../types/job-output.types';

interface ComplianceScoreProps {
  score: number;
  isAccessible: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
  sm: { width: 80, strokeWidth: 6, fontSize: 'text-lg', labelSize: 'text-xs' },
  md: { width: 120, strokeWidth: 8, fontSize: 'text-2xl', labelSize: 'text-sm' },
  lg: { width: 160, strokeWidth: 10, fontSize: 'text-4xl', labelSize: 'text-base' },
};

export function ComplianceScore({ score, isAccessible, size = 'lg' }: ComplianceScoreProps) {
  const config = SIZE_CONFIG[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const scoreColor = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Compliance score: ${score} out of 100`}
      >
        <svg
          width={config.width}
          height={config.width}
          className="transform -rotate-90"
        >
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={config.strokeWidth}
          />
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold text-gray-900 ${config.fontSize}`}>
            {Math.round(score)}
          </span>
          <span className={`text-gray-500 ${config.labelSize}`}>Score</span>
        </div>
      </div>

      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
          isAccessible
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
        role="status"
        aria-label={isAccessible ? 'Document is accessible' : 'Document is not accessible'}
      >
        {isAccessible ? (
          <>
            <CheckCircle className="w-4 h-4" />
            <span>ACCESSIBLE</span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4" />
            <span>NOT ACCESSIBLE</span>
          </>
        )}
      </div>
    </div>
  );
}
