/**
 * TipTap Document Editor
 *
 * Rich text editor with:
 * - Full formatting support (tables, superscript, subscript, images)
 * - Track changes with inline highlighting
 * - Accept/Reject UI for each change
 */

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { Image } from '@tiptap/extension-image';
import type { Node } from '@tiptap/pm/model';
import { useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import { TrackChangeExtension, getTrackedChanges, type TrackedChange } from './TrackChangeExtension';

import './TipTapEditor.css';

export interface TipTapEditorRef {
  getContent: () => string;
  getHTML: () => string;
  setContent: (content: string) => void;
  findAndSelect: (text: string) => boolean;
  replaceWithTracking: (searchText: string, replaceText: string) => boolean;
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
  (
    {
      initialContent = '<p>Start typing...</p>',
      onChange,
      onSelectionChange,
      trackChangesEnabled = true,
      userId = 'user',
      userName = 'User',
      className = '',
      readOnly = false,
    },
    ref
  ) => {
    const [showChangesPanel, setShowChangesPanel] = useState(false);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          // Disable default table since we use extension
          heading: {
            levels: [1, 2, 3, 4, 5, 6],
          },
        }),
        Underline,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Highlight.configure({
          multicolor: true,
        }),
        // Table support
        Table.configure({
          resizable: true,
          HTMLAttributes: {
            class: 'editor-table',
          },
        }),
        TableRow,
        TableHeader,
        TableCell,
        // Superscript and subscript
        Superscript,
        Subscript,
        // Image support
        Image.configure({
          inline: true,
          allowBase64: true,
        }),
        // Track changes
        TrackChangeExtension.configure({
          enabled: trackChangesEnabled,
          userId,
          userName,
          onStatusChange: (enabled: boolean) => {
            console.log('[TipTapEditor] Track changes:', enabled ? 'enabled' : 'disabled');
          },
        }),
      ],
      content: initialContent,
      editable: !readOnly,
      onUpdate: ({ editor }: { editor: Editor }) => {
        onChange?.(editor.getHTML());
      },
      onSelectionUpdate: ({ editor }: { editor: Editor }) => {
        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to);
        onSelectionChange?.({ from, to, text });
      },
    });

    // Normalize text for comparison (handle whitespace and special chars)
    const normalizeText = (text: string): string => {
      return text
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .replace(/[\u00A0]/g, ' ')  // Replace non-breaking spaces
        .replace(/['']/g, "'")  // Normalize quotes
        .replace(/[""]/g, '"')
        .trim();
    };

    // Find and select text in the document
    const findAndSelect = useCallback(
      (searchText: string): boolean => {
        if (!editor) return false;

        const doc = editor.state.doc;
        let found = false;
        let foundFrom = 0;
        let foundTo = 0;

        const normalizedSearch = normalizeText(searchText);
        console.log('[TipTapEditor] Searching for:', normalizedSearch.substring(0, 50));

        // First try exact match
        doc.descendants((node: Node, pos: number) => {
          if (found) return false;
          if (node.isText) {
            const text = node.text || '';
            const index = text.indexOf(searchText);
            if (index !== -1) {
              foundFrom = pos + index;
              foundTo = foundFrom + searchText.length;
              found = true;
              console.log('[TipTapEditor] Exact match found at position:', foundFrom);
              return false;
            }
          }
          return true;
        });

        // If not found, try normalized match
        if (!found) {
          doc.descendants((node: Node, pos: number) => {
            if (found) return false;
            if (node.isText) {
              const text = node.text || '';
              const normalizedText = normalizeText(text);
              const index = normalizedText.indexOf(normalizedSearch);
              if (index !== -1) {
                // Find the actual position in the original text
                let actualIndex = 0;
                let normalizedIndex = 0;
                while (normalizedIndex < index && actualIndex < text.length) {
                  if (text[actualIndex] !== ' ' || normalizedText[normalizedIndex] === ' ') {
                    normalizedIndex++;
                  }
                  actualIndex++;
                }
                foundFrom = pos + actualIndex;
                foundTo = foundFrom + searchText.length;
                found = true;
                console.log('[TipTapEditor] Normalized match found at position:', foundFrom);
                return false;
              }
            }
            return true;
          });
        }

        // If still not found, try searching for a shorter substring (first 30 chars)
        if (!found && searchText.length > 30) {
          const shortSearch = normalizeText(searchText.substring(0, 30));
          doc.descendants((node: Node, pos: number) => {
            if (found) return false;
            if (node.isText) {
              const text = node.text || '';
              const normalizedText = normalizeText(text);
              const index = normalizedText.indexOf(shortSearch);
              if (index !== -1) {
                foundFrom = pos + index;
                foundTo = foundFrom + Math.min(searchText.length, text.length - index);
                found = true;
                console.log('[TipTapEditor] Partial match found at position:', foundFrom);
                return false;
              }
            }
            return true;
          });
        }

        if (found) {
          editor
            .chain()
            .focus()
            .setTextSelection({ from: foundFrom, to: foundTo })
            .scrollIntoView()
            .run();

          // Add temporary highlight
          setTimeout(() => {
            editor.chain().setHighlight({ color: '#fef08a' }).run();
            setTimeout(() => {
              editor.chain().unsetHighlight().run();
            }, 2000);
          }, 100);

          return true;
        }

        console.log('[TipTapEditor] Text not found:', searchText.substring(0, 50));
        return false;
      },
      [editor]
    );

    // Replace text with tracking
    const replaceWithTracking = useCallback(
      (searchText: string, replaceText: string): boolean => {
        if (!editor) return false;
        return editor.commands.replaceWithTracking(searchText, replaceText);
      },
      [editor]
    );

    // Get tracked changes for panel display
    const trackedChanges = getTrackedChanges();

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        getContent: () => editor?.getText() || '',
        getHTML: () => editor?.getHTML() || '',
        setContent: (content: string) => {
          editor?.commands.setContent(content);
        },
        findAndSelect,
        replaceWithTracking,
        acceptAllChanges: () => {
          editor?.commands.acceptAllChanges();
        },
        rejectAllChanges: () => {
          editor?.commands.rejectAllChanges();
        },
        getTrackedChanges,
        enableTrackChanges: () => {
          editor?.commands.enableTrackChanges();
        },
        disableTrackChanges: () => {
          editor?.commands.disableTrackChanges();
        },
        isTrackChangesEnabled: () => {
          return (editor?.storage as { trackChange?: { enabled: boolean } }).trackChange?.enabled ?? false;
        },
      }),
      [editor, findAndSelect, replaceWithTracking]
    );

    if (!editor) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      );
    }

    const isTrackingEnabled = (editor.storage as { trackChange?: { enabled: boolean } }).trackChange?.enabled;

    return (
      <div className={`tiptap-editor-container ${className}`}>
        {/* Toolbar */}
        <div className="tiptap-toolbar">
          <div className="tiptap-toolbar-group">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'is-active' : ''}
              title="Bold (Ctrl+B)"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'is-active' : ''}
              title="Italic (Ctrl+I)"
            >
              <em>I</em>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={editor.isActive('underline') ? 'is-active' : ''}
              title="Underline (Ctrl+U)"
            >
              <u>U</u>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={editor.isActive('strike') ? 'is-active' : ''}
              title="Strikethrough"
            >
              <s>S</s>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              className={editor.isActive('superscript') ? 'is-active' : ''}
              title="Superscript"
            >
              X<sup>2</sup>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              className={editor.isActive('subscript') ? 'is-active' : ''}
              title="Subscript"
            >
              X<sub>2</sub>
            </button>
          </div>

          <div className="tiptap-toolbar-divider" />

          <div className="tiptap-toolbar-group">
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
              title="Heading 1"
            >
              H1
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
              title="Heading 2"
            >
              H2
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
              title="Heading 3"
            >
              H3
            </button>
          </div>

          <div className="tiptap-toolbar-divider" />

          <div className="tiptap-toolbar-group">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive('bulletList') ? 'is-active' : ''}
              title="Bullet List"
            >
              • List
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive('orderedList') ? 'is-active' : ''}
              title="Numbered List"
            >
              1. List
            </button>
          </div>

          <div className="tiptap-toolbar-divider" />

          <div className="tiptap-toolbar-group">
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (Ctrl+Y)"
            >
              ↷
            </button>
          </div>

          <div className="tiptap-toolbar-divider" />

          {/* Track Changes Controls */}
          <div className="tiptap-toolbar-group track-changes-controls">
            <button
              onClick={() => editor.commands.toggleTrackChanges()}
              className={isTrackingEnabled ? 'is-active tracking-on' : ''}
              title="Toggle Track Changes"
            >
              {isTrackingEnabled ? '📝 Tracking ON' : '📝 Track'}
            </button>
            <button
              onClick={() => setShowChangesPanel(!showChangesPanel)}
              className={showChangesPanel ? 'is-active' : ''}
              title="Show Changes Panel"
            >
              📋 Changes ({trackedChanges.length})
            </button>
            <button
              onClick={() => editor.commands.acceptAllChanges()}
              title="Accept All Changes"
              className="accept-btn"
            >
              ✓ Accept All
            </button>
            <button
              onClick={() => editor.commands.rejectAllChanges()}
              title="Reject All Changes"
              className="reject-btn"
            >
              ✗ Reject All
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="tiptap-main">
          {/* Editor Content */}
          <EditorContent editor={editor} className="tiptap-content" />

          {/* Changes Panel */}
          {showChangesPanel && trackedChanges.length > 0 && (
            <div className="tiptap-changes-panel">
              <div className="changes-panel-header">
                <h3>Tracked Changes</h3>
                <button onClick={() => setShowChangesPanel(false)}>×</button>
              </div>
              <div className="changes-list">
                {trackedChanges.map((change) => (
                  <div key={change.id} className={`change-item ${change.type}`}>
                    <div className="change-header">
                      <span className={`change-type ${change.type}`}>
                        {change.type === 'insertion' ? '+ Added' : '− Deleted'}
                      </span>
                      <span className="change-user">{change.userName}</span>
                    </div>
                    <div className="change-text">
                      "{change.text.substring(0, 50)}{change.text.length > 50 ? '...' : ''}"
                    </div>
                    <div className="change-actions">
                      <button
                        onClick={() => {
                          editor.chain().focus().setTextSelection(change.from).run();
                          editor.commands.acceptChange();
                        }}
                        className="accept-btn"
                      >
                        ✓ Accept
                      </button>
                      <button
                        onClick={() => {
                          editor.chain().focus().setTextSelection(change.from).run();
                          editor.commands.rejectChange();
                        }}
                        className="reject-btn"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="tiptap-statusbar">
          <span>
            Words: {editor.getText().split(/\s+/).filter(Boolean).length}
          </span>
          <span>
            Characters: {editor.getText().length}
          </span>
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
