import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { 
  X, 
  BookOpen, 
  ClipboardCheck, 
  Wrench, 
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Info,
  Code
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { wcagDocumentationService, WcagDocumentation } from '@/services/wcag-documentation.service';

interface WcagDocumentationModalProps {
  criterionId: string;
  criterionName: string;
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'overview' | 'testing' | 'remediation' | 'wcag';

interface Tab {
  id: TabId;
  label: string;
  icon: typeof BookOpen;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'testing', label: 'Testing Guide', icon: ClipboardCheck },
  { id: 'remediation', label: 'Remediation', icon: Wrench },
  { id: 'wcag', label: 'WCAG Docs', icon: ExternalLink },
];

function OverviewTab({ doc }: { doc: WcagDocumentation }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
        <p className="text-sm text-gray-700">{doc.shortDescription}</p>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Intent</h4>
        <p className="text-sm text-gray-700">{doc.intent}</p>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Benefits</h4>
        <ul className="list-disc list-inside space-y-1">
          {doc.benefits.map((benefit, idx) => (
            <li key={idx} className="text-sm text-gray-700">{benefit}</li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Common Issues</h4>
        <ul className="space-y-2">
          {doc.commonIssues.map((issue, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">{issue}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2">
        {doc.applicableToEpub && (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
            EPUB Applicable
          </span>
        )}
        {doc.applicableToPdf && (
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
            PDF Applicable
          </span>
        )}
      </div>
    </div>
  );
}

function TestingTab({ doc }: { doc: WcagDocumentation }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          Automated Checks
        </h4>
        <ul className="space-y-2 pl-6">
          {doc.testingProcedure.automated.map((check, idx) => (
            <li key={idx} className="text-sm text-gray-700 list-disc">{check}</li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-blue-600" />
          Manual Checks
        </h4>
        <ul className="space-y-2 pl-6">
          {doc.testingProcedure.manual.map((check, idx) => (
            <li key={idx} className="text-sm text-gray-700 list-disc">{check}</li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-gray-600" />
          Recommended Tools
        </h4>
        <div className="flex flex-wrap gap-2">
          {doc.testingProcedure.tools.map((tool, idx) => (
            <span 
              key={idx} 
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
            >
              {tool}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function RemediationTab({ doc }: { doc: WcagDocumentation }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Explanation</h4>
        <p className="text-sm text-gray-700">{doc.remediationGuidance.explanation}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
            <X className="h-4 w-4" />
            Before (Incorrect)
          </h4>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <pre className="text-xs text-red-800 overflow-x-auto whitespace-pre-wrap">
              <code>{doc.remediationGuidance.before}</code>
            </pre>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            After (Correct)
          </h4>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <pre className="text-xs text-green-800 overflow-x-auto whitespace-pre-wrap">
              <code>{doc.remediationGuidance.after}</code>
            </pre>
          </div>
        </div>
      </div>

      {doc.howToMeet.epubSpecific.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600" />
            EPUB-Specific Guidance
          </h4>
          <ul className="space-y-2 pl-6">
            {doc.howToMeet.epubSpecific.map((guidance, idx) => (
              <li key={idx} className="text-sm text-gray-700 list-disc">{guidance}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Techniques</h4>
        <div className="space-y-2">
          {doc.howToMeet.techniques.map((technique) => (
            <div 
              key={technique.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                technique.type === 'sufficient' && 'bg-green-50 text-green-800',
                technique.type === 'advisory' && 'bg-blue-50 text-blue-800',
                technique.type === 'failure' && 'bg-red-50 text-red-800'
              )}
            >
              <Code className="h-4 w-4 flex-shrink-0" />
              <span className="font-mono text-xs">{technique.id}</span>
              <span>{technique.title}</span>
              <span className={cn(
                'ml-auto px-2 py-0.5 rounded text-xs font-medium',
                technique.type === 'sufficient' && 'bg-green-200',
                technique.type === 'advisory' && 'bg-blue-200',
                technique.type === 'failure' && 'bg-red-200'
              )}>
                {technique.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WcagDocsTab({ doc }: { doc: WcagDocumentation }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Official Resources</h4>
        <div className="space-y-2">
          <a
            href={doc.wcagUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
          >
            <ExternalLink className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-700 group-hover:underline">
              WCAG 2.1 Understanding Document
            </span>
          </a>
          <a
            href={doc.howToMeet.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
          >
            <ExternalLink className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 group-hover:underline">
              How to Meet WCAG (Quick Reference)
            </span>
          </a>
          <a
            href={doc.understanding.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
          >
            <ExternalLink className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-purple-700 group-hover:underline">
              Understanding This Success Criterion
            </span>
          </a>
        </div>
      </div>

      {doc.understanding.examples.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Examples</h4>
          <div className="space-y-3">
            {doc.understanding.examples.map((example, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-gray-900 mb-1">{example.title}</h5>
                <p className="text-sm text-gray-600">{example.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {doc.understanding.resources.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Additional Resources</h4>
          <ul className="space-y-2">
            {doc.understanding.resources.map((resource, idx) => (
              <li key={idx}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {resource.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function WcagDocumentationModal({ 
  criterionId, 
  criterionName, 
  isOpen, 
  onClose 
}: WcagDocumentationModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  
  const doc = wcagDocumentationService.getDocumentation(criterionId);

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'A': return 'bg-blue-100 text-blue-700';
      case 'AA': return 'bg-purple-100 text-purple-700';
      case 'AAA': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {doc && (
                <span className={cn(
                  'px-2 py-1 rounded text-sm font-medium',
                  getLevelBadgeClass(doc.level)
                )}>
                  Level {doc.level}
                </span>
              )}
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {criterionId} - {criterionName}
                </DialogTitle>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {!doc ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center">
              <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Documentation Not Available
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                WCAG documentation for criterion {criterionId} is not yet available in the database.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b mt-4">
              <nav className="flex gap-1 -mb-px" role="tablist">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t',
                        isActive
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-1">
              {activeTab === 'overview' && <OverviewTab doc={doc} />}
              {activeTab === 'testing' && <TestingTab doc={doc} />}
              {activeTab === 'remediation' && <RemediationTab doc={doc} />}
              {activeTab === 'wcag' && <WcagDocsTab doc={doc} />}
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
