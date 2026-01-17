import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface ComplianceScoreProps {
  score: number;
  isAccessible: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Score range constants
const MIN_SCORE = 0;
const MAX_SCORE = 100;

// Score thresholds for color coding
const SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  FAIR: 50,
} as const;

// Score colors for different ranges
const SCORE_COLORS = {
  EXCELLENT: { stroke: '#22c55e', bg: 'bg-green-50', text: 'text-green-700' },
  GOOD: { stroke: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700' },
  FAIR: { stroke: '#eab308', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  POOR: { stroke: '#ef4444', bg: 'bg-red-50', text: 'text-red-700' },
} as const;

// SVG dimensions by size
const SIZE_CONFIG = {
  sm: { width: 80, strokeWidth: 6, fontSize: 'text-lg', labelSize: 'text-xs' },
  md: { width: 120, strokeWidth: 8, fontSize: 'text-2xl', labelSize: 'text-sm' },
  lg: { width: 160, strokeWidth: 10, fontSize: 'text-4xl', labelSize: 'text-base' },
} as const;

function getScoreColors(score: number) {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return SCORE_COLORS.EXCELLENT;
  if (score >= SCORE_THRESHOLDS.GOOD) return SCORE_COLORS.GOOD;
  if (score >= SCORE_THRESHOLDS.FAIR) return SCORE_COLORS.FAIR;
  return SCORE_COLORS.POOR;
}

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
  const colors = getScoreColors(normalizedScore);

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
