/**
 * Document Search Utility
 *
 * Searches full document text content (across node boundaries)
 * and maps string indices back to ProseMirror positions.
 */

import type { Editor } from '@tiptap/core';

interface PositionChunk {
  text: string;
  /** ProseMirror position of the first character. -1 for synthetic separators. */
  pos: number;
}

function normalizeText(text: string): string {
  return text
    .replace(/[\r\n]+/g, ' ')    // Convert newlines to spaces
    .replace(/\s+/g, ' ')
    .replace(/[\u00A0]/g, ' ')
    .replace(/['\u2018\u2019]/g, "'")
    .replace(/["\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')       // Normalize dashes
    .trim();
}

/** Returns true for whitespace characters including non-breaking space. */
function isWS(code: number): boolean {
  return code === 0x20 || code === 0x09 || code === 0x0A || code === 0x0D ||
         code === 0x0C || code === 0x0B || code === 0xA0;
}

/**
 * Normalize text and build an index map from each normalized character position
 * back to its position in the original string.
 */
function normalizeWithMap(text: string): { normalized: string; indexMap: number[] } {
  const indexMap: number[] = [];
  let result = '';
  let i = 0;
  const len = text.length;

  // Skip leading whitespace (trim start)
  while (i < len && isWS(text.charCodeAt(i))) i++;

  let lastWasSpace = false;

  while (i < len) {
    const code = text.charCodeAt(i);

    if (isWS(code)) {
      if (!lastWasSpace) {
        indexMap.push(i);
        result += ' ';
        lastWasSpace = true;
      }
      i++;
      continue;
    }

    lastWasSpace = false;
    indexMap.push(i);

    // Normalize smart quotes and dashes
    if (code === 0x2018 || code === 0x2019) result += "'";       // '' → '
    else if (code === 0x201C || code === 0x201D) result += '"';  // "" → "
    else if (code === 0x2013 || code === 0x2014) result += '-';  // –— → -
    else result += text[i];

    i++;
  }

  // Trim trailing space
  while (result.endsWith(' ')) {
    result = result.slice(0, -1);
    indexMap.pop();
  }

  return { normalized: result, indexMap };
}

/**
 * Build a flat text string from the document with position mapping.
 */
function buildTextMap(editor: Editor): { fullText: string; chunks: PositionChunk[] } {
  const chunks: PositionChunk[] = [];
  let fullText = '';

  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      chunks.push({ text: node.text, pos });
      fullText += node.text;
    } else if (node.isBlock && fullText.length > 0 && !fullText.endsWith(' ')) {
      chunks.push({ text: ' ', pos: -1 });
      fullText += ' ';
    }
  });

  return { fullText, chunks };
}

/**
 * Map a string index in the flat text back to a ProseMirror document position.
 */
function mapIndexToPos(chunks: PositionChunk[], idx: number): number {
  let charOffset = 0;
  for (const chunk of chunks) {
    const chunkEnd = charOffset + chunk.text.length;
    if (idx < chunkEnd && chunk.pos !== -1) {
      return chunk.pos + (idx - charOffset);
    }
    charOffset = chunkEnd;
  }
  // Fallback: return last known good position
  for (let i = chunks.length - 1; i >= 0; i--) {
    if (chunks[i].pos !== -1) {
      return chunks[i].pos + chunks[i].text.length;
    }
  }
  return 0;
}

export interface SearchResult {
  from: number;
  to: number;
}

/**
 * Find text in the document using multi-strategy search.
 * Returns ProseMirror position range or null.
 */
export function findTextPosition(editor: Editor, search: string): SearchResult | null {
  const { fullText, chunks } = buildTextMap(editor);
  const { normalized: normFull, indexMap: normToFullMap } = normalizeWithMap(fullText);
  const normSearch = normalizeText(search);

  // Skip searches that are too short or just numbers
  if (normSearch.length < 2) return null;

  // Strategy 1: exact match on original text (no mapping needed)
  let idx = fullText.indexOf(search);
  let matchLen = search.length;
  let isNormIdx = false;

  if (idx === -1) {
    // Strategy 2: normalized match
    idx = normFull.indexOf(normSearch);
    matchLen = normSearch.length;
    isNormIdx = true;
  }

  if (idx === -1 && normSearch.length > 30) {
    // Strategy 3: partial (first 40 chars, word-boundary aware)
    let cutoff = 40;
    // Try to cut at a word boundary
    const spaceIdx = normSearch.indexOf(' ', 30);
    if (spaceIdx !== -1 && spaceIdx < 50) cutoff = spaceIdx;
    const shortSearch = normSearch.substring(0, cutoff);
    idx = normFull.indexOf(shortSearch);
    if (idx !== -1) {
      matchLen = shortSearch.length;
      isNormIdx = true;
    }
  }

  if (idx === -1 && normSearch.length > 10) {
    // Strategy 4: try middle portion (edges may be truncated)
    const start = Math.floor(normSearch.length * 0.2);
    const end = Math.min(normSearch.length, start + 50);
    const midSearch = normSearch.substring(start, end).trim();
    if (midSearch.length > 8) {
      idx = normFull.indexOf(midSearch);
      if (idx !== -1) {
        matchLen = midSearch.length;
        isNormIdx = true;
      }
    }
  }

  if (idx === -1) return null;

  // Convert indices: if we matched in normalized text, map back to fullText indices
  let fromFullIdx = idx;
  let toFullIdx = idx + matchLen;

  if (isNormIdx) {
    fromFullIdx = normToFullMap[idx] ?? idx;
    const lastCharNormIdx = idx + matchLen - 1;
    if (lastCharNormIdx < normToFullMap.length) {
      // 'to' position is one past the last matched character in fullText
      toFullIdx = normToFullMap[lastCharNormIdx] + 1;
    } else {
      toFullIdx = fullText.length;
    }
  }

  const from = mapIndexToPos(chunks, fromFullIdx);
  const to = mapIndexToPos(chunks, toFullIdx);

  return { from, to };
}

/**
 * Collect scroll positions of all scrollable ancestors of an element.
 */
function saveParentScrollPositions(el: HTMLElement): Array<{ el: HTMLElement; top: number; left: number }> {
  const saved: Array<{ el: HTMLElement; top: number; left: number }> = [];
  let parent = el.parentElement;
  while (parent) {
    if (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth) {
      saved.push({ el: parent, top: parent.scrollTop, left: parent.scrollLeft });
    }
    parent = parent.parentElement;
  }
  return saved;
}

/**
 * Restore previously saved scroll positions.
 */
function restoreParentScrollPositions(saved: Array<{ el: HTMLElement; top: number; left: number }>) {
  for (const s of saved) {
    s.el.scrollTop = s.top;
    s.el.scrollLeft = s.left;
  }
}

/**
 * Find and select text in the editor with temporary yellow highlight.
 * Scrolls only the editor pane (not the whole page / validator panel).
 */
export function findAndSelectText(editor: Editor, searchText: string): boolean {
  const result = findTextPosition(editor, searchText);
  if (!result) return false;

  const editorDom = editor.view.dom;

  // Save scroll positions of ALL ancestors before focus() — the browser's native
  // focus behaviour scrolls parent containers, which pushes the validator panel
  // out of view.
  const savedScrolls = saveParentScrollPositions(editorDom);

  // Set selection without TipTap's scrollIntoView
  editor
    .chain()
    .focus()
    .setTextSelection({ from: result.from, to: result.to })
    .run();

  // Immediately restore parent scroll positions that the browser moved
  restoreParentScrollPositions(savedScrolls);

  // Now manually scroll only the editor's own scrollable container
  requestAnimationFrame(() => {
    const coords = editor.view.coordsAtPos(result.from);
    // Find the nearest scrollable ancestor (the editor's scroll container)
    let scrollContainer: HTMLElement | null = editorDom.parentElement;
    while (scrollContainer) {
      const overflow = window.getComputedStyle(scrollContainer).overflowY;
      if (overflow === 'auto' || overflow === 'scroll') break;
      scrollContainer = scrollContainer.parentElement;
    }
    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      // Only scroll if the target is outside the visible area of the editor
      if (coords.top < containerRect.top || coords.bottom > containerRect.bottom) {
        const targetScroll = scrollContainer.scrollTop + (coords.top - containerRect.top) - containerRect.height / 3;
        scrollContainer.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    }
  });

  // Temporary highlight
  setTimeout(() => {
    editor.chain().setHighlight({ color: '#fef08a' }).run();
    setTimeout(() => {
      editor.chain().unsetHighlight().run();
    }, 2000);
  }, 100);

  return true;
}
