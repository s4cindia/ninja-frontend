/**
 * TrackChangesToolbar Component
 *
 * Controls for toggling track changes mode, showing the changes panel,
 * and bulk accept/reject all changes.
 */

import type { Editor } from '@tiptap/react';

interface TrackChangesToolbarProps {
  editor: Editor;
  isTrackingEnabled: boolean;
  trackedChangesCount: number;
  showChangesPanel: boolean;
  onToggleChangesPanel: () => void;
}

export function TrackChangesToolbar({
  editor,
  isTrackingEnabled,
  trackedChangesCount,
  showChangesPanel,
  onToggleChangesPanel,
}: TrackChangesToolbarProps) {
  return (
    <div className="tiptap-toolbar-group track-changes-controls">
      <button
        type="button"
        onClick={() => editor.commands.toggleTrackChanges()}
        className={isTrackingEnabled ? 'is-active tracking-on' : ''}
        title="Toggle Track Changes"
      >
        {isTrackingEnabled ? 'Tracking ON' : 'Track'}
      </button>
      <button
        type="button"
        onClick={onToggleChangesPanel}
        className={showChangesPanel ? 'is-active' : ''}
        title="Show Changes Panel"
      >
        Changes ({trackedChangesCount})
      </button>
      <button
        type="button"
        onClick={() => editor.commands.acceptAllChanges()}
        title="Accept All Changes"
        className="accept-btn"
      >
        Accept All
      </button>
      <button
        type="button"
        onClick={() => editor.commands.rejectAllChanges()}
        title="Reject All Changes"
        className="reject-btn"
      >
        Reject All
      </button>
    </div>
  );
}
