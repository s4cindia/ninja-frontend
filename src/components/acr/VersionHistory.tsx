import { useState } from 'react';
import { History, Clock, User, ChevronRight, RotateCcw, ArrowLeftRight, Loader2, CheckCircle, FileText } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useVersionHistory, useVersionDetails } from '@/hooks/useAcrVersions';
import type { VersionEntry, VersionChange } from '@/types/version.types';

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

function formatFieldName(field: string): string {
  const fieldNames: Record<string, string> = {
    conformanceLevel: 'Conformance Level',
    remarks: 'Remarks',
    attribution: 'Attribution',
  };
  return fieldNames[field] || field;
}

function formatValue(field: string, value: string): string {
  if (field === 'conformanceLevel') {
    const levels: Record<string, string> = {
      supports: 'Supports',
      partially_supports: 'Partially Supports',
      does_not_support: 'Does Not Support',
      not_applicable: 'Not Applicable',
    };
    return levels[value] || value;
  }
  if (field === 'attribution') {
    return value.replace(/-/g, ' ');
  }
  return value || '(empty)';
}

function ChangeItem({ change }: { change: VersionChange }) {
  return (
    <div className="border rounded-lg p-3 bg-gray-50">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="info" size="sm">{formatFieldName(change.field)}</Badge>
        {change.criterionId && (
          <span className="text-sm font-medium text-gray-700">
            {change.criterionId} - {change.criterionName}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs text-gray-500 mb-1">Old Value</div>
          <div className="p-2 bg-red-50 border border-red-200 rounded text-red-800 line-through">
            {formatValue(change.field, change.oldValue)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">New Value</div>
          <div className="p-2 bg-green-50 border border-green-200 rounded text-green-800">
            {formatValue(change.field, change.newValue)}
          </div>
        </div>
      </div>
      {change.reason && (
        <div className="mt-2 text-sm text-gray-600">
          <span className="font-medium">Reason:</span> {change.reason}
        </div>
      )}
    </div>
  );
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
  version: VersionEntry;
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
            <span className="font-semibold text-gray-900">Version {version.version}</span>
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
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {version.createdBy}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">{version.changeSummary}</p>
          {version.changeCount > 0 && (
            <div className="mt-1">
              <Badge variant="default" size="sm">
                {version.changeCount} change{version.changeCount !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}
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

  const { versions, isLoading, error } = useVersionHistory(acrId);
  const { data: versionDetails, isLoading: isLoadingDetails } = useVersionDetails(acrId, selectedVersion);

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
  if (versions.length === 0) {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const currentVersion = versions.length > 0 ? versions[0].version : null;

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
          {versions.map((version) => (
            <VersionItem
              key={version.version}
              version={version}
              isSelected={selectedVersion === version.version}
              isCompareMode={isCompareMode}
              isCompareSelected={compareVersions.includes(version.version)}
              isCurrent={version.version === currentVersion}
              onClick={() => handleVersionClick(version.version)}
              onCompareSelect={() => handleCompareSelect(version.version)}
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
                {selectedVersion !== versions[0]?.version && (
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
              ) : versionDetails?.changes && versionDetails.changes.length > 0 ? (
                <div className="space-y-3">
                  {versionDetails.changes.map((change: VersionChange, idx: number) => (
                    <ChangeItem key={idx} change={change} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No detailed changes recorded for this version.
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
