/**
 * TipTap Document Editor - rich text editor with track changes support.
 * Includes inline source labels for track changes (style/integrity/plagiarism).
 */
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { Image } from '@tiptap/extension-image';
import { Extension } from '@tiptap/core';
import { useCallback, useImperativeHandle, forwardRef, useState, useMemo, useEffect, useRef } from 'react';
import {
  TrackChangeExtension, TrackInsertionMark, TrackDeletionMark,
  getTrackedChangesFromEditor, type TrackedChange, type TrackChangeSource,
} from './TrackChangeExtension';
import { findAndSelectText } from './utils/documentSearch';
import { EditorFormattingToolbar } from './EditorFormattingToolbar';
import { TrackChangesToolbar } from './TrackChangesToolbar';
import { TrackedChangesPanel } from './TrackedChangesPanel';
import './TipTapEditor.css';

// Custom FontSize extension — preserves inline font-size from LibreOffice/Pandoc HTML
const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (element) => element.style.fontSize || null,
          renderHTML: (attributes) => {
            if (!attributes.fontSize) return {};
            return { style: `font-size: ${attributes.fontSize}` };
          },
        },
      },
    }];
  },
});

type TrackChangeStorage = { trackChange?: { enabled: boolean } };

export interface TipTapEditorRef {
  getContent: () => string;
  getHTML: () => string;
  setContent: (content: string) => void;
  findAndSelect: (text: string) => boolean;
  replaceWithTracking: (searchText: string, replaceText: string, source?: TrackChangeSource) => boolean;
  acceptAllChanges: () => void;
  rejectAllChanges: () => void;
  getTrackedChanges: () => TrackedChange[];
  enableTrackChanges: () => void;
  disableTrackChanges: () => void;
  isTrackChangesEnabled: () => boolean;
}

export interface TipTapEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  onSelectionChange?: (selection: { from: number; to: number; text: string }) => void;
  trackChangesEnabled?: boolean;
  userId?: string;
  userName?: string;
  className?: string;
  readOnly?: boolean;
}

export const TipTapEditor = forwardRef<TipTapEditorRef, TipTapEditorProps>(
  ({ initialContent = '<p>Start typing...</p>', onChange, onSelectionChange,
    trackChangesEnabled = true, userId = 'user', userName = 'User',
    className = '', readOnly = false }, ref) => {
    const [showChangesPanel, setShowChangesPanel] = useState(false);
    const [, setRenderTick] = useState(0);
    const [wordCount, setWordCount] = useState(0);
    const [charCount, setCharCount] = useState(0);
    const contentRef = useRef<HTMLDivElement>(null);

    // Extract <style> blocks from backend fullHtml so TipTap doesn't discard them
    const { docStyles, cleanContent } = useMemo(() => {
      const styleRegex = /<style[^>]*>[\s\S]*?<\/style>/gi;
      const matches = initialContent.match(styleRegex) || [];
      const clean = initialContent.replace(styleRegex, '').trim();
      // Rewrite .docx-content selectors to target ProseMirror inside our editor
      const rewritten = matches.join('\n').replace(/\.docx-content/g, '.tiptap-content .ProseMirror');
      return { docStyles: rewritten, cleanContent: clean };
    }, [initialContent]);

    // Inject the rewritten document styles into the editor container
    useEffect(() => {
      if (!docStyles || !contentRef.current) return;
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-docx-styles', 'true');
      styleEl.textContent = docStyles.replace(/<\/?style[^>]*>/gi, '');
      contentRef.current.appendChild(styleEl);
      return () => { styleEl.remove(); };
    }, [docStyles]);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Highlight.configure({ multicolor: true }),
        TextStyle,
        Color,
        FontFamily,
        FontSize,
        Table.configure({ resizable: true, HTMLAttributes: { class: 'editor-table' } }),
        TableRow, TableHeader, TableCell,
        Superscript, Subscript,
        Image.configure({ inline: true, allowBase64: true }),
        TrackInsertionMark, TrackDeletionMark,
        TrackChangeExtension.configure({
          enabled: trackChangesEnabled, userId, userName,
          onStatusChange: () => {
            // Force React re-render so the toolbar button reflects the new state
            setRenderTick((t) => t + 1);
          },
        }),
      ],
      content: cleanContent,
      editable: !readOnly,
      onUpdate: ({ editor }: { editor: Editor }) => {
        onChange?.(editor.getHTML());
        const text = editor.getText();
        setWordCount(text.split(/\s+/).filter(Boolean).length);
        setCharCount(text.length);
        setRenderTick((t) => t + 1);
      },
      onSelectionUpdate: ({ editor }: { editor: Editor }) => {
        const { from, to } = editor.state.selection;
        onSelectionChange?.({ from, to, text: editor.state.doc.textBetween(from, to) });
      },
    });

    // Inject source label CSS for track changes (workaround for Vite CSS cache on WSL2)
    // Uses ref-counting so the style element persists until the last editor unmounts
    useEffect(() => {
      const id = 'track-change-source-labels';
      const countAttr = 'data-ref-count';
      let existing = document.getElementById(id);
      if (existing) {
        const count = parseInt(existing.getAttribute(countAttr) || '1', 10);
        existing.setAttribute(countAttr, String(count + 1));
      } else {
        existing = document.createElement('style');
        existing.id = id;
        existing.setAttribute(countAttr, '1');
        existing.textContent = `
          .tiptap-content .ProseMirror span.track-insertion[data-source],
          .tiptap-content .ProseMirror span.track-deletion[data-source] { cursor: help; }
          .tiptap-content .ProseMirror span.track-insertion[data-source]::after,
          .tiptap-content .ProseMirror span.track-deletion[data-source]::after {
            content: attr(data-source); font-size: 9px; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.3px; padding: 0 3px;
            border-radius: 2px; margin-left: 2px; vertical-align: super;
            line-height: 1; text-decoration: none; display: none; pointer-events: none;
          }
          .tiptap-content .ProseMirror span.track-insertion[data-source]:hover::after,
          .tiptap-content .ProseMirror span.track-deletion[data-source]:hover::after { display: inline; }
          .tiptap-content .ProseMirror span[data-source="style"]::after { background: #ede9fe; color: #6d28d9; }
          .tiptap-content .ProseMirror span[data-source="integrity"]::after { background: #ccfbf1; color: #0f766e; }
          .tiptap-content .ProseMirror span[data-source="plagiarism"]::after { background: #fef3c7; color: #92400e; }
          .tiptap-content .ProseMirror span[data-source="manual"]::after { background: #f1f5f9; color: #475569; }
        `;
        document.head.appendChild(existing);
      }
      return () => {
        const el = document.getElementById(id);
        if (el) {
          const count = parseInt(el.getAttribute(countAttr) || '1', 10);
          if (count <= 1) { el.remove(); }
          else { el.setAttribute(countAttr, String(count - 1)); }
        }
      };
    }, []);

    const trackedChanges = useMemo(
      () => getTrackedChangesFromEditor(editor),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [editor, editor?.state.doc]
    );

    const findAndSelect = useCallback(
      (searchText: string): boolean => {
        if (!editor) return false;
        return findAndSelectText(editor, searchText);
      },
      [editor]
    );

    const replaceWithTracking = useCallback(
      (searchText: string, replaceText: string, source?: TrackChangeSource): boolean => {
        if (!editor) return false;
        return editor.commands.replaceWithTracking(searchText, replaceText, source);
      },
      [editor]
    );

    useImperativeHandle(ref, () => ({
      getContent: () => editor?.getText() || '',
      getHTML: () => editor?.getHTML() || '',
      setContent: (content: string) => { editor?.commands.setContent(content); },
      findAndSelect,
      replaceWithTracking,
      acceptAllChanges: () => { editor?.commands.acceptAllChanges(); },
      rejectAllChanges: () => { editor?.commands.rejectAllChanges(); },
      getTrackedChanges: () => getTrackedChangesFromEditor(editor),
      enableTrackChanges: () => { editor?.commands.enableTrackChanges(); },
      disableTrackChanges: () => { editor?.commands.disableTrackChanges(); },
      isTrackChangesEnabled: () =>
        (editor?.storage as TrackChangeStorage).trackChange?.enabled ?? false,
    }), [editor, findAndSelect, replaceWithTracking]);

    if (!editor) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      );
    }

    const isTrackingEnabled = (editor.storage as TrackChangeStorage).trackChange?.enabled;

    return (
      <div className={`tiptap-editor-container ${className}`}>
        <div className="tiptap-toolbar">
          <EditorFormattingToolbar editor={editor} />
          <TrackChangesToolbar
            editor={editor}
            isTrackingEnabled={!!isTrackingEnabled}
            trackedChangesCount={trackedChanges.length}
            showChangesPanel={showChangesPanel}
            onToggleChangesPanel={() => setShowChangesPanel(!showChangesPanel)}
          />
        </div>
        <div className="tiptap-main">
          <div ref={contentRef} className="tiptap-content">
            <EditorContent editor={editor} />
          </div>
          {showChangesPanel && (
            <TrackedChangesPanel
              editor={editor}
              trackedChanges={trackedChanges}
              onClose={() => setShowChangesPanel(false)}
            />
          )}
        </div>
        <div className="tiptap-statusbar">
          <span>Words: {wordCount}</span>
          <span>Characters: {charCount}</span>
          {isTrackingEnabled && (
            <span className="track-changes-badge">
              Track Changes: ON | {trackedChanges.length} changes
            </span>
          )}
        </div>
      </div>
    );
  }
);

TipTapEditor.displayName = 'TipTapEditor';

export default TipTapEditor;
