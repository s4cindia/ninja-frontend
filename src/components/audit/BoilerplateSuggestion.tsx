/**
 * Renders the `suggestion` field for PRH boilerplate issue codes as a
 * verbatim, monospace, copy-pastable block.
 *
 * Several PRH issue codes carry long legal/brand boilerplate (TDM-reservation
 * paragraph, EEA representative line, PRH address block, imprint URL,
 * group-of-companies statement, copyright-logo markup) in `suggestion` that
 * the operator must paste into the EPUB EXACTLY. The default issue-row
 * suggestion renderer treats it as inline prose, which breaks line breaks
 * and offers no copy affordance. This component handles both.
 *
 * The list of codes that get this treatment is intentionally narrow — the
 * generic one-line "Suggestion: ..." rendering still serves every other
 * code. Add new prefixes here only when the suggestion is truly verbatim
 * legal text that must be pasted as-is.
 */

import { useState } from 'react';
import { Check, ClipboardCopy } from 'lucide-react';

interface BoilerplateSuggestionProps {
  /** The issue code — used for the test-id and accessible label. */
  code: string;
  /** Verbatim text the operator must paste into the EPUB. */
  text: string;
}

export function BoilerplateSuggestion({ code, text }: BoilerplateSuggestionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can reject in non-secure contexts or when permissions
      // are blocked. Surface a brief failure state so the operator knows the
      // click didn't silently succeed; they can fall back to manual selection.
      setCopied(false);
    }
  };

  return (
    <div
      className="mt-2 rounded border border-gray-200 bg-white"
      data-boilerplate-code={code}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 bg-gray-50">
        <span className="text-xs font-medium text-gray-700">
          Suggested text (paste verbatim)
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy suggested text for ${code}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-600" aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <ClipboardCopy className="h-3 w-3" aria-hidden="true" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="px-3 py-2 text-xs text-gray-800 font-mono whitespace-pre-wrap break-words leading-relaxed max-h-64 overflow-y-auto">
        {text}
      </pre>
    </div>
  );
}
