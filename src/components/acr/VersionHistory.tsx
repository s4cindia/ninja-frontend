import { useState } from 'react';
import { History, Clock, User, ChevronRight, RotateCcw, ArrowLeftRight, Loader2, CheckCircle, FileText } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useVersionHistory, useVersionDetails, type ReportVersion } from '@/hooks/useAcrVersions';

interface VersionHistoryProps {
  acrId: string;
  onRestore: (version: number) => void;
  onCompare?: (v1: number, v2: number) => void;
}

interface ToastState {
  show: boolean;
  message: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function VersionItem({
  version,
  isSelected,
  isCompareMode,
  isCompareSelected,
  isCurrent,
  onClick,
  onCompareSelect,
}: {
  version: ReportVersion;
  isSelected: boolean;
  isCompareMode: boolean;
  isCompareSelected: boolean;
  isCurrent: boolean;
  onClick: () => void;
  onCompareSelect: () => void;
}) {
  return (
    <div
      className={cn(
        'p-3 border rounded-lg cursor-pointer transition-colors',
        isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300',
        isCompareSelected && 'ring-2 ring-blue-400'
      )}
      onClick={isCompareMode ? onCompareSelect : onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">Version {version.versionNumber}</span>
            {isCurrent && (
              <Badge variant="success" size="sm">Current</Badge>
            )}
            {isCompareSelected && (
              <Badge variant="info" size="sm">Selected</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(version.createdAt)}
            </span>
            {version.approvedBy && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {version.approvedBy}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {version.passedCriteria}/{version.totalCriteria} criteria passing
          </p>
          <div className="mt-1">
            <Badge variant="default" size="sm">
              {version.status}
            </Badge>
          </div>
        </div>
        {!isCompareMode && (
          <ChevronRight className={cn(
            'h-5 w-5 text-gray-400 transition-transform',
            isSelected && 'rotate-90'
          )} />
        )}
      </div>
    </div>
  );
}

export function VersionHistory({ acrId, onRestore, onCompare }: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareVersions, setCompareVersions] = useState<number[]>([]);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '' });

  const { data: versions, isLoading, error } = useVersionHistory(acrId, { enabled: true });
  const { data: versionDetails, isLoading: isLoadingDetails } = useVersionDetails(selectedVersion?.toString() || '', { enabled: !!selectedVersion });

  // Show loading spinner first while data is being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  // Show error only after loading completes
  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        <p>Error loading version history: {error.message}</p>
      </div>
    );
  }

  // Show empty state only when not loading and no versions exist
  if (!versions || versions.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
        <p className="text-sm text-gray-600 font-medium mb-1">
          No version history available yet
        </p>
        <p className="text-xs text-gray-500">
          Versions will be created automatically after AI analysis completes.
        </p>
      </div>
    );
  }

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const handleVersionClick = (version: number) => {
    setSelectedVersion(selectedVersion === version ? null : version);
  };

  const handleCompareSelect = (version: number) => {
    setCompareVersions(prev => {
      if (prev.includes(version)) {
        return prev.filter(v => v !== version);
      }
      if (prev.length >= 2) {
        return [prev[1], version];
      }
      return [...prev, version];
    });
  };

  const handleStartCompare = () => {
    if (compareVersions.length === 2 && onCompare) {
      const sorted = [...compareVersions].sort((a, b) => a - b);
      onCompare(sorted[0], sorted[1]);
    }
  };

  const handleRestore = (version: number) => {
    if (confirm(`Restore to Version ${version}? This will create a new draft.`)) {
      setSelectedVersion(null);
      showToast(`Restoring to Version ${version}...`);
      onRestore(version);
    }
  };

  const currentVersion = versions && versions.length > 0 ? versions[0]?.versionNumber : null;

  return (
    <div className="space-y-4">
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-top-2">
          <CheckCircle className="h-5 w-5" />
          {toast.message}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Version History</h3>
        </div>
        <div className="flex items-center gap-2">
          {isCompareMode ? (
            <>
              <span className="text-sm text-gray-500">
                Select 2 versions ({compareVersions.length}/2)
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsCompareMode(false);
                  setCompareVersions([]);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={compareVersions.length !== 2}
                onClick={handleStartCompare}
              >
                Compare
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCompareMode(true)}
            >
              <ArrowLeftRight className="h-4 w-4 mr-1" />
              Compare Versions
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {versions.map((version: ReportVersion) => (
            <VersionItem
              key={version.versionNumber}
              version={version}
              isSelected={selectedVersion === version.versionNumber}
              isCompareMode={isCompareMode}
              isCompareSelected={compareVersions.includes(version.versionNumber)}
              isCurrent={version.versionNumber === currentVersion}
              onClick={() => handleVersionClick(version.versionNumber)}
              onCompareSelect={() => handleCompareSelect(version.versionNumber)}
            />
          ))}
        </div>

        <div className="lg:border-l lg:pl-4">
          {selectedVersion !== null && !isCompareMode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">
                  Version {selectedVersion} Details
                </h4>
                {selectedVersion !== versions[0]?.versionNumber && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestore(selectedVersion)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Restore
                  </Button>
                )}
              </div>

              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                </div>
              ) : versionDetails ? (
                <div className="space-y-3">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h5 className="font-medium mb-2">Version Summary</h5>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Total Criteria:</span>
                        <span className="ml-2 font-medium">{versionDetails.summary.totalCriteria}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Applicable:</span>
                        <span className="ml-2 font-medium">{versionDetails.summary.applicableCriteria}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Passed:</span>
                        <span className="ml-2 font-medium text-green-600">{versionDetails.summary.passedCriteria}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Failed:</span>
                        <span className="ml-2 font-medium text-red-600">{versionDetails.summary.failedCriteria}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">N/A:</span>
                        <span className="ml-2 font-medium">{versionDetails.summary.naCriteria}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <span className="ml-2 font-medium">{versionDetails.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No details available for this version.
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 py-12">
              {isCompareMode 
                ? 'Select two versions to compare'
                : 'Select a version to view details'
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
