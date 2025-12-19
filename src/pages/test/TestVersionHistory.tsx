import { useState } from 'react';
import { VersionHistory } from '@/components/acr/VersionHistory';
import { VersionComparison } from '@/components/acr/VersionComparison';
import { Alert } from '@/components/ui/Alert';

export default function TestVersionHistory() {
  const [view, setView] = useState<'history' | 'compare'>('history');
  const [compareVersions, setCompareVersions] = useState<[number, number] | null>(null);
  const [restoredVersion, setRestoredVersion] = useState<number | null>(null);

  const handleRestore = (version: number) => {
    setRestoredVersion(version);
    setTimeout(() => setRestoredVersion(null), 3000);
  };

  const handleCompare = (v1: number, v2: number) => {
    setCompareVersions([v1, v2]);
    setView('compare');
  };

  const handleBackToHistory = () => {
    setView('history');
    setCompareVersions(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Version History Test Page</h1>
          <p className="text-gray-600 mb-6">
            Test the ACR version history viewer with mock data.
          </p>

          {restoredVersion && (
            <Alert variant="success" className="mb-4">
              Version {restoredVersion} has been restored to a new draft.
            </Alert>
          )}

          {view === 'history' ? (
            <VersionHistory
              acrId="test-acr-123"
              onRestore={handleRestore}
              onCompare={handleCompare}
            />
          ) : compareVersions ? (
            <VersionComparison
              acrId="test-acr-123"
              version1={compareVersions[0]}
              version2={compareVersions[1]}
              onBack={handleBackToHistory}
            />
          ) : null}
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Features to Test</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Version list with metadata (version number, date, author, summary)</li>
            <li>• Click a version to view changelog details</li>
            <li>• Side-by-side change view (old vs new values)</li>
            <li>• "Compare Versions" mode - select two versions</li>
            <li>• Comparison view with highlighted differences</li>
            <li>• Restore button to copy to current draft</li>
            <li>• Loading states for all async operations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
