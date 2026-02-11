import { useEffect, useCallback, useState, useRef } from 'react';

interface CitationElement {
  element: Element;
  citationNumber: number | null;
}

interface UseCitationKeyboardNavProps {
  containerRef: React.RefObject<HTMLElement>;
  highlightedCitation?: number | null;
  onCitationSelect?: (citationNumber: number) => void;
  enabled?: boolean;
}

interface UseCitationKeyboardNavResult {
  focusedIndex: number;
  totalCitations: number;
  handleKeyDown: (e: KeyboardEvent) => void;
}

/**
 * Custom hook for keyboard navigation of citations in a document
 * Supports arrow keys, Enter, and Escape for accessible navigation
 */
export function useCitationKeyboardNav({
  containerRef,
  highlightedCitation,
  onCitationSelect,
  enabled = true,
}: UseCitationKeyboardNavProps): UseCitationKeyboardNavResult {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [citations, setCitations] = useState<CitationElement[]>([]);
  const lastInteractionRef = useRef<'mouse' | 'keyboard'>('mouse');

  // Collect all citation elements from the DOM
  const collectCitations = useCallback(() => {
    if (!containerRef.current) return [];

    const citationEls = containerRef.current.querySelectorAll(
      '.cit-hl, [data-citation], [data-cit-nums]'
    );

    const collected: CitationElement[] = [];
    citationEls.forEach(el => {
      // Try data-cit-nums first (new format)
      const citNums = el.getAttribute('data-cit-nums');
      if (citNums) {
        const firstNum = parseInt(citNums.split(',')[0].trim(), 10);
        if (!isNaN(firstNum)) {
          collected.push({ element: el, citationNumber: firstNum });
          return;
        }
      }

      // Fallback to data-citation (legacy format)
      const citNum = el.getAttribute('data-citation');
      if (citNum) {
        const num = parseInt(citNum, 10);
        if (!isNaN(num)) {
          collected.push({ element: el, citationNumber: num });
        }
      }
    });

    return collected;
  }, [containerRef]);

  // Update citations list when container content changes
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const collected = collectCitations();
    setCitations(collected);

    // Set up mutation observer to detect DOM changes
    const observer = new MutationObserver(() => {
      const newCitations = collectCitations();
      setCitations(newCitations);
    });

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [enabled, containerRef, collectCitations]);

  // Sync focused index with externally highlighted citation (from mouse clicks)
  useEffect(() => {
    if (highlightedCitation == null || lastInteractionRef.current === 'keyboard') return;

    const index = citations.findIndex(c => c.citationNumber === highlightedCitation);
    if (index !== -1) {
      setFocusedIndex(index);
    }
  }, [highlightedCitation, citations]);

  // Scroll to citation and apply focus styles
  const focusCitation = useCallback(
    (index: number) => {
      if (index < 0 || index >= citations.length) return;

      const citation = citations[index];
      const el = citation.element as HTMLElement;

      // Scroll into view
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Set focus for screen readers
      if (el.tabIndex === -1) {
        el.tabIndex = 0;
      }
      el.focus({ preventScroll: true });

      // Trigger selection if handler provided
      if (citation.citationNumber != null && onCitationSelect) {
        onCitationSelect(citation.citationNumber);
      }
    },
    [citations, onCitationSelect]
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || citations.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
        case 'j': // Vim-style navigation
          e.preventDefault();
          lastInteractionRef.current = 'keyboard';
          setFocusedIndex(prev => {
            const next = prev < citations.length - 1 ? prev + 1 : prev;
            focusCitation(next);
            return next;
          });
          break;

        case 'ArrowUp':
        case 'k': // Vim-style navigation
          e.preventDefault();
          lastInteractionRef.current = 'keyboard';
          setFocusedIndex(prev => {
            const next = prev > 0 ? prev - 1 : prev;
            focusCitation(next);
            return next;
          });
          break;

        case 'Enter':
        case ' ': // Space key
          e.preventDefault();
          lastInteractionRef.current = 'keyboard';
          if (focusedIndex >= 0 && focusedIndex < citations.length) {
            const citation = citations[focusedIndex];
            if (citation.citationNumber != null && onCitationSelect) {
              onCitationSelect(citation.citationNumber);
            }
          }
          break;

        case 'Escape':
          e.preventDefault();
          lastInteractionRef.current = 'keyboard';
          setFocusedIndex(-1);
          // Remove focus from all citations
          citations.forEach(c => {
            (c.element as HTMLElement).blur();
          });
          break;

        case 'Home':
          e.preventDefault();
          lastInteractionRef.current = 'keyboard';
          setFocusedIndex(0);
          focusCitation(0);
          break;

        case 'End': {
          e.preventDefault();
          lastInteractionRef.current = 'keyboard';
          const lastIndex = citations.length - 1;
          setFocusedIndex(lastIndex);
          focusCitation(lastIndex);
          break;
        }

        default:
          break;
      }
    },
    [enabled, citations, focusedIndex, focusCitation, onCitationSelect]
  );

  // Attach keyboard event listener
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  // Track mouse interactions to prevent keyboard/mouse conflicts
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const handleMouseClick = () => {
      lastInteractionRef.current = 'mouse';
    };

    const container = containerRef.current;
    container.addEventListener('click', handleMouseClick);

    return () => container.removeEventListener('click', handleMouseClick);
  }, [enabled, containerRef]);

  return {
    focusedIndex,
    totalCitations: citations.length,
    handleKeyDown,
  };
}
