/**
 * TrackedChangesPanel Component
 *
 * Displays a list of tracked changes with individual accept/reject actions.
 */

import type { Editor } from '@tiptap/react';
import type { TrackedChange, TrackChangeSource } from './TrackChangeExtension';

const SOURCE_BADGES: Record<TrackChangeSource, { label: string; className: string }> = {
  style: { label: 'Style', className: 'source-badge-style' },
  integrity: { label: 'Integrity', className: 'source-badge-integrity' },
  plagiarism: { label: 'Plagiarism', className: 'source-badge-plagiarism' },
  manual: { label: 'Manual', className: 'source-badge-manual' },
};

interface TrackedChangesPanelProps {
  editor: Editor;
  trackedChanges: TrackedChange[];
  onClose: () => void;
}

export function TrackedChangesPanel({
  editor,
  trackedChanges,
  onClose,
}: TrackedChangesPanelProps) {
  if (trackedChanges.length === 0) {
    return null;
  }

  return (
    <div className="tiptap-changes-panel">
      <div className="changes-panel-header">
        <h3>Tracked Changes</h3>
        <button type="button" onClick={onClose} aria-label="Close panel">x</button>
      </div>
      <div className="changes-list">
        {trackedChanges.map((change) => {
          const badge = SOURCE_BADGES[change.source] || SOURCE_BADGES.manual;
          return (
            <div key={change.id} className={`change-item ${change.type}`}>
              <div className="change-header">
                <span className={`change-type ${change.type}`}>
                  {change.type === 'insertion' ? '+ Added' : '- Deleted'}
                </span>
                <span className={`change-source-badge ${badge.className}`}>{badge.label}</span>
                <span className="change-user">{change.userName}</span>
              </div>
              <div className="change-text">
                &quot;{change.text.substring(0, 50)}{change.text.length > 50 ? '...' : ''}&quot;
              </div>
              <div className="change-actions">
                <button
                  onClick={() => {
                    editor.commands.acceptChange(change.id);
                  }}
                  className="accept-btn"
                >
                  Accept
                </button>
                <button
                  onClick={() => {
                    editor.commands.rejectChange(change.id);
                  }}
                  className="reject-btn"
                >
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
