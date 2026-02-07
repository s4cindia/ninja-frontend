import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  CheckCircle,
  XCircle,
  Check,
  X,
} from 'lucide-react';
import type {
  StylesheetDetectionResult,
  CitationIssue,
  IssueSeverity,
  IssueStatus,
} from '@/types/stylesheet-detection.types';

interface IssuePanelProps {
  data: StylesheetDetectionResult;
  onHighlightCitation?: (num: number | null) => void;
}

function buildIssues(data: StylesheetDetectionResult): CitationIssue[] {
  const issues: CitationIssue[] = [];
  const seq = data.sequenceAnalysis;
  const xref = data.crossReference;
  const conversionOptions = data.conversionOptions ?? [];

  if (seq && !seq.isSequential) {
    if (seq.missingNumbers && seq.missingNumbers.length > 0) {
      issues.push({
        id: 'seq-missing',
        severity: 'error',
        category: 'sequence',
        title: `Missing citation number${seq.missingNumbers.length > 1 ? 's' : ''}: [${seq.missingNumbers.join(', ')}]`,
        description: `Citation numbering has ${seq.missingNumbers.length} gap${seq.missingNumbers.length > 1 ? 's' : ''}. Expected range: ${seq.expectedRange?.start ?? '?'}–${seq.expectedRange?.end ?? '?'}.`,
        fixOptions: [
          { id: 'renumber', label: 'Renumber citations sequentially' },
          { id: 'flag', label: 'Flag for manual review' },
        ],
        status: 'pending',
        citationNumbers: seq.missingNumbers,
      });
    }

    const duplicates = seq.duplicates ?? seq.duplicateNumbers ?? [];
    if (duplicates.length > 0) {
      issues.push({
        id: 'seq-duplicates',
        severity: 'warning',
        category: 'sequence',
        title: `Duplicate citation number${duplicates.length > 1 ? 's' : ''}: [${duplicates.join(', ')}]`,
        description: `${duplicates.length} citation number${duplicates.length > 1 ? 's are' : ' is'} used more than once.`,
        fixOptions: [
          { id: 'deduplicate', label: 'Assign unique numbers' },
          { id: 'flag', label: 'Flag for manual review' },
        ],
        status: 'pending',
        citationNumbers: duplicates,
      });
    }

    const outOfOrder = seq.outOfOrder ?? seq.outOfOrderNumbers ?? [];
    if (outOfOrder.length > 0) {
      issues.push({
        id: 'seq-order',
        severity: 'warning',
        category: 'sequence',
        title: `Out-of-order citations: [${outOfOrder.join(', ')}]`,
        description: `${outOfOrder.length} citation${outOfOrder.length > 1 ? 's appear' : ' appears'} out of sequential order.`,
        fixOptions: [
          { id: 'reorder', label: 'Reorder by first appearance' },
          { id: 'flag', label: 'Flag for manual review' },
        ],
        status: 'pending',
        citationNumbers: outOfOrder,
      });
    }
  }

  if (xref) {
    const orphaned = xref.citationsWithoutReference ?? [];
    if (orphaned.length > 0) {
      issues.push({
        id: 'xref-orphaned',
        severity: 'error',
        category: 'cross-reference',
        title: `${orphaned.length} orphaned citation${orphaned.length > 1 ? 's' : ''}`,
        description: `Citation${orphaned.length > 1 ? 's' : ''} [${orphaned.map((c) => c.number).join(', ')}] ${orphaned.length > 1 ? 'have' : 'has'} no matching reference entry.`,
        fixOptions: [
          { id: 'add-ref', label: 'Add missing reference entries' },
          { id: 'remove', label: 'Remove orphaned citations' },
          { id: 'flag', label: 'Flag for manual review' },
        ],
        status: 'pending',
        citationNumbers: orphaned.map((c) => c.number),
      });
    }

    const uncited = xref.referencesWithoutCitation ?? [];
    if (uncited.length > 0) {
      issues.push({
        id: 'xref-uncited',
        severity: 'warning',
        category: 'cross-reference',
        title: `${uncited.length} uncited reference${uncited.length > 1 ? 's' : ''}`,
        description: `Reference${uncited.length > 1 ? 's' : ''} [${uncited.map((r) => r.number).join(', ')}] ${uncited.length > 1 ? 'are' : 'is'} not cited in the document body.`,
        fixOptions: [
          { id: 'remove-ref', label: 'Remove uncited references' },
          { id: 'flag', label: 'Flag for manual review' },
        ],
        status: 'pending',
        citationNumbers: uncited.map((r) => r.number),
      });
    }
  }

  if (conversionOptions.length > 0 && data.detectedStyle) {
    const available = conversionOptions.filter((c) => c !== data.detectedStyle?.styleCode);
    if (available.length > 0) {
      issues.push({
        id: 'conversion',
        severity: 'warning',
        category: 'conversion',
        title: 'Style conversion available',
        description: `Current style: ${data.detectedStyle.styleName}. Can convert to: ${available.map((c) => STYLE_LABELS[c] ?? c.toUpperCase()).join(', ')}.`,
        fixOptions: available.map((code) => ({
          id: `convert-${code}`,
          label: `Convert to ${STYLE_LABELS[code] ?? code.toUpperCase()}`,
        })),
        status: 'pending',
      });
    }
  }

  return issues;
}

const STYLE_LABELS: Record<string, string> = {
  apa7: 'APA 7th',
  mla9: 'MLA 9th',
  chicago17: 'Chicago 17th',
  vancouver: 'Vancouver',
  ieee: 'IEEE',
};

type FilterTab = 'all' | 'errors' | 'warnings';

export function IssuePanel({ data, onHighlightCitation }: IssuePanelProps): JSX.Element {
  const initialIssues = useMemo(() => buildIssues(data), [data]);
  const [issues, setIssues] = useState<CitationIssue[]>(initialIssues);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const filteredIssues = useMemo(() => {
    if (filterTab === 'all') return issues;
    if (filterTab === 'errors') return issues.filter((i) => i.severity === 'error');
    return issues.filter((i) => i.severity === 'warning');
  }, [issues, filterTab]);

  const pendingIssues = useMemo(() => issues.filter((i) => i.status === 'pending'), [issues]);
  const errorCount = useMemo(() => issues.filter((i) => i.severity === 'error').length, [issues]);
  const warningCount = useMemo(() => issues.filter((i) => i.severity === 'warning').length, [issues]);

  const updateIssue = useCallback((id: string, updates: Partial<CitationIssue>) => {
    setIssues((prev) =>
      prev.map((issue) => (issue.id === id ? { ...issue, ...updates } : issue))
    );
  }, []);

  const handleAccept = useCallback(
    (id: string) => {
      updateIssue(id, { status: 'accepted' });
    },
    [updateIssue]
  );

  const handleDismiss = useCallback(
    (id: string) => {
      updateIssue(id, { status: 'dismissed' });
    },
    [updateIssue]
  );

  const handleSelectFix = useCallback(
    (id: string, fixId: string) => {
      updateIssue(id, { selectedFix: fixId });
    },
    [updateIssue]
  );

  const handleAcceptAll = useCallback(() => {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.status === 'pending'
          ? { ...issue, status: 'accepted' as IssueStatus, selectedFix: issue.selectedFix ?? issue.fixOptions[0]?.id }
          : issue
      )
    );
  }, []);

  const handleDismissAll = useCallback(() => {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.status === 'pending' ? { ...issue, status: 'dismissed' as IssueStatus } : issue
      )
    );
  }, []);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-shrink-0 border-b p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Issues</h3>
            <Badge variant="error" size="sm">{errorCount} E</Badge>
            <Badge variant="warning" size="sm">{warningCount} W</Badge>
          </div>
          {data.detectedStyle && (
            <Badge variant="info" size="sm">{data.detectedStyle.styleName}</Badge>
          )}
        </div>

        <div className="flex items-center gap-1" role="tablist" aria-label="Filter issues">
          {(['all', 'errors', 'warnings'] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={filterTab === tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filterTab === tab
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === 'all' ? 'All' : tab === 'errors' ? 'Errors' : 'Warnings'}
            </button>
          ))}
        </div>

        {pendingIssues.length > 0 && (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAcceptAll} className="flex-1">
              <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Accept All Fixes
            </Button>
            <Button size="sm" variant="outline" onClick={handleDismissAll} className="flex-1">
              <X className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Dismiss All
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-gray-500">
              {issues.length === 0 ? 'No issues detected' : 'No issues match the current filter'}
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onAccept={handleAccept}
              onDismiss={handleDismiss}
              onSelectFix={handleSelectFix}
              onHighlightCitation={onHighlightCitation}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface IssueCardProps {
  issue: CitationIssue;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onSelectFix: (id: string, fixId: string) => void;
  onHighlightCitation?: (num: number | null) => void;
}

function IssueCard({ issue, onAccept, onDismiss, onSelectFix, onHighlightCitation }: IssueCardProps): JSX.Element {
  const isPending = issue.status === 'pending';
  const isAccepted = issue.status === 'accepted';
  const isDismissed = issue.status === 'dismissed';

  const borderColor = isDismissed
    ? 'border-gray-200'
    : isAccepted
    ? 'border-green-300'
    : issue.severity === 'error'
    ? 'border-red-300'
    : 'border-yellow-300';

  const bgColor = isDismissed
    ? 'bg-gray-50'
    : isAccepted
    ? 'bg-green-50'
    : 'bg-white';

  return (
    <div
      className={`border rounded-lg ${borderColor} ${bgColor} transition-all`}
      onMouseEnter={() => {
        if (issue.citationNumbers?.length && onHighlightCitation) {
          onHighlightCitation(issue.citationNumbers[0]);
        }
      }}
      onMouseLeave={() => onHighlightCitation?.(null)}
    >
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <SeverityIcon severity={issue.severity} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${isDismissed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
              {issue.title}
            </p>
            <p className={`text-xs mt-0.5 ${isDismissed ? 'text-gray-300' : 'text-gray-500'}`}>
              {issue.description}
            </p>
          </div>
          {isAccepted && (
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" aria-label="Accepted" />
          )}
          {isDismissed && (
            <XCircle className="h-5 w-5 text-gray-300 flex-shrink-0" aria-label="Dismissed" />
          )}
        </div>

        {isPending && issue.fixOptions.length > 0 && (
          <div className="space-y-2 mt-3">
            <fieldset>
              <legend className="sr-only">Fix options for: {issue.title}</legend>
              <div className="space-y-1.5">
                {issue.fixOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-2 p-2 rounded-md text-xs cursor-pointer transition-colors ${
                      issue.selectedFix === opt.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`fix-${issue.id}`}
                      value={opt.id}
                      checked={issue.selectedFix === opt.id}
                      onChange={() => onSelectFix(issue.id, opt.id)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => onAccept(issue.id)}
                disabled={!issue.selectedFix}
                className="flex-1"
              >
                <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Accept Fix
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDismiss(issue.id)}
                className="flex-1"
              >
                <X className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: IssueSeverity }) {
  if (severity === 'error') {
    return (
      <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-700 text-xs font-bold" aria-label="Error">
        E
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded bg-yellow-100 text-yellow-700 text-xs font-bold" aria-label="Warning">
      W
    </span>
  );
}
