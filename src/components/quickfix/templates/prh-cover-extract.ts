/**
 * Helpers for the PRH-COVER-ALT-EMPTY quick-fix flow that don't render UI.
 *
 * Kept in a non-component file so the react-refresh/only-export-components
 * lint rule stays satisfied — importing a helper from a component file
 * breaks fast-refresh for everything that depends on that component.
 */

export interface CoverIssue {
  id: string;
  code: string;
  message: string;
  location?: string;
  html?: string;
  element?: string;
  context?: string;
  snippet?: string;
  imagePath?: string;
}

/**
 * Single-cover-image extraction. Returns the first `src` we can find or the
 * empty string. The operator can override via the manual input in the
 * template if extraction misses — the cover img tag is usually carried on
 * the issue payload but legacy issues may omit context fields.
 */
export function extractCoverImageSrc(issue: CoverIssue): string {
  if (issue.imagePath) return issue.imagePath.trim();

  if (issue.context) {
    try {
      const parsed = JSON.parse(issue.context) as {
        images?: Array<{ fullPath?: string; src?: string }>;
      };
      const first = parsed.images?.[0];
      if (first?.fullPath) return first.fullPath.trim();
      if (first?.src) return first.src.trim();
    } catch {
      // Context wasn't JSON — fall through to the regex extraction.
    }
  }

  const haystack = [issue.html, issue.element, issue.snippet, issue.message]
    .filter((s): s is string => typeof s === 'string')
    .join('\n');
  const match = haystack.match(/src=["']([^"']+)["']/);
  return match ? match[1].trim() : '';
}
