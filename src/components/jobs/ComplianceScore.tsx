import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { MIN_SCORE, MAX_SCORE, getScoreColorConfig } from '@/types/job-output.types';

interface ComplianceScoreProps {
  score: number;
  isAccessible: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// SVG dimensions by size
const SIZE_CONFIG = {
  sm: { width: 80, strokeWidth: 6, fontSize: 'text-lg', labelSize: 'text-xs' },
  md: { width: 120, strokeWidth: 8, fontSize: 'text-2xl', labelSize: 'text-sm' },
  lg: { width: 160, strokeWidth: 10, fontSize: 'text-4xl', labelSize: 'text-base' },
} as const;

export const ComplianceScore = React.memo(function ComplianceScore({ score, isAccessible, size = 'lg' }: ComplianceScoreProps) {
  const { width, strokeWidth, fontSize, labelSize } = SIZE_CONFIG[size];

  // Normalize score to valid range, handling NaN and Infinity
  const normalizedScore = Number.isFinite(score)
    ? Math.min(Math.max(score, MIN_SCORE), MAX_SCORE)
    : 0;

  // Calculate SVG values
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / MAX_SCORE) * circumference;
  const colors = getScoreColorConfig(normalizedScore);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative"
        role="progressbar"
        aria-valuenow={normalizedScore}
        aria-valuemin={MIN_SCORE}
        aria-valuemax={MAX_SCORE}
        aria-label={`Compliance score: ${normalizedScore} out of ${MAX_SCORE}`}
      >
        <svg
          width={width}
          height={width}
          className="transform -rotate-90"
        >
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold text-gray-900 ${fontSize}`}>
            {Math.round(normalizedScore)}
          </span>
          <span className={`text-gray-500 ${labelSize}`}>Score</span>
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
});
