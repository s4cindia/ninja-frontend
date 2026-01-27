import { Check, X, AlertCircle, Zap, FileText, Wrench, Edit3 } from 'lucide-react';
import type { Batch } from '@/types/batch.types';

interface BatchSummaryProps {
  batch: Batch;
}

export function BatchSummary({ batch }: BatchSummaryProps) {
  // Calculate remaining quick fixes properly: use remainingQuickFixes if available,
  // otherwise compute from total - applied, protecting against negative values
  const remainingQuickFixes = batch.remainingQuickFixes 
    ?? Math.max(0, (batch.quickFixIssues ?? 0) - (batch.quickFixesApplied ?? 0));
  const appliedQuickFixes = batch.quickFixesApplied ?? 0;

  const stats = [
    {
      label: 'Total Files',
      value: batch.totalFiles,
      icon: <FileText className="h-5 w-5 text-sky-600" aria-hidden="true" />,
    },
    {
      label: 'Successfully Remediated',
      value: batch.filesRemediated,
      icon: <Check className="h-5 w-5 text-green-600" aria-hidden="true" />,
    },
    {
      label: 'Failed',
      value: batch.filesFailed,
      icon: <X className="h-5 w-5 text-red-600" aria-hidden="true" />,
    },
    {
      label: 'Issues Found',
      value: batch.totalIssuesFound,
      icon: <AlertCircle className="h-5 w-5 text-amber-600" aria-hidden="true" />,
    },
    {
      label: 'Auto-Fixed Issues',
      value: batch.autoFixedIssues,
      icon: <Zap className="h-5 w-5 text-purple-600" aria-hidden="true" />,
    },
    {
      label: 'Quick-Fixes',
      value: remainingQuickFixes,
      subLabel: appliedQuickFixes > 0 ? `${appliedQuickFixes} applied` : undefined,
      icon: <Wrench className="h-5 w-5 text-orange-600" aria-hidden="true" />,
    },
    {
      label: 'Manual Fixes Needed',
      value: batch.manualIssues,
      icon: <Edit3 className="h-5 w-5 text-gray-500" aria-hidden="true" />,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Batch Summary</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="flex justify-center mb-2">{stat.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-600 mt-1">{stat.label}</p>
            {'subLabel' in stat && stat.subLabel && (
              <p className="text-xs text-green-600">{stat.subLabel}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
