/**
 * Editor Components
 */

// TipTap editor with full formatting and track changes
export { TipTapEditor, type TipTapEditorRef, type TipTapEditorProps } from './TipTapEditor';
export { TrackChangeExtension, getTrackedChanges, clearTrackedChanges, type TrackedChange } from './TrackChangeExtension';

// Simple HTML editor (alternative without TipTap)
export { HtmlEditor, type HtmlEditorRef, type HtmlEditorProps } from './HtmlEditor';
