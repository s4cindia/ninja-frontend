/**
 * Document Viewer Component
 * Displays document content with citation highlighting and clickable links
 */

import type { MouseEvent } from 'react';
import DOMPurify from 'dompurify';
import { Card } from '@/components/ui/Card';

// Debug flag - set to true for verbose logging during development
const DEBUG_CITATIONS = process.env.NODE_ENV === 'development' && false;

// Reference type for APA citation matching
interface ReferenceData {
  id: string;
  number: number;
  authors?: string[];
  year?: string;
}

interface Citation {
  id: string;
  rawText: string;
  paragraphIndex?: number;
  paragraphNumber?: number;
  startOffset: number;
  endOffset: number;
  citationNumber?: number | null;
  referenceNumber?: number | null;
  isOrphaned?: boolean; // Citation points to a deleted reference
}

interface RecentChange {
  citationId: string;
  oldNumber: number;
  newNumber: number | null; // null means orphaned (reference deleted)
  oldText?: string; // Original citation text (e.g., "[3–5]")
  newText?: string; // New citation text after changes (e.g., "[3,4]")
  changeType?: 'style' | 'renumber' | 'deleted' | 'unchanged' | 'reference_edit'; // Type of change
}

interface DocumentViewerProps {
  fullText?: string;
  fullHtml?: string;
  citations: Citation[];
  references?: ReferenceData[]; // References for APA citation matching
  onCitationClick?: (referenceNumber: number) => void;
  recentChanges?: RecentChange[]; // Track recently changed citations
}

// Helper function to escape HTML special characters
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Scroll to a reference in the reference list and highlight it
function scrollToReference(refNumber: number) {
  // Try both naming conventions: ref-{number} and reference-{number}
  const refElement = document.getElementById(`ref-${refNumber}`) ||
                     document.getElementById(`reference-${refNumber}`);
  if (refElement) {
    refElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    refElement.classList.add('highlight-flash');
    setTimeout(() => refElement.classList.remove('highlight-flash'), 2000);
  }
}

// Expand citation ranges like [3-5] to [3, 4, 5]
function expandCitationRange(text: string): number[] {
  const numbers: number[] = [];
  // Match individual numbers and ranges
  const rangePattern = /(\d+)\s*[-–—]\s*(\d+)/g;
  const singlePattern = /\d+/g;

  // First extract ranges
  let match;
  const processedRanges = new Set<string>();
  while ((match = rangePattern.exec(text)) !== null) {
    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);
    processedRanges.add(match[0]);
    if (end > start && end - start < 50) { // Safety limit
      for (let i = start; i <= end; i++) {
        if (!numbers.includes(i)) numbers.push(i);
      }
    }
  }

  // Then extract standalone numbers (not part of ranges)
  const textWithoutRanges = text.replace(rangePattern, ' ');
  while ((match = singlePattern.exec(textWithoutRanges)) !== null) {
    const num = parseInt(match[0], 10);
    if (!numbers.includes(num) && num > 0 && num < 1000) {
      numbers.push(num);
    }
  }

  return numbers.sort((a, b) => a - b);
}

// Generate format variants of a citation text for cross-format matching
// E.g., "(1)" → ["(1)", "[1]"], "(2-4)" → ["(2-4)", "[2-4]", "(2, 3, 4)", "[2,3,4]", ...]
function generateCitationVariants(text: string): string[] {
  const variants = [text];
  const nums = expandCitationRange(text);
  if (nums.length === 0) return variants;

  const isConsecutiveRange = nums.length >= 2 &&
    nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);

  const formats: string[] = [];
  formats.push(nums.join(', '), nums.join(','));
  if (isConsecutiveRange) {
    formats.push(`${nums[0]}-${nums[nums.length - 1]}`);
    formats.push(`${nums[0]}\u2013${nums[nums.length - 1]}`);
  }

  for (const inner of formats) {
    const bracket = `[${inner}]`;
    const paren = `(${inner})`;
    if (!variants.includes(bracket)) variants.push(bracket);
    if (!variants.includes(paren)) variants.push(paren);
  }
  return variants;
}

// Get track changes CSS class based on change type
function getTrackChangeClass(changeType?: string): string {
  switch (changeType) {
    case 'deleted': return 'track-change-deletion';
    case 'style': return 'track-change-addition';
    case 'renumber': return 'track-change-renumber';
    case 'swap': return 'track-change-swap';
    case 'reference_edit': return 'track-change-addition'; // Reference metadata edit
    default: return '';
  }
}

// Build a rich tooltip for a numbered citation by looking up author name and year
// For number-based formats, shows "Author (Year)" instead of just "Reference #N"
function buildRefTooltip(refNumbers: number[], references?: ReferenceData[]): string {
  if (!references || references.length === 0 || refNumbers.length === 0) {
    return refNumbers.length > 0 ? `Reference #${refNumbers.join(', #')}` : 'Citation';
  }

  const parts: string[] = [];
  for (const num of refNumbers) {
    const ref = references.find(r => r.number === num);
    if (ref) {
      const authorPart = ref.authors && ref.authors.length > 0
        ? (ref.authors.length > 2
          ? `${ref.authors[0]} et al.`
          : ref.authors.join(' & '))
        : `Reference #${num}`;
      const yearPart = ref.year ? ` (${ref.year})` : '';
      parts.push(`${authorPart}${yearPart}`);
    } else {
      parts.push(`Reference #${num}`);
    }
  }
  return parts.join('; ');
}

// Parse APA author-year citations and return all matches with their reference numbers
// Handles: "Smith (2020)", "Smith & Jones (2020)", "Smith et al. (2020)", "Smith et al., 2020"
// Also handles multiple citations: "(Brown et al., 2020; Bommasani et al., 2021)"
function parseAllAPACitations(text: string, references: ReferenceData[]): { author: string; year: string; refNumber: number | null; fullMatch: string }[] {
  if (!references || references.length === 0) return [];

  const results: { author: string; year: string; refNumber: number | null; fullMatch: string }[] = [];

  // Split by semicolon for multiple citations in parentheses
  // "(Brown et al., 2020; Bommasani et al., 2021)" -> ["Brown et al., 2020", "Bommasani et al., 2021"]
  const parts = text.replace(/^\(|\)$/g, '').split(/\s*;\s*/);

  for (const part of parts) {
    // Patterns for APA author-year citations (with optional comma before year)
    // Match: "Smith & Jones, 2020" or "Smith et al., 2020" or "Smith, 2020"
    const patterns = [
      { regex: /([A-Z][a-zA-Z'-]+)\s*(&|and)\s*([A-Z][a-zA-Z'-]+),?\s*(\d{4})/i, type: 'two-authors' },
      { regex: /([A-Z][a-zA-Z'-]+)\s+et\s+al\.?,?\s*(\d{4})/i, type: 'et-al' },
      { regex: /([A-Z][a-zA-Z'-]+),?\s*(\d{4})/i, type: 'single' },
    ];

    for (const { regex, type } of patterns) {
      const match = part.match(regex);
      if (match) {
        let authorsToMatch: string[] = [];
        let year: string;
        const fullMatch: string = match[0];

        if (type === 'et-al') {
          authorsToMatch = [match[1]];
          year = match[2];
        } else if (type === 'two-authors') {
          // For "Marcus & Davis", check both authors
          authorsToMatch = [match[1], match[3]];
          year = match[4];
        } else {
          authorsToMatch = [match[1]];
          year = match[2];
        }

        // Find matching reference by checking if ANY citation author matches ANY reference author
        const matchedRef = references.find(ref => {
          if (ref.year !== year) return false;
          if (!ref.authors || ref.authors.length === 0) return false;

          // Extract all author last names from reference
          const refLastNames = ref.authors.map(author => {
            // Handle "LastName, FirstName" or "FirstName LastName" format
            return author.includes(',')
              ? author.split(',')[0].trim().toLowerCase()
              : (author.split(' ').pop()?.trim() || '').toLowerCase();
          });

          // Check if ANY of the citation authors matches ANY reference author
          return authorsToMatch.some(citAuthor =>
            refLastNames.some(refName => citAuthor.toLowerCase() === refName)
          );
        });

        results.push({
          author: authorsToMatch[0], // Primary author for display
          year,
          refNumber: matchedRef?.number || null,
          fullMatch: fullMatch.trim()
        });
        break; // Found a match for this part, move to next
      }
    }
  }

  return results;
}


export default function DocumentViewer({ fullText, fullHtml, citations, references, onCitationClick, recentChanges }: DocumentViewerProps) {
  // Removed auto-hide timer - changes persist until user dismisses them manually

  if (!fullText && !fullHtml) {
    return (
      <Card className="p-8 text-center">
        <div className="text-gray-500">
          <svg
            className="h-12 w-12 mx-auto mb-3 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-lg font-medium">Document content not available</p>
          <p className="text-sm mt-1">
            The document is still being processed. Please refresh in a few moments.
          </p>
        </div>
      </Card>
    );
  }

  // Check if citation was recently changed
  const getChangeInfo = (citation: Citation) => {
    if (!recentChanges || recentChanges.length === 0) return null;

    if (DEBUG_CITATIONS) {
      console.log(`[DocumentViewer] getChangeInfo for citation rawText: "${citation.rawText}"`);
      console.log(`[DocumentViewer] recentChanges count: ${recentChanges.length}`);
    }

    // Match by citationId - this is the most reliable method since IDs are stable
    // across style conversions (text matching fails after round-trip conversions)
    const change = recentChanges.find(c => c.citationId && c.citationId === citation.id);
    if (change) {
      if (DEBUG_CITATIONS) {
        console.log(`[DocumentViewer] Matched by citationId: "${change.oldText}" → "${change.newText}"`);
      }
      return change;
    }

    // Try to match by newText (after conversion, citation.rawText = newText)
    const byNewText = recentChanges.find(c => c.newText === citation.rawText);
    if (byNewText) {
      if (DEBUG_CITATIONS) {
        console.log(`[DocumentViewer] Matched by newText: "${byNewText.oldText}" → "${byNewText.newText}"`);
      }
      return byNewText;
    }

    // Try oldText match for cases where rawText hasn't been updated yet
    const byOldText = recentChanges.find(c => c.oldText === citation.rawText);
    if (byOldText) {
      if (DEBUG_CITATIONS) {
        console.log(`[DocumentViewer] Matched by oldText: "${byOldText.oldText}" → "${byOldText.newText}"`);
      }
      return byOldText;
    }

    if (DEBUG_CITATIONS) {
      console.log(`[DocumentViewer] No match found for "${citation.rawText}"`);
    }
    return null;
  };

  // Highlight citations in HTML (preserves formatting)
  const highlightCitationsInHTML = (html: string) => {
    if (DEBUG_CITATIONS) {
      console.log('[DocumentViewer] highlightCitationsInHTML called');
      console.log('[DocumentViewer] HTML length:', html?.length || 0);
      console.log('[DocumentViewer] Citations array:', citations?.length || 0);
    }

    if (!citations || citations.length === 0) {
      if (DEBUG_CITATIONS) {
        console.log('[DocumentViewer] No citations to highlight - returning original HTML');
      }
      return html;
    }

    // Look for reference section headings to see what HTML structure is around them
    if (DEBUG_CITATIONS) {
      const lowerHtml = html.toLowerCase();
      for (const heading of ['references', 'bibliography', 'footnotes', 'notes', 'works cited']) {
        const textIndex = lowerHtml.indexOf(heading);
        if (textIndex !== -1) {
          // Log 200 characters around the heading to see the HTML structure
          const start = Math.max(0, textIndex - 100);
          const end = Math.min(html.length, textIndex + 100);
          const sample = html.substring(start, end);
          console.log(`[DocumentViewer] HTML around "${heading}":`, sample);
          break;
        }
      }
    }

    // Find and remove References section from HTML
    // Try multiple patterns to catch different HTML structures
    // Include Footnotes/Notes for Chicago/Turabian style
    const patterns = [
      /<p[^>]*>\s*<strong[^>]*>\s*(References|Bibliography|Works Cited|Footnotes|Notes|Endnotes)\s*<\/strong>\s*<\/p>/i,
      /<p[^>]*><b[^>]*>(References|Bibliography|Works Cited|Footnotes|Notes|Endnotes)<\/b><\/p>/i,
      /<h[1-6][^>]*>(References|Bibliography|Works Cited|Footnotes|Notes|Endnotes)<\/h[1-6]>/i,
      /<p[^>]*>\s*<em[^>]*>\s*(References|Bibliography|Works Cited|Footnotes|Notes|Endnotes)\s*<\/em>\s*<\/p>/i,
      // Plain text in paragraph
      /<p[^>]*>\s*(References|Bibliography|Works Cited|Footnotes|Notes|Endnotes)\s*<\/p>/i
    ];

    let contentToHighlight = html;
    let referencesStart = -1;

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match.index !== undefined) {
        referencesStart = match.index;
        if (DEBUG_CITATIONS) {
          console.log('[DocumentViewer] Found References section with pattern:', pattern.toString().substring(0, 50), 'at position:', match.index);
          console.log('[DocumentViewer] Matched text:', match[0]);
        }
        contentToHighlight = html.substring(0, referencesStart);
        break;
      }
    }

    if (referencesStart === -1 && DEBUG_CITATIONS) {
      console.log('[DocumentViewer] References section not found with any pattern');
    }

    let result = contentToHighlight;

    // Sort citations by text length (longest first) to avoid partial matches
    // Also deduplicate by rawText to avoid processing the same text multiple times
    const seenTexts = new Set<string>();
    const sortedCitations = [...citations]
      .sort((a, b) => (b.rawText?.length || 0) - (a.rawText?.length || 0))
      .filter(c => {
        if (!c.rawText || seenTexts.has(c.rawText)) return false;
        seenTexts.add(c.rawText);
        return true;
      });

    if (DEBUG_CITATIONS) {
      console.log('[DocumentViewer] Sample citations:', sortedCitations.slice(0, 3).map(c => ({
        id: c.id,
        rawText: c.rawText,
        referenceNumber: c.referenceNumber
      })));
      console.log(`[DocumentViewer] Processing ${sortedCitations.length} unique citations (from ${citations.length} total)`);
    }

    // TWO-PHASE REPLACEMENT to prevent nested replacements:
    // Phase 1: Replace all citation texts with unique placeholders
    // Phase 2: Replace all placeholders with the actual mark tags
    const placeholderMap = new Map<string, string>(); // placeholder -> markTag
    let placeholderIndex = 0;
    let highlightedCount = 0;

    sortedCitations.forEach(citation => {
      if (!citation.rawText) {
        if (DEBUG_CITATIONS) {
          console.log('[DocumentViewer] Skipping citation with no rawText:', citation.id);
        }
        return;
      }

      const changeInfo = getChangeInfo(citation);

      // Determine color and tooltip based on citation state
      let bgColor = 'bg-yellow-200';
      let hoverColor = 'hover:bg-yellow-300';
      let refInfo = citation.referenceNumber
        ? buildRefTooltip([citation.referenceNumber], references)
        : 'Citation';

      // Determine what text to search for and what to display
      // For changed citations, we search for the OLD text but show the transition
      let searchText = citation.rawText;
      let displayContent = escapeHtml(citation.rawText);
      let markTag = '';
      // Boolean flag to track if markTag was set for track change (avoids fragile string inspection)
      let isTrackChangeMarkTag = false;

      // Helper to render citation numbers as clickable links
      const renderClickableNumbers = (text: string, changeClass?: string): string => {
        // Check if this looks like a numeric citation: [1], [1-3], [1, 2, 3] or (1), (1-3), (1, 2, 3)
        const bracketMatch = text.match(/^\[([^\]]+)\]$/);
        const parenMatch = !bracketMatch ? text.match(/^\(([^)]+)\)$/) : null;
        const match = bracketMatch || parenMatch;
        if (match) {
          const inner = match[1];
          // Only treat as numeric if the inner content is numbers, commas, dashes, spaces
          if (/^[\d\s,\-–—]+$/.test(inner)) {
            const numbers = expandCitationRange(inner);
            if (numbers.length > 0) {
              const open = bracketMatch ? '[' : '(';
              const close = bracketMatch ? ']' : ')';
              const clickableNumbers = numbers.map(n =>
                `<span class="citation-link${changeClass ? ' ' + changeClass : ''}" data-ref="${n}" style="cursor: pointer;">${n}</span>`
              ).join(', ');
              return `${open}${clickableNumbers}${close}`;
            }
          }
        }
        // For non-numeric citations (e.g., parenthetical like "(Author, Year)"),
        // apply the changeClass if provided for track change highlighting
        if (changeClass) {
          return `<span class="${changeClass}">${escapeHtml(text)}</span>`;
        }
        return escapeHtml(text);
      };

      // Changed citation (style conversion or renumbering) - check this FIRST
      // This handles cases where oldText !== newText (style change or renumber)
      if (DEBUG_CITATIONS) {
        console.log(`[DocumentViewer] Checking changeInfo for "${citation.rawText}":`, {
          hasChangeInfo: !!changeInfo,
          oldText: changeInfo?.oldText,
          newText: changeInfo?.newText,
          changeType: changeInfo?.changeType,
          oldEqualsNew: changeInfo?.oldText === changeInfo?.newText
        });
      }

      if (changeInfo && changeInfo.oldText && changeInfo.newText && changeInfo.oldText !== changeInfo.newText) {
        const isRenumber = changeInfo.changeType === 'renumber';
        // For renumber changes, the HTML is already updated with new numbers.
        // Old numbers will falsely match OTHER citations' current numbers (e.g., old "(1)" matches
        // a different citation now showing "(1)"), causing wrong track changes at wrong positions.
        // So for renumber, skip oldTextInHtml and always search by newText.
        // Check oldText in HTML with format variants (e.g., oldText "(1)" but HTML has "[1]")
        const oldTextVariants = !isRenumber ? generateCitationVariants(changeInfo.oldText) : [];
        const oldTextInHtml = oldTextVariants.some(v => html.includes(v));
        // Check newText in HTML with format variants (brackets/parens, spacing, ranges)
        const newTextVariants = generateCitationVariants(changeInfo.newText);
        const newTextInHtml = newTextVariants.some(v => html.includes(v));

        if (oldTextInHtml) {
          // Style conversion: old text still in HTML - show track change format
          const trackClass = getTrackChangeClass(changeInfo.changeType);
          bgColor = `${trackClass || 'track-change-addition'} animate-pulse`;
          hoverColor = 'hover:bg-green-300';
          refInfo = `Updated: ${escapeHtml(changeInfo.newText)} (was ${escapeHtml(changeInfo.oldText)})`;
          searchText = changeInfo.oldText;
          // Find the exact variant that matched in HTML for accurate replacement
          const matchedOldVariant = oldTextVariants.find(v => html.includes(v));
          if (matchedOldVariant && matchedOldVariant !== searchText) {
            searchText = matchedOldVariant;
          }

          // oldText = original citation text (before conversion)
          // newText = converted citation text (after conversion)
          const oldDisplay = `<span class="track-change-deletion-sm">${escapeHtml(changeInfo.oldText)}</span>`;
          const newDisplay = renderClickableNumbers(changeInfo.newText, 'track-change-addition');
          // Show old text struck through first, then arrow, then new text (e.g., "(Smith, 2020) → (1)")
          displayContent = `${oldDisplay}<span class="track-change-arrow"> → </span>${newDisplay}`;

          markTag = `<mark class="px-1 rounded transition-colors" title="${escapeHtml(refInfo)}">${displayContent}</mark>`;
          isTrackChangeMarkTag = true;
          if (DEBUG_CITATIONS) {
            console.log(`[DocumentViewer] ✅ TRACK CHANGE (old text): "${changeInfo.oldText}" → "${changeInfo.newText}"`);
          }
        } else if (newTextInHtml) {
          // HTML already updated with new text — search by newText
          searchText = changeInfo.newText;
          // Find the exact variant that matched in HTML for accurate replacement
          const matchedVariant = newTextVariants.find(v => html.includes(v));
          if (matchedVariant && matchedVariant !== searchText) {
            searchText = matchedVariant;
          }

          if (isRenumber) {
            // Renumber: show track change format (old → new) at the correct position
            const trackClass = getTrackChangeClass(changeInfo.changeType);
            bgColor = `${trackClass || 'track-change-addition'} animate-pulse`;
            hoverColor = 'hover:bg-green-300';
            refInfo = `Renumbered: ${escapeHtml(changeInfo.newText)} (was ${escapeHtml(changeInfo.oldText)})`;
            const oldDisplay = `<span class="track-change-deletion-sm">${escapeHtml(changeInfo.oldText)}</span>`;
            const newDisplay = renderClickableNumbers(changeInfo.newText, 'track-change-addition');
            displayContent = `${oldDisplay}<span class="track-change-arrow"> → </span>${newDisplay}`;
            markTag = `<mark class="px-1 rounded transition-colors" title="${escapeHtml(refInfo)}">${displayContent}</mark>`;
          } else {
            // Other change types: show as normal linked citation
            displayContent = renderClickableNumbers(changeInfo.newText);
            refInfo = `Updated from ${escapeHtml(changeInfo.oldText)}`;
            markTag = `<mark class="${bgColor} px-1 rounded ${hoverColor} transition-colors" title="${escapeHtml(refInfo)}">${displayContent}</mark>`;
          }
          isTrackChangeMarkTag = true;
          if (DEBUG_CITATIONS) {
            console.log(`[DocumentViewer] ✅ ${isRenumber ? 'RENUMBER TRACK CHANGE' : 'UPDATED'} (new text): "${changeInfo.oldText}" → "${changeInfo.newText}"`);
          }
        }
      } else if (changeInfo && DEBUG_CITATIONS) {
        console.log(`[DocumentViewer] ⚠️ changeInfo exists but condition failed`);
      }

      // If we already set a markTag above (track change or renumbered), skip all the other conditions
      // Using boolean flag instead of fragile string inspection
      const hasTrackChangeMarkTag = isTrackChangeMarkTag;

      // Check if referenced numbers exist in current reference list
      const existingRefNumbers = new Set(references?.map(r => r.number) || []);
      const citedNumbers = expandCitationRange(citation.rawText);
      const hasOrphanedRefs = citedNumbers.length > 0 && citedNumbers.some(n => !existingRefNumbers.has(n));

      if (DEBUG_CITATIONS) {
        console.log(`[DocumentViewer] Citation "${citation.rawText}": hasTrackChangeMarkTag=${hasTrackChangeMarkTag}, citedNumbers=[${citedNumbers.join(',')}], existingRefNumbers=[${Array.from(existingRefNumbers).join(',')}]`);
      }

      // Orphaned citation (reference was deleted) - check multiple indicators
      // Skip if we already have a track change markTag
      if (
        !hasTrackChangeMarkTag && (
        citation.isOrphaned ||
        (changeInfo && changeInfo.changeType === 'deleted') ||
        (changeInfo && changeInfo.newNumber === null && changeInfo.oldText === changeInfo.newText) ||
        (citation.referenceNumber && !existingRefNumbers.has(citation.referenceNumber)) ||
        (hasOrphanedRefs && existingRefNumbers.size > 0) // Only check if we have references to compare
        )
      ) {
        const deletedNums = citedNumbers.filter(n => !existingRefNumbers.has(n));
        refInfo = changeInfo
          ? `Reference #${changeInfo.oldNumber} was deleted - citation needs fixing`
          : deletedNums.length > 0
            ? `Reference #${deletedNums.join(', #')} deleted - citation needs fixing`
            : 'Reference deleted - citation needs fixing';

        searchText = changeInfo?.oldText || citation.rawText;
        displayContent = `<span class="track-change-deletion">${escapeHtml(searchText)}</span> <span style="color: #dc2626; font-weight: bold;">⚠</span>`;

        markTag = `<mark class="track-change-deletion animate-pulse px-1 rounded hover:bg-red-300 transition-colors" title="${escapeHtml(refInfo)}">${displayContent}</mark>`;
        if (DEBUG_CITATIONS) {
          console.log(`[DocumentViewer] Orphaned citation detected: "${searchText}", deletedNums: ${deletedNums.join(',')}`);
        }
      }
      // Check if citation has valid references (either direct referenceNumber or numbers exist in reference list)
      // Skip if we already have a track change markTag
      // NOTE: Always check for valid refs regardless of referenceNumber - citations like [1,2] should be clickable
      else if (!hasTrackChangeMarkTag) {
        // Use already calculated citedNumbers and existingRefNumbers
        const hasValidRefs = (citation.referenceNumber && existingRefNumbers.has(citation.referenceNumber)) ||
          (citedNumbers.length > 0 && citedNumbers.some(n => existingRefNumbers.has(n)));

        if (DEBUG_CITATIONS) {
          console.log(`[DocumentViewer] Citation "${citation.rawText}": hasValidRefs=${hasValidRefs}, citation.referenceNumber=${citation.referenceNumber}`);
        }

        if (hasValidRefs) {
          // Citation numbers exist in references - render as clickable (normal case)
          const validNums = citedNumbers.filter(n => existingRefNumbers.has(n));
          refInfo = buildRefTooltip(validNums, references);
          displayContent = renderClickableNumbers(citation.rawText);
          markTag = `<mark class="${bgColor} px-1 rounded ${hoverColor} transition-colors" title="${escapeHtml(refInfo)}">${displayContent}</mark>`;
          if (DEBUG_CITATIONS) {
            console.log(`[DocumentViewer] ✅ Created clickable markTag for "${citation.rawText}": validNums=[${validNums.join(',')}]`);
          }
        } else {
          // Try to parse as APA author-year citation(s)
          const apaMatches = references ? parseAllAPACitations(citation.rawText, references) : [];
          const matchedRefs = apaMatches.filter(m => m.refNumber !== null);

          if (matchedRefs.length > 0) {
            // Found matching reference(s) via APA parsing - make each clickable
            // Build display with clickable author-year pairs
            let apaDisplay = citation.rawText;

            // Replace each matched author-year with a clickable link using fullMatch
            for (const m of matchedRefs) {
              // Use the fullMatch from parsing (e.g., "Marcus & Davis, 2019")
              if (m.fullMatch && apaDisplay.includes(m.fullMatch)) {
                const link = `<span class="citation-link" data-ref="${m.refNumber}" style="cursor: pointer;">${escapeHtml(m.fullMatch)}</span>`;
                apaDisplay = apaDisplay.replace(m.fullMatch, link);
              }
            }

            // Build reference info for tooltip
            const refNums = matchedRefs.map(m => m.refNumber).join(', ');
            refInfo = `References: #${refNums}`;
            displayContent = apaDisplay;
            markTag = `<mark class="${bgColor} px-1 rounded ${hoverColor} transition-colors" title="${escapeHtml(refInfo)}">${displayContent}</mark>`;
          } else {
            // No matching references found - show warning
            bgColor = 'bg-orange-200';
            hoverColor = 'hover:bg-orange-300';
            refInfo = 'No matching reference found in reference list';
            displayContent = `${escapeHtml(citation.rawText)} <span style="color: #ea580c; font-weight: bold;">⚠</span>`;
            markTag = `<mark class="${bgColor} px-1 rounded ${hoverColor} transition-colors border border-orange-400" title="${escapeHtml(refInfo)}">${displayContent}</mark>`;
          }
        }
      }
      // When hasTrackChangeMarkTag is true, markTag is already set above - don't overwrite it
      // The track change or renumbered formatting should be preserved

      // Try to find citation text in HTML and replace with placeholder
      // For changed citations, we may need to search for either oldText or newText depending on
      // whether the HTML was regenerated (renumbering) or not (style conversion pending)
      const textsToTry = [searchText];

      // If this is a changed citation, also try the alternative text
      if (changeInfo && changeInfo.oldText && changeInfo.newText && changeInfo.oldText !== changeInfo.newText) {
        // Add the other text as fallback
        if (searchText === changeInfo.newText) {
          textsToTry.push(changeInfo.oldText);
        } else {
          textsToTry.push(changeInfo.newText);
        }
      }

      // Fallback: try to extract original text from fullText using position
      // This helps when rawText was updated but HTML still has original numbers
      if (fullText && citation.startOffset !== undefined && citation.endOffset !== undefined) {
        const { startOffset, endOffset } = citation;
        if (typeof startOffset === 'number' && typeof endOffset === 'number' && startOffset >= 0 && endOffset > startOffset) {
          const extractedText = fullText.substring(startOffset, endOffset);
          if (extractedText && extractedText !== searchText && !textsToTry.includes(extractedText)) {
            textsToTry.push(extractedText);
            if (DEBUG_CITATIONS) {
              console.log(`[DocumentViewer] Added position-based fallback: "${extractedText}" for citation "${searchText}"`);
            }
          }
        }
      }

      // Additional fallback: for numeric citations, try common patterns if exact match fails
      // e.g., if rawText is [2] or (2) but HTML might have [3] or (3), try nearby numbers
      const numericMatch = searchText.match(/^[[(](\d+(?:[,\s\-–]+\d+)*)[)\]]$/);
      if (numericMatch && !changeInfo) {
        // Try searching for the citation by looking for bracket patterns near the position
        // This is a last resort when we don't have changeInfo
        const nums = expandCitationRange(searchText);
        if (nums.length > 0) {
          // Check if these numbers are valid (exist in references)
          const validNums = nums.filter(n => existingRefNumbers.has(n));
          if (validNums.length === 0 && existingRefNumbers.size > 0) {
            // The cited numbers don't exist - citation might have been renumbered
            // Try to find it using the original numbers from recentChanges if available
            const matchingChange = recentChanges?.find(c =>
              c.newText === searchText || c.oldText === searchText
            );
            if (matchingChange && matchingChange.oldText && !textsToTry.includes(matchingChange.oldText)) {
              textsToTry.push(matchingChange.oldText);
            }
          }
        }
      }

      // Format-variant fallback: when rawText format (parens/brackets) doesn't match
      // the actual document text. E.g., rawText "(1, 2)" but HTML has "[1,2]"
      // Also handles spacing differences: "(1, 2)" vs "(1,2)" and range compression: "(3, 4, 5)" vs "[3–5]"
      const citationNums = expandCitationRange(searchText);
      if (citationNums.length > 0) {
        const isConsecutiveRange = citationNums.length >= 2 &&
          citationNums.every((n, i) => i === 0 || n === citationNums[i - 1] + 1);
        // Build all common representations
        const spaced = citationNums.join(', ');       // "1, 2" or "3, 4, 5"
        const compact = citationNums.join(',');        // "1,2" or "3,4,5"
        const rangeEnDash = isConsecutiveRange
          ? `${citationNums[0]}\u2013${citationNums[citationNums.length - 1]}` // "3–5"
          : null;
        const rangeHyphen = isConsecutiveRange
          ? `${citationNums[0]}-${citationNums[citationNums.length - 1]}` // "3-5"
          : null;
        const variants: string[] = [];
        for (const inner of [spaced, compact, ...(rangeEnDash ? [rangeEnDash] : []), ...(rangeHyphen ? [rangeHyphen] : [])]) {
          variants.push(`[${inner}]`, `(${inner})`);
        }
        for (const v of variants) {
          if (!textsToTry.includes(v)) textsToTry.push(v);
        }

        // Superscript fallback: document may use <sup>N</sup> for Vancouver-style citations
        // but AI detection returns rawText as "(N)" or "[N]". Try superscript HTML variants.
        // Add compound superscript variants first (e.g., <sup>3-5</sup>, <sup>2,17</sup>)
        for (const inner of [spaced, compact, ...(rangeEnDash ? [rangeEnDash] : []), ...(rangeHyphen ? [rangeHyphen] : [])]) {
          const supVariant = `<sup>${inner}</sup>`;
          if (!textsToTry.includes(supVariant)) textsToTry.push(supVariant);
        }
        // Note: individual <sup>N</sup> per number is intentionally NOT added —
        // it would match stray superscripts elsewhere in the document (footnotes, exponents).
      }

      let found = false;
      for (const textToSearch of textsToTry) {
        if (found) break;

        // For superscript variants (<sup>N</sup> or <sup>3-5</sup> or <sup>2,17</sup>), don't HTML-encode
        const isSuperscriptVariant = /^<sup>[\d,\s\-–—]+<\/sup>$/.test(textToSearch);

        const htmlEncodedText = textToSearch
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        // Handle en-dash encoding variants
        const enDashVariants = isSuperscriptVariant
          ? [textToSearch] // superscript is raw HTML, don't encode
          : [
            textToSearch,
            textToSearch.replace(/–/g, '&#8211;'),
            textToSearch.replace(/–/g, '&ndash;'),
            htmlEncodedText,
            htmlEncodedText.replace(/–/g, '&#8211;'),
            htmlEncodedText.replace(/–/g, '&ndash;')
          ];

        for (const variant of enDashVariants) {
          if (result.includes(variant)) {
            // For superscript matches, wrap existing markTag in <sup> and swap inner content
            let effectiveMarkTag = markTag;
            if (isSuperscriptVariant) {
              const supContent = textToSearch.replace(/<\/?sup>/g, '');
              // Parse all numbers from the superscript content (handles "3-5", "2,17", "1,3-5,8")
              const supNums = expandCitationRange(supContent);
              const supRefInfo = supNums.length > 0 ? buildRefTooltip(supNums, references) : 'Citation';
              // Build clickable content — each number links to its reference
              const supClickable = supNums.length > 0
                ? supNums.map(n => `<span class="citation-link" data-ref="${n}" style="cursor: pointer;">${n}</span>`).join(',')
                : `<span class="citation-link" style="cursor: pointer;">${supContent}</span>`;

              // Preserve existing markTag attributes; use supClickable for normal citations,
              // keep original inner HTML only for track-change marks (arrows, strikethrough spans)
              const markMatch = markTag.match(/^<mark([^>]*)>([\s\S]*)<\/mark>$/);
              if (markMatch) {
                let attrs = markMatch[1];
                if (/title="[^"]*"/.test(attrs)) {
                  attrs = attrs.replace(/title="[^"]*"/, `title="${escapeHtml(supRefInfo)}"`);
                } else {
                  attrs += ` title="${escapeHtml(supRefInfo)}"`;
                }
                const inner = hasTrackChangeMarkTag ? markMatch[2] : supClickable;
                effectiveMarkTag = `<sup><mark${attrs}>${inner}</mark></sup>`;
              } else {
                // Fallback: markTag doesn't match expected pattern — wrap as-is
                effectiveMarkTag = `<sup><mark class="bg-yellow-200 px-0.5 rounded hover:bg-yellow-300 transition-colors" title="${escapeHtml(supRefInfo)}">${supClickable}</mark></sup>`;
              }
            }

            // Create unique placeholder
            const placeholder = `__CITE_PLACEHOLDER_${placeholderIndex}__`;
            placeholderIndex++;
            placeholderMap.set(placeholder, effectiveMarkTag);

            // Replace ALL occurrences with placeholder
            const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedVariant, 'g');
            const matchCount = (result.match(regex) || []).length;
            result = result.replace(regex, placeholder);
            highlightedCount += matchCount;
            if (DEBUG_CITATIONS) {
              console.log(`[DocumentViewer] Replaced citation: "${textToSearch}" with placeholder (matched ${matchCount}x, superscript=${isSuperscriptVariant})`);
            }
            found = true;
            break;
          }
        }
      }

      if (!found && DEBUG_CITATIONS) {
        console.log(`[DocumentViewer] Citation text not found in HTML: "${textsToTry.join('" or "')}"`);
      }
    });

    // Phase 2: Replace all placeholders with actual mark tags
    for (const [placeholder, markTag] of placeholderMap) {
      result = result.split(placeholder).join(markTag);
    }

    // Phase 3: Handle orphan changes that weren't matched by any citation in the citations array
    // This handles cases where the orphan citation has citationId: '' and wasn't found by getChangeInfo
    if (recentChanges && recentChanges.length > 0) {
      const orphanChanges = recentChanges.filter(c => c.changeType === 'deleted' || (c.newNumber === null && c.oldText === c.newText));
      for (const change of orphanChanges) {
        const orphanText = change.oldText || change.newText || '';
        if (!orphanText || seenTexts.has(orphanText)) continue;

        // Build mark tag for orphan
        const escapedOrphanText = escapeHtml(orphanText);
        const orphanDisplay = `<span class="line-through text-red-600">${escapedOrphanText}</span> <span class="text-red-600 font-bold">⚠</span>`;
        const orphanMarkTag = `<mark class="bg-red-200 animate-pulse px-1 rounded hover:bg-red-300 transition-colors" title="Reference deleted - citation needs fixing">${orphanDisplay}</mark>`;

        // Try to find and replace in HTML
        const textsToTry = [orphanText];
        const htmlEncodedText = orphanText
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        textsToTry.push(htmlEncodedText);

        for (const textToSearch of textsToTry) {
          const escapedVariant = textToSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedVariant, 'g');
          if (result.match(regex)) {
            result = result.replace(regex, orphanMarkTag);
            if (DEBUG_CITATIONS) {
              console.log(`[DocumentViewer] Orphan change highlighted: "${textToSearch}"`);
            }
            seenTexts.add(orphanText);
            highlightedCount++;
            break;
          }
        }
      }
    }

    if (DEBUG_CITATIONS) {
      console.log(`[DocumentViewer] Highlighting complete - ${highlightedCount}/${citations.length} citations highlighted`);
      console.log('[DocumentViewer] Contains <mark> tags:', result.includes('<mark'));
    }

    // Don't include References section in result
    return result;
  };

  // Handle citation clicks - scroll to reference on click
  const handleCitationClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Check for clickable citation link (span with data-ref)
    if (target.classList.contains('citation-link') && target.hasAttribute('data-ref')) {
      e.preventDefault();
      const refNumber = parseInt(target.getAttribute('data-ref') || '0');
      if (refNumber) {
        scrollToReference(refNumber);
        if (onCitationClick) {
          onCitationClick(refNumber);
        }
      }
      return;
    }

    // Legacy: Check for mark element with data-ref
    if (target.tagName === 'MARK' && target.hasAttribute('data-ref')) {
      const refNumber = parseInt(target.getAttribute('data-ref') || '0');
      if (refNumber) {
        scrollToReference(refNumber);
        if (onCitationClick) {
          onCitationClick(refNumber);
        }
      }
    }
  };

  // Use HTML to preserve formatting (bold, italic, fonts, etc.)
  // Highlighting works by finding citation text within HTML
  const contentToDisplay = fullHtml || fullText || '';

  if (DEBUG_CITATIONS) {
    console.log('[DocumentViewer] Rendering with:', {
      hasFullText: !!fullText,
      hasFullHtml: !!fullHtml,
      contentLength: contentToDisplay?.length || 0,
      usingHTML: !!fullHtml
    });
  }

  // Apply citation highlighting to HTML (preserves formatting)
  const highlightedContent = highlightCitationsInHTML(contentToDisplay);
  // Sanitize HTML to prevent XSS attacks
  const displayContent = DOMPurify.sanitize(highlightedContent, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['data-ref', 'data-source'],
  });

  // Get orphaned citations from both the citations array and recentChanges
  const orphanedFromCitations = citations.filter(c => c.isOrphaned);
  // Only include changes that represent truly orphaned citations (not renumbered ones)
  // Use ID-based matching to check if the citation still exists in the document
  const orphanedFromChanges = (recentChanges || [])
    .filter(c => {
      // Skip renumber changes - these have both old and new text and aren't orphaned
      if (c.changeType === 'renumber' && c.oldText && c.newText && c.oldText !== c.newText) {
        return false;
      }
      // Use ID-based matching: check if the citation record still exists by ID
      // Text matching fails after round-trip conversions (e.g., rawText "(4)" doesn't match
      // oldText "(4, 5)" or newText "(Vandenbussche, 1984; Malata et al., 1994)")
      const citationExists = citations.some(cit => cit.id === c.citationId);
      return !citationExists; // Only orphaned if citation record doesn't exist anymore
    })
    .map(c => ({ rawText: c.oldText || c.newText || '' }));

  // Combine and dedupe orphaned citations
  const orphanedTexts = new Set<string>();
  orphanedFromCitations.forEach(c => orphanedTexts.add(c.rawText));
  orphanedFromChanges.forEach(c => { if (c.rawText) orphanedTexts.add(c.rawText); });
  const orphanedCitations = Array.from(orphanedTexts).map(text => ({ rawText: text }));

  // Get all reference numbers from the references array
  const existingRefNumbers = new Set(references?.map(r => r.number) || []);

  // Count citations without matching references (excluding orphaned and deleted ones)
  // For multi-number citations like [1,2] or [3-5], check if ANY of the numbers exist
  const citationsWithoutReference = citations.filter(c => {
    if (c.isOrphaned || orphanedTexts.has(c.rawText)) return false;
    // Skip empty citations (reference was deleted, rawText cleared to "")
    if (!c.rawText || c.rawText.trim() === '') return false;

    // If citation has a direct referenceNumber, check if it exists
    if (c.referenceNumber || c.referenceNumber === 0) {
      return !existingRefNumbers.has(c.referenceNumber);
    }

    // For citations without referenceNumber, parse the rawText to extract numbers
    const citedNumbers = expandCitationRange(c.rawText);
    if (citedNumbers.length === 0) {
      // Could be an author-year citation - try APA matching
      if (references) {
        const apaMatches = parseAllAPACitations(c.rawText, references);
        const hasApaMatch = apaMatches.some(m => m.refNumber !== null);
        if (hasApaMatch) {
          return false; // Has a match via APA
        }
      }
      return true; // No numbers found and no APA match
    }

    // Check if at least one of the cited numbers exists in references
    const hasMatch = citedNumbers.some(num => existingRefNumbers.has(num));
    return !hasMatch;
  });

  return (
    <Card className="p-6">
      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Document Preview:</strong> Citations are highlighted for easy identification.
          Full formatting (bold, italics, fonts) will be preserved in the exported DOCX file.
        </p>
      </div>

      {/* Warning for citations without matching references */}
      {citationsWithoutReference.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded p-4 mb-4">
          <p className="text-sm text-orange-800">
            <strong>⚠️ {citationsWithoutReference.length} citation(s) without matching reference:</strong>{' '}
            These in-text citations don't have a corresponding entry in the reference list.
            Add the missing references or remove the citations.
          </p>
          <ul className="mt-2 text-xs text-orange-700 list-disc list-inside">
            {citationsWithoutReference.slice(0, 5).map((c, i) => (
              <li key={i}>"{c.rawText}"</li>
            ))}
            {citationsWithoutReference.length > 5 && (
              <li>...and {citationsWithoutReference.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Warning for orphaned citations (deleted references) */}
      {orphanedCitations.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <p className="text-sm text-red-800">
            <strong>🚨 {orphanedCitations.length} citation(s) with deleted references:</strong>{' '}
            These citations point to references that have been deleted.
            Update or remove these citations.
          </p>
          <ul className="mt-2 text-xs text-red-700 list-disc list-inside">
            {orphanedCitations.slice(0, 5).map((c, i) => (
              <li key={i}>"{c.rawText}"</li>
            ))}
            {orphanedCitations.length > 5 && (
              <li>...and {orphanedCitations.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Warning for uncited references */}
      {(() => {
        const citedNumbers = new Set<number>();
        for (const c of citations) {
          // Use DB-linked reference number (works for all formats including APA author-year)
          if (c.referenceNumber !== null && c.referenceNumber !== undefined) citedNumbers.add(c.referenceNumber);
          // Also extract numbers from rawText for numeric formats (Vancouver, IEEE)
          if (c.rawText) {
            for (const n of expandCitationRange(c.rawText)) citedNumbers.add(n);
          }
        }
        const uncited = (references || []).filter(r => !citedNumbers.has(r.number));
        if (uncited.length === 0) return null;
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ {uncited.length} reference(s) not cited in text:</strong>{' '}
              These references have no in-text citation. Consider removing them or adding citations.
            </p>
            <ul className="mt-2 text-xs text-yellow-700 list-disc list-inside">
              {uncited.slice(0, 5).map((r) => (
                <li key={r.id}>#{r.number} — {r.authors?.[0] || 'Unknown'}{r.year ? ` (${r.year})` : ''}</li>
              ))}
              {uncited.length > 5 && (
                <li>...and {uncited.length - 5} more</li>
              )}
            </ul>
          </div>
        );
      })()}
      <div className="prose max-w-none">
        <div
          className="document-content font-serif text-base leading-relaxed text-gray-800"
          onClick={handleCitationClick}
          dangerouslySetInnerHTML={{ __html: displayContent }}
        />
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
        <div className="text-sm text-gray-600">
          <strong>📋 How to Use:</strong>
          <ol className="mt-2 ml-4 space-y-2 list-decimal">
            <li>Switch to <strong>Reference List</strong> tab to manage your references</li>
            <li>Drag and drop to reorder, or delete references as needed</li>
            <li>Return here to see your document with original formatting</li>
            <li>Click <strong>Export DOCX</strong> button to download with updated citation numbers</li>
          </ol>
        </div>
        <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
          <p className="text-sm text-green-800">
            <strong>✓ Formatting Preserved:</strong> The exported DOCX will contain all your original formatting (bold, italics, fonts, styles) with only citation numbers updated.
          </p>
        </div>
      </div>
    </Card>
  );
}
