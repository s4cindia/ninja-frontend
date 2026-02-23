/**
 * Track Changes Extension for TipTap
 *
 * Provides Microsoft Word-like track changes functionality:
 * - Insertions shown with green underline
 * - Deletions shown with red strikethrough
 * - Accept/Reject individual or all changes
 *
 * Based on: https://github.com/chenyuncai/tiptap-track-change-extension
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
// import { Mark, MarkType } from '@tiptap/pm/model';

export interface TrackChangeOptions {
  enabled: boolean;
  userId: string;
  userName: string;
  onStatusChange?: (enabled: boolean) => void;
}

export interface TrackedChange {
  id: string;
  type: 'insertion' | 'deletion';
  from: number;
  to: number;
  text: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    trackChange: {
      enableTrackChanges: () => ReturnType;
      disableTrackChanges: () => ReturnType;
      toggleTrackChanges: () => ReturnType;
      acceptChange: () => ReturnType;
      rejectChange: () => ReturnType;
      acceptAllChanges: () => ReturnType;
      rejectAllChanges: () => ReturnType;
      insertWithTracking: (text: string) => ReturnType;
      deleteWithTracking: () => ReturnType;
      replaceWithTracking: (searchText: string, replaceText: string) => ReturnType;
    };
  }
}

export const trackChangePluginKey = new PluginKey('trackChange');

// Storage for tracked changes
const trackedChanges: Map<string, TrackedChange> = new Map();

// Normalize text for comparison (handle whitespace and special chars)
function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .replace(/[\u00A0]/g, ' ')  // Replace non-breaking spaces
    .replace(/['']/g, "'")  // Normalize quotes
    .replace(/[""]/g, '"')
    .trim();
}
let changeIdCounter = 0;

function generateChangeId(): string {
  return `change-${Date.now()}-${++changeIdCounter}`;
}

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
      changes: trackedChanges,
    };
  },

  addCommands() {
    return {
      enableTrackChanges:
        () =>
        ({ editor }) => {
          this.storage.enabled = true;
          this.options.onStatusChange?.(true);
          editor.view.dispatch(editor.state.tr);
          return true;
        },

      disableTrackChanges:
        () =>
        ({ editor }) => {
          this.storage.enabled = false;
          this.options.onStatusChange?.(false);
          editor.view.dispatch(editor.state.tr);
          return true;
        },

      toggleTrackChanges:
        () =>
        ({ commands }) => {
          if (this.storage.enabled) {
            return commands.disableTrackChanges();
          }
          return commands.enableTrackChanges();
        },

      insertWithTracking:
        (text: string) =>
        ({ editor, chain }) => {
          const { from } = editor.state.selection;
          const changeId = generateChangeId();

          // Store the change
          trackedChanges.set(changeId, {
            id: changeId,
            type: 'insertion',
            from,
            to: from + text.length,
            text,
            userId: this.options.userId,
            userName: this.options.userName,
            timestamp: new Date(),
          });

          return chain()
            .insertContent(`<span class="track-insertion" data-change-id="${changeId}">${text}</span>`)
            .run();
        },

      deleteWithTracking:
        () =>
        ({ editor, chain }) => {
          const { from, to } = editor.state.selection;
          const selectedText = editor.state.doc.textBetween(from, to);

          if (!selectedText) return false;

          const changeId = generateChangeId();

          // Store the change
          trackedChanges.set(changeId, {
            id: changeId,
            type: 'deletion',
            from,
            to,
            text: selectedText,
            userId: this.options.userId,
            userName: this.options.userName,
            timestamp: new Date(),
          });

          // Replace with deletion mark instead of actually deleting
          return chain()
            .setMeta('trackChange', { type: 'delete', changeId })
            .run();
        },

      replaceWithTracking:
        (searchText: string, replaceText: string) =>
        ({ editor, chain }) => {
          // Find the text in the document
          const doc = editor.state.doc;
          let found = false;
          let foundFrom = 0;
          let foundTo = 0;
          let actualSearchText = searchText; // Track the actual matched text

          const normalizedSearch = normalizeText(searchText);
          console.log('[TrackChange] Searching for:', normalizedSearch.substring(0, 50));

          // Strategy 1: Exact match
          doc.descendants((node, nodePos) => {
            if (found) return false;
            if (node.isText) {
              const text = node.text || '';
              const index = text.indexOf(searchText);
              if (index !== -1) {
                foundFrom = nodePos + index;
                foundTo = foundFrom + searchText.length;
                actualSearchText = searchText;
                found = true;
                console.log('[TrackChange] Exact match found at position:', foundFrom);
                return false;
              }
            }
            return true;
          });

          // Strategy 2: Normalized match
          if (!found) {
            doc.descendants((node, nodePos) => {
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
                  // Find the end position
                  let actualEndIndex = actualIndex;
                  let matchLength = 0;
                  while (matchLength < normalizedSearch.length && actualEndIndex < text.length) {
                    if (text[actualEndIndex] !== ' ' || normalizedSearch[matchLength] === ' ') {
                      matchLength++;
                    }
                    actualEndIndex++;
                  }
                  foundFrom = nodePos + actualIndex;
                  foundTo = nodePos + actualEndIndex;
                  actualSearchText = text.substring(actualIndex, actualEndIndex);
                  found = true;
                  console.log('[TrackChange] Normalized match found at position:', foundFrom);
                  return false;
                }
              }
              return true;
            });
          }

          // Strategy 3: Partial match (first 30 chars) for long text
          if (!found && searchText.length > 30) {
            const shortSearch = normalizeText(searchText.substring(0, 30));
            doc.descendants((node, nodePos) => {
              if (found) return false;
              if (node.isText) {
                const text = node.text || '';
                const normalizedText = normalizeText(text);
                const index = normalizedText.indexOf(shortSearch);
                if (index !== -1) {
                  foundFrom = nodePos + index;
                  foundTo = foundFrom + Math.min(searchText.length, text.length - index);
                  actualSearchText = text.substring(index, Math.min(index + searchText.length, text.length));
                  found = true;
                  console.log('[TrackChange] Partial match found at position:', foundFrom);
                  return false;
                }
              }
              return true;
            });
          }

          if (!found) {
            console.log('[TrackChange] Could not find position for:', searchText.substring(0, 50));
            return false;
          }

          console.log('[TrackChange] Found text at position:', foundFrom, '-', foundTo);

          // Create deletion change (use actual matched text, not search text)
          const deleteChangeId = generateChangeId();
          trackedChanges.set(deleteChangeId, {
            id: deleteChangeId,
            type: 'deletion',
            from: foundFrom,
            to: foundTo,
            text: actualSearchText,
            userId: this.options.userId,
            userName: this.options.userName,
            timestamp: new Date(),
          });

          // Create insertion change
          const insertChangeId = generateChangeId();
          trackedChanges.set(insertChangeId, {
            id: insertChangeId,
            type: 'insertion',
            from: foundFrom,
            to: foundFrom + replaceText.length,
            text: replaceText,
            userId: this.options.userId,
            userName: this.options.userName,
            timestamp: new Date(),
          });

          // Apply the replacement with tracking marks
          return chain()
            .setTextSelection({ from: foundFrom, to: foundTo })
            .deleteSelection()
            .insertContent(replaceText)
            .setTextSelection({ from: foundFrom, to: foundFrom + replaceText.length })
            .run();
        },

      acceptChange:
        () =>
        ({ editor }) => {
          // Accept the change at current selection
          const { from } = editor.state.selection;

          // Find change at this position
          for (const [id, change] of trackedChanges) {
            if (from >= change.from && from <= change.to) {
              trackedChanges.delete(id);
              editor.view.dispatch(editor.state.tr);
              return true;
            }
          }
          return false;
        },

      rejectChange:
        () =>
        ({ editor, chain }) => {
          const { from } = editor.state.selection;

          // Find change at this position
          for (const [id, change] of trackedChanges) {
            if (from >= change.from && from <= change.to) {
              if (change.type === 'insertion') {
                // Remove inserted text
                chain()
                  .setTextSelection({ from: change.from, to: change.to })
                  .deleteSelection()
                  .run();
              } else {
                // Restore deleted text
                chain()
                  .insertContentAt(change.from, change.text)
                  .run();
              }
              trackedChanges.delete(id);
              return true;
            }
          }
          return false;
        },

      acceptAllChanges:
        () =>
        ({ editor }) => {
          trackedChanges.clear();
          editor.view.dispatch(editor.state.tr);
          return true;
        },

      rejectAllChanges:
        () =>
        ({ chain }) => {
          // Process in reverse order to maintain positions
          const changes = Array.from(trackedChanges.values()).sort((a, b) => b.from - a.from);

          for (const change of changes) {
            if (change.type === 'insertion') {
              chain()
                .setTextSelection({ from: change.from, to: change.to })
                .deleteSelection()
                .run();
            }
          }

          trackedChanges.clear();
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: trackChangePluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, _oldDecorations) {
            // Rebuild decorations based on tracked changes
            const decorations: Decoration[] = [];

            for (const [id, change] of trackedChanges) {
              const className = change.type === 'insertion'
                ? 'track-insertion'
                : 'track-deletion';

              try {
                const deco = Decoration.inline(change.from, change.to, {
                  class: className,
                  'data-change-id': id,
                  'data-user': change.userName,
                  title: `${change.type === 'insertion' ? 'Added' : 'Deleted'} by ${change.userName}`,
                });
                decorations.push(deco);
              } catch (e) {
                // Position may be invalid after document changes
              }
            }

            return DecorationSet.create(tr.doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

export default TrackChangeExtension;

// Export helper to get all tracked changes
export function getTrackedChanges(): TrackedChange[] {
  return Array.from(trackedChanges.values());
}

// Export helper to clear all tracked changes
export function clearTrackedChanges(): void {
  trackedChanges.clear();
}
