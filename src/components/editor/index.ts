/**
 * Editor Components
 */

// TipTap editor with full formatting and track changes
export { TipTapEditor, type TipTapEditorRef, type TipTapEditorProps } from './TipTapEditor';
export {
  TrackChangeExtension,
  TrackInsertionMark,
  TrackDeletionMark,
  getTrackedChangesFromEditor,
  getTrackedChanges,
  clearTrackedChanges,
  type TrackedChange,
  type TrackChangeSource,
} from './TrackChangeExtension';

// Document search utility
export { findTextPosition, findAndSelectText } from './utils/documentSearch';

// Simple HTML editor (alternative without TipTap)
export { HtmlEditor, type HtmlEditorRef, type HtmlEditorProps } from './HtmlEditor';
