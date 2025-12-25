import { getGuidance } from '@/data/remediationGuidance';
import { Lightbulb, ExternalLink } from 'lucide-react';

interface RemediationGuidanceProps {
  issueCode: string;
}

export function RemediationGuidance({ issueCode }: RemediationGuidanceProps) {
  const guidance = getGuidance(issueCode);

  if (!guidance) return null;

  return (
    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
        <Lightbulb className="w-4 h-4" />
        {guidance.title}
      </div>
      <ol className="list-decimal list-inside text-sm text-amber-900 space-y-1">
        {guidance.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
      {guidance.resources && guidance.resources.length > 0 && (
        <div className="mt-2 text-xs text-amber-700">
          <span className="font-medium">Resources: </span>
          {guidance.resources.map((url, i) => (
            <a 
              key={i} 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1 underline hover:text-amber-900 ml-1"
            >
              Tool <ExternalLink className="w-3 h-3" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default RemediationGuidance;
