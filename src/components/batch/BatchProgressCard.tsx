import type { Batch } from '@/types/batch.types';

interface BatchProgressCardProps {
  batch: Batch;
}

export function BatchProgressCard({ batch }: BatchProgressCardProps) {
  const progressPercent =
    batch.totalFiles > 0
      ? Math.round(
          ((batch.filesRemediated + batch.filesFailed) / batch.totalFiles) * 100
        )
      : 0;

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Processing Progress</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24">
            <svg
              className="h-24 w-24 -rotate-90"
              viewBox="0 0 100 100"
              aria-label={`Progress: ${progressPercent}%`}
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-gray-900">{progressPercent}%</span>
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{progressPercent}%</p>
            <p className="text-sm text-gray-600">
              {batch.filesRemediated + batch.filesFailed} of {batch.totalFiles} complete
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Remediated</p>
            <p className="text-2xl font-bold text-green-600">{batch.filesRemediated}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Failed</p>
            <p className="text-2xl font-bold text-red-600">{batch.filesFailed}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Issues Found</p>
            <p className="text-2xl font-bold text-gray-900">{batch.totalIssuesFound}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Auto-Fixed</p>
            <p className="text-2xl font-bold text-sky-600">{batch.autoFixedIssues}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
