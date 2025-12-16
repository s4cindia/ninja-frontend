import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ComplianceStatus = 'pass' | 'partial' | 'fail';

interface ComplianceScoreCardProps {
  title: string;
  score: number;
  status: ComplianceStatus;
  subtitle?: string;
  issues?: { critical?: number; serious?: number; moderate?: number; minor?: number };
  className?: string;
}

const statusConfig = {
  pass: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Passed' },
  partial: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Partial' },
  fail: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Failed' },
};

function ScoreRing({ score, status }: { score: number; status: ComplianceStatus }) {
  const config = statusConfig[status];
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 transform -rotate-90" aria-hidden="true">
        <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200" />
        <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className={config.color}
          style={{ strokeDasharray: circumference, strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn('text-2xl font-bold', config.color)}>{Math.round(score)}</span>
      </div>
    </div>
  );
}

export function ComplianceScoreCard({ title, score, status, subtitle, issues, className }: ComplianceScoreCardProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const totalIssues = issues ? (issues.critical || 0) + (issues.serious || 0) + (issues.moderate || 0) + (issues.minor || 0) : 0;

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={cn('p-1.5 rounded-full', config.bg)}>
          <Icon className={cn('h-4 w-4', config.color)} aria-hidden="true" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ScoreRing score={score} status={status} />
        <div className="flex-1 space-y-2">
          <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium', config.bg, config.color)}>
            <Icon className="h-3 w-3" aria-hidden="true" />
            {config.label}
          </div>

          {issues && totalIssues > 0 && (
            <div className="space-y-1">
              {issues.critical && issues.critical > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
                  <span className="text-gray-600">{issues.critical} critical</span>
                </div>
              )}
              {issues.serious && issues.serious > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-orange-500" aria-hidden="true" />
                  <span className="text-gray-600">{issues.serious} serious</span>
                </div>
              )}
              {issues.moderate && issues.moderate > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" aria-hidden="true" />
                  <span className="text-gray-600">{issues.moderate} moderate</span>
                </div>
              )}
              {issues.minor && issues.minor > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-500" aria-hidden="true" />
                  <span className="text-gray-600">{issues.minor} minor</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
