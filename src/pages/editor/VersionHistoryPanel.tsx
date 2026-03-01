/**
 * VersionHistoryPanel
 *
 * Displays a list of document versions with the ability to restore
 * to a previous version.
 */

import { History, Loader2, RotateCcw, X } from 'lucide-react';
import type { DocumentVersion } from '@/services/validator.service';

interface VersionHistoryPanelProps {
  versions: DocumentVersion[];
  loadingVersions: boolean;
  currentVersion: number | null;
  restoring: boolean;
  onClose: () => void;
  onRestoreVersion: (versionId: string, versionNumber: number) => void;
}

export function VersionHistoryPanel({
  versions,
  loadingVersions,
  currentVersion,
  restoring,
  onClose,
  onRestoreVersion,
}: VersionHistoryPanelProps) {
  return (
    <div className="w-[320px] flex-shrink-0 border-l bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-sm">Version History</span>
        </div>
        <button type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loadingVersions ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : versions.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No versions yet. Save the document to create your first version.
          </div>
        ) : (
          <div className="divide-y">
            {versions.map((version) => (
              <VersionItem
                key={version.id}
                version={version}
                isCurrent={currentVersion === version.version}
                restoring={restoring}
                onRestore={onRestoreVersion}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VersionItem({
  version,
  isCurrent,
  restoring,
  onRestore,
}: {
  version: DocumentVersion;
  isCurrent: boolean;
  restoring: boolean;
  onRestore: (versionId: string, versionNumber: number) => void;
}) {
  const changeEntry = version.changeLog[0];

  return (
    <div className={`p-3 hover:bg-gray-50 ${isCurrent ? 'bg-blue-50' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm">
          Version {version.version}
          {isCurrent && (
            <span className="ml-2 text-xs text-blue-600">(current)</span>
          )}
        </span>
        {!isCurrent && (
          <button type="button"
            onClick={() => onRestore(version.id, version.version)}
            disabled={restoring}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
            Restore
          </button>
        )}
      </div>
      <div className="text-xs text-gray-500">
        {new Date(version.createdAt).toLocaleString()}
      </div>
      {changeEntry && (
        <div className="text-xs text-gray-400 mt-1">
          {changeEntry.action === 'restore'
            ? `Restored from v${changeEntry.restoredFrom}`
            : changeEntry.wordCount
            ? `${changeEntry.wordCount} words`
            : changeEntry.action}
        </div>
      )}
    </div>
  );
}
