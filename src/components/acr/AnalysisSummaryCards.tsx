import { AlertCircle, Search, MinusCircle } from 'lucide-react';

interface AnalysisSummaryCardsProps {
  issuesCount: number;
  verificationCount: number;
  naCount: number;
}

export function AnalysisSummaryCards({
  issuesCount,
  verificationCount,
  naCount,
}: AnalysisSummaryCardsProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Analysis Summary
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
            <span className="text-sm font-medium text-red-900">
              Issues Found
            </span>
          </div>
          <div className="text-3xl font-bold text-red-600 mb-1">
            {issuesCount}
          </div>
          <p className="text-xs text-red-700">
            {issuesCount === 1 ? 'criterion fails' : 'criteria fail'}
          </p>
        </div>

        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-5 w-5 text-orange-600" aria-hidden="true" />
            <span className="text-sm font-medium text-orange-900">
              To Verify
            </span>
          </div>
          <div className="text-3xl font-bold text-orange-600 mb-1">
            {verificationCount}
          </div>
          <p className="text-xs text-orange-700">
            {verificationCount === 1 ? 'criterion needs' : 'criteria need'} review
          </p>
        </div>

        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <MinusCircle className="h-5 w-5 text-gray-600" aria-hidden="true" />
            <span className="text-sm font-medium text-gray-900">
              Likely N/A
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-600 mb-1">
            {naCount}
          </div>
          <p className="text-xs text-gray-700">
            {naCount === 1 ? 'criterion may' : 'criteria may'} not apply
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          From automated audit: <span className="font-semibold">{issuesCount} {issuesCount === 1 ? 'criterion fails' : 'criteria fail'}</span>
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Manual testing needed: <span className="font-semibold">{verificationCount} {verificationCount === 1 ? 'criterion requires' : 'criteria require'} review</span>
        </p>
      </div>
    </div>
  );
}
