/**
 * Track Changes Extension for TipTap (Mark-Based)
 *
 * Uses ProseMirror marks instead of decorations so that changes:
 * - Survive save/reload (marks serialize to HTML)
 * - Have correct positions after edits
 * - Support reliable accept/reject
 *
 * Marks:
 *   trackInsertion — green underline, text was added
 *   trackDeletion  — red strikethrough, text was removed (kept in doc)
 */

import { Mark, mergeAttributes } from '@tiptap/core';
import type { Editor } from '@tiptap/core';

export type TrackChangeSource = 'style' | 'integrity' | 'plagiarism' | 'manual';

export interface TrackedChange {
  id: string;
  type: 'insertion' | 'deletion';
  from: number;
  to: number;
  text: string;
  userId: string;
  userName: string;
  timestamp: Date;
  source: TrackChangeSource;
}

// ─── trackInsertion mark ───────────────────────────────────────────────

export const TrackInsertionMark = Mark.create({
  name: 'trackInsertion',
  priority: 1000,
  keepOnSplit: true,

  addAttributes() {
    return {
      changeId: { default: null },
      userId: { default: null },
      userName: { default: null },
      timestamp: { default: null },
      source: { default: 'manual' },
    };
  },

  parseHTML() {
    return [{
      tag: 'span.track-insertion',
      getAttrs: (el) => {
        const dom = el as HTMLElement;
        return { source: dom.getAttribute('data-source') || 'manual' };
      },
    }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'track-insertion',
        'data-change-id': HTMLAttributes.changeId,
        'data-user': HTMLAttributes.userName,
        'data-source': HTMLAttributes.source || 'manual',
      }),
      0,
    ];
  },
});

// ─── trackDeletion mark ────────────────────────────────────────────────

export const TrackDeletionMark = Mark.create({
  name: 'trackDeletion',
  priority: 1000,
  keepOnSplit: true,
  inclusive: false,

  addAttributes() {
    return {
      changeId: { default: null },
      userId: { default: null },
      userName: { default: null },
      timestamp: { default: null },
      source: { default: 'manual' },
    };
  },

  parseHTML() {
    return [{
      tag: 'span.track-deletion',
      getAttrs: (el) => {
        const dom = el as HTMLElement;
        return { source: dom.getAttribute('data-source') || 'manual' };
      },
    }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'track-deletion',
        'data-change-id': HTMLAttributes.changeId,
        'data-user': HTMLAttributes.userName,
        'data-source': HTMLAttributes.source || 'manual',
      }),
      0,
    ];
  },
});

// ─── helpers ───────────────────────────────────────────────────────────

let changeIdCounter = 0;

function generateChangeId(): string {
  return `change-${Date.now()}-${++changeIdCounter}`;
}

function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\u00A0]/g, ' ')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .trim();
}

/**
 * Search full document text for `search` and return the ProseMirror
 * position range. Handles text that spans multiple nodes.
 */
function findTextInDoc(
  editor: Editor,
  search: string
): { from: number; to: number } | null {
  const doc = editor.state.doc;

  // Build a flat string of all text with position mapping
  const chunks: { text: string; pos: number }[] = [];
  let fullText = '';

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      chunks.push({ text: node.text, pos });
      fullText += node.text;
    } else if (node.isBlock && fullText.length > 0) {
      // Add a space for block boundaries to avoid false joins
      chunks.push({ text: ' ', pos: -1 });
      fullText += ' ';
    }
  });

  // Strategy 1: exact match on full text
  let idx = fullText.indexOf(search);
  if (idx === -1) {
    // Strategy 2: normalized match
    const normFull = normalizeText(fullText);
    const normSearch = normalizeText(search);
    idx = normFull.indexOf(normSearch);
    if (idx === -1 && search.length > 30) {
      // Strategy 3: partial (first 30 chars)
      const shortSearch = normalizeText(search.substring(0, 30));
      idx = normFull.indexOf(shortSearch);
    }
    if (idx === -1) return null;
  }

  // Map string index back to document position
  let charOffset = 0;
  let fromPos = -1;
  let toPos = -1;
  const matchLen = search.length;

  for (const chunk of chunks) {
    const chunkEnd = charOffset + chunk.text.length;

    if (fromPos === -1 && idx < chunkEnd) {
      const offsetInChunk = idx - charOffset;
      fromPos = chunk.pos === -1 ? fromPos : chunk.pos + offsetInChunk;
    }

    if (fromPos !== -1 && idx + matchLen <= chunkEnd) {
      const offsetInChunk = idx + matchLen - charOffset;
      toPos = chunk.pos === -1 ? toPos : chunk.pos + offsetInChunk;
      break;
    }

    charOffset = chunkEnd;
  }

  if (fromPos === -1 || toPos === -1) return null;
  return { from: fromPos, to: toPos };
}

// ─── public API ────────────────────────────────────────────────────────

// Track-changes enabled flag (module-level so commands can read it)
let trackingEnabled = true;
let trackingUserId = 'anonymous';
let trackingUserName = 'Anonymous User';

/**
 * Scan the editor document for trackInsertion / trackDeletion marks
 * and return them as TrackedChange objects.
 */
export function getTrackedChangesFromEditor(editor: Editor | null): TrackedChange[] {
  if (!editor) return [];

  const changes: TrackedChange[] = [];
  const doc = editor.state.doc;

  doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (mark.type.name === 'trackInsertion' || mark.type.name === 'trackDeletion') {
        changes.push({
          id: mark.attrs.changeId || `pos-${pos}`,
          type: mark.type.name === 'trackInsertion' ? 'insertion' : 'deletion',
          from: pos,
          to: pos + node.nodeSize,
          text: node.text || '',
          userId: mark.attrs.userId || '',
          userName: mark.attrs.userName || '',
          timestamp: mark.attrs.timestamp ? new Date(mark.attrs.timestamp) : new Date(),
          source: (mark.attrs.source as TrackChangeSource) || 'manual',
        });
      }
    }
  });

  return changes;
}

/** Backwards-compatible wrapper (no-op when called without editor). */
export function getTrackedChanges(): TrackedChange[] {
  return [];
}

/** Clear all tracked changes from the document. */
export function clearTrackedChanges(): void {
  // No-op — clearing is done via accept/reject commands on the editor.
}

// ─── Main Extension (adds commands + state) ────────────────────────────

export interface TrackChangeOptions {
  enabled: boolean;
  userId: string;
  userName: string;
  onStatusChange?: (enabled: boolean) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    trackChange: {
      enableTrackChanges: () => ReturnType;
      disableTrackChanges: () => ReturnType;
      toggleTrackChanges: () => ReturnType;
      acceptChange: (changeId?: string) => ReturnType;
      rejectChange: (changeId?: string) => ReturnType;
      acceptAllChanges: () => ReturnType;
      rejectAllChanges: () => ReturnType;
      insertWithTracking: (text: string) => ReturnType;
      deleteWithTracking: () => ReturnType;
      replaceWithTracking: (searchText: string, replaceText: string, source?: TrackChangeSource) => ReturnType;
    };
  }
}

import { Extension } from '@tiptap/core';

export const TrackChangeExtension = Extension.create<TrackChangeOptions>({
  name: 'trackChange',

  addOptions() {
    return {
      enabled: true,
      userId: 'anonymous',
      userName: 'Anonymous User',
      onStatusChange: undefined,
    };
  },

  addStorage() {
    return {
      enabled: this.options.enabled,
    };
  },

  onCreate() {
    trackingEnabled = this.options.enabled;
    trackingUserId = this.options.userId;
    trackingUserName = this.options.userName;
  },

  addCommands() {
    return {
      enableTrackChanges:
        () =>
        ({ editor }: { editor: Editor }) => {
          trackingEnabled = true;
          this.storage.enabled = true;
          this.options.onStatusChange?.(true);
          // Force re-render
          editor.view.dispatch(editor.state.tr);
          return true;
        },

      disableTrackChanges:
        () =>
        ({ editor }: { editor: Editor }) => {
          trackingEnabled = false;
          this.storage.enabled = false;
          this.options.onStatusChange?.(false);
          editor.view.dispatch(editor.state.tr);
          return true;
        },

      toggleTrackChanges:
        () =>
        ({ commands }) => {
          if (trackingEnabled) {
            return commands.disableTrackChanges();
          }
          return commands.enableTrackChanges();
        },

      insertWithTracking:
        (text: string) =>
        ({ editor, tr, dispatch }) => {
          if (!dispatch) return true;
          const { from } = editor.state.selection;
          const changeId = generateChangeId();

          const insertionMark = editor.schema.marks.trackInsertion.create({
            changeId,
            userId: trackingUserId,
            userName: trackingUserName,
            timestamp: new Date().toISOString(),
          });

          const textNode = editor.schema.text(text, [insertionMark]);
          tr.insert(from, textNode);
          dispatch(tr);
          return true;
        },

      deleteWithTracking:
        () =>
        ({ editor, tr, dispatch }) => {
          if (!dispatch) return true;
          const { from, to } = editor.state.selection;
          if (from === to) return false;

          const changeId = generateChangeId();

          const deletionMark = editor.schema.marks.trackDeletion.create({
            changeId,
            userId: trackingUserId,
            userName: trackingUserName,
            timestamp: new Date().toISOString(),
          });

          tr.addMark(from, to, deletionMark);
          dispatch(tr);
          return true;
        },

      replaceWithTracking:
        (searchText: string, replaceText: string, source?: TrackChangeSource) =>
        ({ editor, tr, dispatch }) => {
          if (!dispatch) return true;

          const match = findTextInDoc(editor, searchText);
          if (!match) return false;

          const { from, to } = match;
          const deleteId = generateChangeId();
          const insertId = generateChangeId();
          const changeSource = source || 'manual';

          // 1. Mark the original text as deleted (keep it in the doc)
          const deletionMark = editor.schema.marks.trackDeletion.create({
            changeId: deleteId,
            userId: trackingUserId,
            userName: trackingUserName,
            timestamp: new Date().toISOString(),
            source: changeSource,
          });
          tr.addMark(from, to, deletionMark);

          // 2. Insert replacement text right after, with insertion mark
          const insertionMark = editor.schema.marks.trackInsertion.create({
            changeId: insertId,
            userId: trackingUserId,
            userName: trackingUserName,
            timestamp: new Date().toISOString(),
            source: changeSource,
          });
          const textNode = editor.schema.text(replaceText, [insertionMark]);
          tr.insert(to, textNode);

          dispatch(tr);
          return true;
        },

      acceptChange:
        (changeId?: string) =>
        ({ editor, tr, dispatch }) => {
          if (!dispatch) return true;

          const doc = editor.state.doc;
          let handled = false;

          // Collect ranges to process (reverse order for safe mutations)
          const ops: { type: 'removeInsertionMark' | 'deleteDeletionText'; from: number; to: number }[] = [];

          doc.descendants((node, pos) => {
            if (!node.isText) return;
            for (const mark of node.marks) {
              const isTarget = changeId
                ? mark.attrs.changeId === changeId
                : (mark.type.name === 'trackInsertion' || mark.type.name === 'trackDeletion') &&
                  pos <= editor.state.selection.from &&
                  pos + node.nodeSize >= editor.state.selection.from;

              if (!isTarget) continue;

              if (mark.type.name === 'trackInsertion') {
                // Accept insertion → keep text, remove mark
                ops.push({ type: 'removeInsertionMark', from: pos, to: pos + node.nodeSize });
              } else if (mark.type.name === 'trackDeletion') {
                // Accept deletion → remove the deleted text
                ops.push({ type: 'deleteDeletionText', from: pos, to: pos + node.nodeSize });
              }
            }
          });

          // Process in reverse document order to maintain positions
          ops.sort((a, b) => b.from - a.from);

          for (const op of ops) {
            if (op.type === 'removeInsertionMark') {
              tr.removeMark(op.from, op.to, editor.schema.marks.trackInsertion);
              handled = true;
            } else {
              tr.delete(op.from, op.to);
              handled = true;
            }
          }

          if (handled) dispatch(tr);
          return handled;
        },

      rejectChange:
        (changeId?: string) =>
        ({ editor, tr, dispatch }) => {
          if (!dispatch) return true;

          const doc = editor.state.doc;
          let handled = false;

          const ops: { type: 'deleteInsertionText' | 'removeDeletionMark'; from: number; to: number }[] = [];

          doc.descendants((node, pos) => {
            if (!node.isText) return;
            for (const mark of node.marks) {
              const isTarget = changeId
                ? mark.attrs.changeId === changeId
                : (mark.type.name === 'trackInsertion' || mark.type.name === 'trackDeletion') &&
                  pos <= editor.state.selection.from &&
                  pos + node.nodeSize >= editor.state.selection.from;

              if (!isTarget) continue;

              if (mark.type.name === 'trackInsertion') {
                // Reject insertion → remove the inserted text
                ops.push({ type: 'deleteInsertionText', from: pos, to: pos + node.nodeSize });
              } else if (mark.type.name === 'trackDeletion') {
                // Reject deletion → keep text, remove mark (restore)
                ops.push({ type: 'removeDeletionMark', from: pos, to: pos + node.nodeSize });
              }
            }
          });

          // Process in reverse
          ops.sort((a, b) => b.from - a.from);

          for (const op of ops) {
            if (op.type === 'deleteInsertionText') {
              tr.delete(op.from, op.to);
              handled = true;
            } else {
              tr.removeMark(op.from, op.to, editor.schema.marks.trackDeletion);
              handled = true;
            }
          }

          if (handled) dispatch(tr);
          return handled;
        },

      acceptAllChanges:
        () =>
        ({ editor, tr, dispatch }) => {
          if (!dispatch) return true;

          const doc = editor.state.doc;
          const deletions: { from: number; to: number }[] = [];
          const insertions: { from: number; to: number }[] = [];

          doc.descendants((node, pos) => {
            if (!node.isText) return;
            for (const mark of node.marks) {
              if (mark.type.name === 'trackDeletion') {
                deletions.push({ from: pos, to: pos + node.nodeSize });
              } else if (mark.type.name === 'trackInsertion') {
                insertions.push({ from: pos, to: pos + node.nodeSize });
              }
            }
          });

          // Remove insertion marks first (keep text)
          for (const ins of insertions) {
            tr.removeMark(ins.from, ins.to, editor.schema.marks.trackInsertion);
          }

          // Delete deletion-marked text in reverse order
          deletions.sort((a, b) => b.from - a.from);
          for (const del of deletions) {
            tr.delete(del.from, del.to);
          }

          dispatch(tr);
          return true;
        },

      rejectAllChanges:
        () =>
        ({ editor, tr, dispatch }) => {
          if (!dispatch) return true;

          const doc = editor.state.doc;
          const insertions: { from: number; to: number }[] = [];
          const deletions: { from: number; to: number }[] = [];

          doc.descendants((node, pos) => {
            if (!node.isText) return;
            for (const mark of node.marks) {
              if (mark.type.name === 'trackInsertion') {
                insertions.push({ from: pos, to: pos + node.nodeSize });
              } else if (mark.type.name === 'trackDeletion') {
                deletions.push({ from: pos, to: pos + node.nodeSize });
              }
            }
          });

          // Remove deletion marks first (restore text)
          for (const del of deletions) {
            tr.removeMark(del.from, del.to, editor.schema.marks.trackDeletion);
          }

          // Delete insertion-marked text in reverse order
          insertions.sort((a, b) => b.from - a.from);
          for (const ins of insertions) {
            tr.delete(ins.from, ins.to);
          }

          dispatch(tr);
          return true;
        },
    };
  },
});

export default TrackChangeExtension;
