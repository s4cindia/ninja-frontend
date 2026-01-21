import { Check, X, AlertCircle, Zap, FileText, Wrench } from 'lucide-react';
import type { Batch } from '@/types/batch.types';

interface BatchSummaryProps {
  batch: Batch;
}

export function BatchSummary({ batch }: BatchSummaryProps) {
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
      label: 'Remaining Quick-Fixes',
      value: batch.quickFixIssues,
      icon: <Wrench className="h-5 w-5 text-orange-600" aria-hidden="true" />,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Batch Summary</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="flex justify-center mb-2">{stat.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-600 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
