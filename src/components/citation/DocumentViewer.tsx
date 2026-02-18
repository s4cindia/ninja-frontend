/**
 * Document Viewer Component
 * Displays document content with citation highlighting and clickable links
 */

import type { MouseEvent } from 'react';
import DOMPurify from 'dompurify';
import { Card } from '@/components/ui/Card';

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
  changeType?: 'style' | 'renumber' | 'deleted' | 'unchanged'; // Type of change
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

// Get track changes CSS class based on change type
function getTrackChangeClass(changeType?: string): string {
  switch (changeType) {
    case 'deleted': return 'track-change-deletion';
    case 'style': return 'track-change-addition';
    case 'renumber': return 'track-change-renumber';
    case 'swap': return 'track-change-swap';
    default: return '';
  }
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

    console.log(`[DocumentViewer] getChangeInfo for citation rawText: "${citation.rawText}"`);
    console.log(`[DocumentViewer] recentChanges count: ${recentChanges.length}`);

    // First try to match by citationId
    let change = recentChanges.find(c => c.citationId && c.citationId === citation.id);
    if (change) {
      console.log(`[DocumentViewer] Matched by citationId: "${change.oldText}" → "${change.newText}"`);
      return change;
    }

    // Try to match by newText (after conversion, citation.rawText = newText)
    change = recentChanges.find(c => c.newText === citation.rawText);
    if (change) {
      console.log(`[DocumentViewer] Matched by newText: "${change.oldText}" → "${change.newText}"`);
      return change;
    }

    // Try oldText match for cases where rawText hasn't been updated yet
    change = recentChanges.find(c => c.oldText === citation.rawText);
    if (change) {
      console.log(`[DocumentViewer] Matched by oldText: "${change.oldText}" → "${change.newText}"`);
      return change;
    }

    console.log(`[DocumentViewer] No match found for "${citation.rawText}"`);
    return null;
  };

  // Highlight citations in HTML (preserves formatting)
  const highlightCitationsInHTML = (html: string) => {
    console.log('[DocumentViewer] highlightCitationsInHTML called');
    console.log('[DocumentViewer] HTML length:', html?.length || 0);
    console.log('[DocumentViewer] Citations array:', citations?.length || 0);

    if (!citations || citations.length === 0) {
      console.log('[DocumentViewer] No citations to highlight - returning original HTML');
      return html;
    }

    // Look for "References" text to see what HTML structure is around it
    const referencesTextIndex = html.toLowerCase().indexOf('references');
    if (referencesTextIndex !== -1) {
      // Log 200 characters around "References" to see the HTML structure
      const start = Math.max(0, referencesTextIndex - 100);
      const end = Math.min(html.length, referencesTextIndex + 100);
      const sample = html.substring(start, end);
      console.log('[DocumentViewer] HTML around "References":', sample);
    }

    // Find and remove References section from HTML
    // Try multiple patterns to catch different HTML structures
    const patterns = [
      /<p[^>]*>\s*<strong[^>]*>\s*(References|Bibliography|Works Cited)\s*<\/strong>\s*<\/p>/i,
      /<p[^>]*><b[^>]*>(References|Bibliography|Works Cited)<\/b><\/p>/i,
      /<h[1-6][^>]*>(References|Bibliography|Works Cited)<\/h[1-6]>/i,
      /<p[^>]*>\s*<em[^>]*>\s*(References|Bibliography|Works Cited)\s*<\/em>\s*<\/p>/i,
      // Plain text in paragraph
      /<p[^>]*>\s*(References|Bibliography|Works Cited)\s*<\/p>/i
    ];

    let contentToHighlight = html;
    let referencesStart = -1;

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match.index !== undefined) {
        referencesStart = match.index;
        console.log('[DocumentViewer] Found References section with pattern:', pattern.toString().substring(0, 50), 'at position:', match.index);
        console.log('[DocumentViewer] Matched text:', match[0]);
        contentToHighlight = html.substring(0, referencesStart);
        break;
      }
    }

    if (referencesStart === -1) {
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

    console.log('[DocumentViewer] Sample citations:', sortedCitations.slice(0, 3).map(c => ({
      id: c.id,
      rawText: c.rawText,
      referenceNumber: c.referenceNumber
    })));
    console.log(`[DocumentViewer] Processing ${sortedCitations.length} unique citations (from ${citations.length} total)`);

    // TWO-PHASE REPLACEMENT to prevent nested replacements:
    // Phase 1: Replace all citation texts with unique placeholders
    // Phase 2: Replace all placeholders with the actual mark tags
    const placeholderMap = new Map<string, string>(); // placeholder -> markTag
    let placeholderIndex = 0;
    let highlightedCount = 0;

    sortedCitations.forEach(citation => {
      if (!citation.rawText) {
        console.log('[DocumentViewer] Skipping citation with no rawText:', citation.id);
        return;
      }

      const changeInfo = getChangeInfo(citation);

      // Determine color and tooltip based on citation state
      let bgColor = 'bg-yellow-200';
      let hoverColor = 'hover:bg-yellow-300';
      let refInfo = citation.referenceNumber
        ? `Reference #${citation.referenceNumber}`
        : 'Citation';

      // Determine what text to search for and what to display
      // For changed citations, we search for the OLD text but show the transition
      let searchText = citation.rawText;
      let displayContent = escapeHtml(citation.rawText);
      let markTag = '';

      // Helper to render citation numbers as clickable links
      const renderClickableNumbers = (text: string, changeClass?: string): string => {
        // Check if this looks like a numeric citation [1], [1-3], [1, 2, 3]
        const bracketMatch = text.match(/^\[([^\]]+)\]$/);
        if (bracketMatch) {
          const inner = bracketMatch[1];
          const numbers = expandCitationRange(inner);
          if (numbers.length > 0) {
            // Render each number as a clickable link
            const clickableNumbers = numbers.map(n =>
              `<span class="citation-link${changeClass ? ' ' + changeClass : ''}" data-ref="${n}" style="cursor: pointer;">${n}</span>`
            ).join(', ');
            return `[${clickableNumbers}]`;
          }
        }
        return escapeHtml(text);
      };

      // Changed citation (style conversion or renumbering) - check this FIRST
      // This handles cases where oldText !== newText (style change or renumber)
      if (changeInfo && changeInfo.oldText && changeInfo.newText && changeInfo.oldText !== changeInfo.newText) {
        const trackClass = getTrackChangeClass(changeInfo.changeType);
        bgColor = `${trackClass || 'track-change-addition'} animate-pulse`;
        hoverColor = 'hover:bg-green-300';
        refInfo = `Updated: ${escapeHtml(changeInfo.oldText)} → ${escapeHtml(changeInfo.newText)}`;

        // IMPORTANT: Search for the OLD text that's actually in the HTML
        // The HTML document hasn't been updated yet - it still contains the original citation text
        searchText = changeInfo.oldText;

        // Show transition: old text struck through, arrow, new clickable text
        const oldDisplay = `<span class="track-change-deletion-sm">${escapeHtml(changeInfo.oldText)}</span>`;
        const newDisplay = renderClickableNumbers(changeInfo.newText, 'track-change-addition');
        displayContent = `${oldDisplay}<span class="track-change-arrow"> → </span>${newDisplay}`;

        markTag = `<mark class="px-1 rounded transition-colors" title="${escapeHtml(refInfo)}">${displayContent}</mark>`;

        console.log(`[DocumentViewer] Changed citation: "${changeInfo.oldText}" → "${changeInfo.newText}", searching for: "${searchText}"`);
      }
      // Check if referenced numbers exist in current reference list
      const existingRefNumbers = new Set(references?.map(r => r.number) || []);
      const citedNumbers = expandCitationRange(citation.rawText);
      const hasOrphanedRefs = citedNumbers.length > 0 && citedNumbers.some(n => !existingRefNumbers.has(n));

      // Orphaned citation (reference was deleted) - check multiple indicators
      if (
        citation.isOrphaned ||
        (changeInfo && changeInfo.changeType === 'deleted') ||
        (changeInfo && changeInfo.newNumber === null && changeInfo.oldText === changeInfo.newText) ||
        (citation.referenceNumber && !existingRefNumbers.has(citation.referenceNumber)) ||
        (hasOrphanedRefs && existingRefNumbers.size > 0) // Only check if we have references to compare
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
        console.log(`[DocumentViewer] Orphaned citation detected: "${searchText}", deletedNums: ${deletedNums.join(',')}`);
      }
      // Check if citation has valid references (either direct referenceNumber or numbers exist in reference list)
      else if (!citation.referenceNumber && citation.referenceNumber !== 0) {
        // Use already calculated citedNumbers and existingRefNumbers
        const hasValidRefs = citedNumbers.length > 0 && citedNumbers.some(n => existingRefNumbers.has(n));

        if (hasValidRefs) {
          // Citation numbers exist in references - render as clickable (normal case)
          const validNums = citedNumbers.filter(n => existingRefNumbers.has(n));
          refInfo = `References: ${validNums.join(', ')}`;
          displayContent = renderClickableNumbers(citation.rawText);
          markTag = `<mark class="${bgColor} px-1 rounded ${hoverColor} transition-colors" title="${escapeHtml(refInfo)}">${displayContent}</mark>`;
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
      // Changed citation with just number change
      else if (changeInfo && changeInfo.newNumber !== null) {
        refInfo = `Updated: [${changeInfo.oldNumber}] → [${changeInfo.newNumber}]`;
        // Render clickable numbers with renumber track change styling
        displayContent = renderClickableNumbers(citation.rawText, 'track-change-renumber');

        markTag = `<mark class="track-change-renumber animate-pulse px-1 rounded hover:bg-blue-200 transition-colors" title="${escapeHtml(refInfo)}">${displayContent}</mark>`;
      }
      // Unchanged citation (normal yellow highlight with clickable numbers)
      else {
        // Render clickable citation numbers
        displayContent = renderClickableNumbers(citation.rawText);

        markTag = `<mark class="${bgColor} px-1 rounded ${hoverColor} transition-colors" title="${escapeHtml(refInfo)}">${displayContent}</mark>`;
      }

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
            console.log(`[DocumentViewer] Added position-based fallback: "${extractedText}" for citation "${searchText}"`);
          }
        }
      }

      // Additional fallback: for numeric citations, try common patterns if exact match fails
      // e.g., if rawText is [2] but HTML might have [3], try nearby numbers
      const bracketMatch = searchText.match(/^\[(\d+(?:[,\s\-–]+\d+)*)\]$/);
      if (bracketMatch && !changeInfo) {
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

      let found = false;
      for (const textToSearch of textsToTry) {
        if (found) break;

        const htmlEncodedText = textToSearch
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        // Handle en-dash encoding variants
        const enDashVariants = [
          textToSearch,
          textToSearch.replace(/–/g, '&#8211;'),
          textToSearch.replace(/–/g, '&ndash;'),
          htmlEncodedText,
          htmlEncodedText.replace(/–/g, '&#8211;'),
          htmlEncodedText.replace(/–/g, '&ndash;')
        ];

        for (const variant of enDashVariants) {
          if (result.includes(variant)) {
            // Create unique placeholder
            const placeholder = `__CITE_PLACEHOLDER_${placeholderIndex}__`;
            placeholderIndex++;
            placeholderMap.set(placeholder, markTag);

            // Replace ALL occurrences with placeholder
            const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedVariant, 'g');
            const matchCount = (result.match(regex) || []).length;
            result = result.replace(regex, placeholder);
            highlightedCount += matchCount;
            console.log(`[DocumentViewer] Replaced citation: "${textToSearch}" with placeholder (matched ${matchCount}x)`);
            found = true;
            break;
          }
        }
      }

      if (!found) {
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
            console.log(`[DocumentViewer] Orphan change highlighted: "${textToSearch}"`);
            seenTexts.add(orphanText);
            highlightedCount++;
            break;
          }
        }
      }
    }

    console.log(`[DocumentViewer] Highlighting complete - ${highlightedCount}/${citations.length} citations highlighted`);
    console.log('[DocumentViewer] Contains <mark> tags:', result.includes('<mark'));

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

  console.log('[DocumentViewer] Rendering with:', {
    hasFullText: !!fullText,
    hasFullHtml: !!fullHtml,
    contentLength: contentToDisplay?.length || 0,
    usingHTML: !!fullHtml
  });

  // Apply citation highlighting to HTML (preserves formatting)
  const highlightedContent = highlightCitationsInHTML(contentToDisplay);
  // Sanitize HTML to prevent XSS attacks
  const displayContent = DOMPurify.sanitize(highlightedContent, { USE_PROFILES: { html: true } });

  // Get orphaned citations from both the citations array and recentChanges
  const orphanedFromCitations = citations.filter(c => c.isOrphaned);
  const orphanedFromChanges = (recentChanges || [])
    .filter(c => c.changeType === 'deleted' || (c.newNumber === null && c.oldText === c.newText))
    .map(c => ({ rawText: c.oldText || c.newText || '' }));

  // Combine and dedupe orphaned citations
  const orphanedTexts = new Set<string>();
  orphanedFromCitations.forEach(c => orphanedTexts.add(c.rawText));
  orphanedFromChanges.forEach(c => { if (c.rawText) orphanedTexts.add(c.rawText); });
  const orphanedCitations = Array.from(orphanedTexts).map(text => ({ rawText: text }));

  // Get all reference numbers from the references array
  const existingRefNumbers = new Set(references?.map(r => r.number) || []);

  // Count citations without matching references (excluding orphaned ones)
  // For multi-number citations like [1,2] or [3-5], check if ANY of the numbers exist
  const citationsWithoutReference = citations.filter(c => {
    if (c.isOrphaned || orphanedTexts.has(c.rawText)) return false;

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
