import { useState } from 'react';
import { getGuidance } from '@/data/remediationGuidance';
import { Lightbulb, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';

interface RemediationGuidanceProps {
  issueCode: string;
}

export function RemediationGuidance({ issueCode }: RemediationGuidanceProps) {
  const [expanded, setExpanded] = useState(false);
  const guidance = getGuidance(issueCode);

  if (!guidance) return null;

  const formatUrl = (url: string): string => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  const getDisplayUrl = (url: string): string => {
    try {
      const urlObj = new URL(formatUrl(url));
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  };

  return (
    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-3 text-amber-800 font-medium hover:bg-amber-100 cursor-pointer transition-colors"
        aria-expanded={expanded}
      >
        <Lightbulb className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{guidance.title}</span>
        {expanded ? (
          <ChevronDown className="w-4 h-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
        )}
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 border-t border-amber-200">
          <ol className="list-decimal list-inside text-sm text-amber-900 space-y-1 mt-3">
            {guidance.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {guidance.resources && guidance.resources.length > 0 && (
            <div className="mt-3 pt-2 border-t border-amber-200">
              <span className="text-xs font-medium text-amber-700">Resources:</span>
              <ul className="mt-1 space-y-1">
                {guidance.resources.map((url, i) => (
                  <li key={i}>
                    <a 
                      href={formatUrl(url)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-1 text-xs text-amber-700 underline hover:text-amber-900 hover:bg-amber-100 px-1 py-0.5 rounded transition-colors"
                    >
                      {getDisplayUrl(url)}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RemediationGuidance;
