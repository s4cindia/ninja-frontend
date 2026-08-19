import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { useComparisonTrialsInfinite, useRegisterTrial } from '@/hooks/useComparisonStudy';
import type { ComparisonTrialContentType } from '@/types/comparisonStudy.types';

const CONTENT_TYPE_OPTIONS: { value: ComparisonTrialContentType; label: string }[] = [
  { value: 'text-dominant', label: 'Text Dominant' },
  { value: 'table-heavy', label: 'Table Heavy' },
  { value: 'figure-heavy', label: 'Figure Heavy' },
  { value: 'mixed', label: 'Mixed' },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  registered: { label: 'Registered', bg: 'bg-gray-100', text: 'text-gray-600' },
  pdfxt_logged: { label: 'pdfxt Logged', bg: 'bg-[#FFF8E8]', text: 'text-[#C8860A]' },
  validated: { label: 'Validated', bg: 'bg-[#E8F5EE]', text: 'text-[#1A7A3C]' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function RegisterTrialForm({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState<ComparisonTrialContentType>('text-dominant');
  const registerMutation = useRegisterTrial();
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!file) return;
    registerMutation.mutate(
      { file, contentType },
      {
        onSuccess: (trial) => {
          onClose();
          navigate(`/comparison-study/trials/${trial.id}`);
        },
      }
    );
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Register Trial</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source PDF</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-gray-300 file:text-sm file:font-medium file:bg-white hover:file:bg-gray-50"
          />
          <p className="mt-1 text-xs text-gray-400">Can be a large PDF — uploaded directly to S3.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value as ComparisonTrialContentType)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {CONTENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {registerMutation.isError && (
          <p className="text-sm text-red-600">
            {registerMutation.error instanceof Error ? registerMutation.error.message : 'Failed to register trial'}
          </p>
        )}
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={handleSubmit}
          disabled={!file || registerMutation.isPending}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
        >
          {registerMutation.isPending ? (
            <>
              <Loader2 className="animate-spin h-4 w-4" />
              Uploading &amp; registering…
            </>
          ) : (
            'Register Trial'
          )}
        </button>
        <button
          onClick={onClose}
          disabled={registerMutation.isPending}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ComparisonStudyConsolePage() {
  const [showRegister, setShowRegister] = useState(false);
  const navigate = useNavigate();
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useComparisonTrialsInfinite();

  const trials = data?.pages.flatMap((p) => p.trials) ?? [];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comparison Study</h1>
          <p className="mt-1 text-sm text-gray-500">
            Validation trials comparing Ninja remediation against pdfxt on fresh PDFs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/comparison-study/aggregate-report')}
            className="px-4 py-2 text-sm font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Aggregate Report
          </button>
          <button
            onClick={() => setShowRegister(true)}
            className="px-4 py-2 text-sm font-medium rounded bg-teal-600 text-white hover:bg-teal-700"
          >
            Register Trial
          </button>
        </div>
      </div>

      {isError && (
        <div className="text-center py-12">
          <p className="text-sm text-red-600">Failed to load trials</p>
        </div>
      )}

      {!isError && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }, (_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : trials.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">
                    No trials registered yet
                  </td>
                </tr>
              ) : (
                trials.map((trial) => (
                  <tr
                    key={trial.id}
                    onClick={() => navigate(`/comparison-study/trials/${trial.id}`)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-xs">
                      {trial.sourceFileName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {CONTENT_TYPE_OPTIONS.find((o) => o.value === trial.contentType)?.label ?? trial.contentType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={trial.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {fmtDate(trial.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center py-4">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-4 py-2 text-sm font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="max-w-md">
          <RegisterTrialForm onClose={() => setShowRegister(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
