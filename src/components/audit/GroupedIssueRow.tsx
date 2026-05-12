/**
 * Renders a collapsible group of same-code issues — used by the audit-results
 * UI to keep high-volume P3 codes (PRH-MARKUP-*, PRH-PAGEBREAK-*,
 * PRH-FOOTNOTE-*) from blowing out the flat list. Two-level disclosure:
 *
 *   PRH-MARKUP-DEPRECATED-TAG · 73 instances across 12 files · moderate   ▾
 *     ├─ chapter-05.xhtml · 18 instances                                  ▸
 *     ├─ chapter-06.xhtml · 12 instances                                  ▾
 *     │    [renderIssue(issue) for each]
 *     └─ ...
 *
 * The component is presentation-only — it receives a fully-grouped entry
 * (computed by `groupIssues`) and a `renderIssue` render-prop. Callers
 * (today: EPUBAuditResults) supply the renderer so this component never
 * has to know about the row chrome (severity icons, quick-fix buttons,
 * remediation guidance, etc.) used in the flat list.
 */

import { useState, type ReactNode } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileCode,
  Info,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Badge } from '../ui/Badge';
import type { GroupEntry, GroupableIssue } from './group-issues';

interface GroupedIssueRowProps<T extends GroupableIssue> {
  entry: GroupEntry<T>;
  renderIssue: (issue: T) => ReactNode;
  /** Whether the group starts expanded. Defaults to false (collapsed). */
  defaultExpanded?: boolean;
}

const SEVERITY_BADGE: Record<
  GroupableIssue['severity'],
  { variant: 'error' | 'warning' | 'info' | 'default'; icon: ReactNode; tint: string }
> = {
  critical: { variant: 'error', icon: <AlertCircle className="h-3.5 w-3.5" />, tint: 'text-red-600' },
  serious: { variant: 'warning', icon: <AlertTriangle className="h-3.5 w-3.5" />, tint: 'text-orange-600' },
  moderate: { variant: 'warning', icon: <Info className="h-3.5 w-3.5" />, tint: 'text-yellow-600' },
  minor: { variant: 'info', icon: <Info className="h-3.5 w-3.5" />, tint: 'text-blue-600' },
};

export function GroupedIssueRow<T extends GroupableIssue>({
  entry,
  renderIssue,
  defaultExpanded = false,
}: GroupedIssueRowProps<T>) {
  const [groupExpanded, setGroupExpanded] = useState(defaultExpanded);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(() => new Set());

  const toggleFile = (filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const sev = SEVERITY_BADGE[entry.severity];
  const fileCount = entry.files.length;
  const groupTestId = `issue-group-${entry.code}`;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setGroupExpanded((v) => !v)}
        aria-expanded={groupExpanded}
        aria-controls={`${groupTestId}-body`}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        data-testid={groupTestId}
      >
        <span className={cn('shrink-0', sev.tint)} aria-hidden="true">
          {groupExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <Badge variant={sev.variant} size="sm" className="font-mono">
          {entry.code}
        </Badge>
        <span className="text-sm text-gray-700">
          <span className="font-semibold text-gray-900">{entry.count}</span>{' '}
          {entry.count === 1 ? 'instance' : 'instances'}
          {' across '}
          <span className="font-semibold text-gray-900">{fileCount}</span>{' '}
          {fileCount === 1 ? 'file' : 'files'}
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span className={cn('inline-flex items-center', sev.tint)} aria-hidden="true">
            {sev.icon}
          </span>
          <Badge variant={sev.variant} size="sm">
            {entry.severity}
          </Badge>
        </span>
      </button>

      {groupExpanded && (
        <div
          id={`${groupTestId}-body`}
          className="border-t border-gray-200 divide-y divide-gray-100 bg-gray-50"
        >
          {entry.files.map((bucket) => {
            const isOpen = expandedFiles.has(bucket.filePath);
            const fileTestId = `${groupTestId}-file-${bucket.filePath}`;
            return (
              <div key={bucket.filePath}>
                <button
                  type="button"
                  onClick={() => toggleFile(bucket.filePath)}
                  aria-expanded={isOpen}
                  aria-controls={`${fileTestId}-body`}
                  className="w-full flex items-center gap-2 px-6 py-2 text-left text-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  data-testid={fileTestId}
                >
                  <span className="shrink-0 text-gray-500" aria-hidden="true">
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </span>
                  <FileCode className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                  <span className="font-mono text-xs text-gray-700 truncate">{bucket.filePath}</span>
                  <span className="ml-auto text-xs text-gray-500 shrink-0">
                    {bucket.issues.length} {bucket.issues.length === 1 ? 'instance' : 'instances'}
                  </span>
                </button>
                {isOpen && (
                  <div
                    id={`${fileTestId}-body`}
                    className="px-4 py-2 space-y-2 bg-white"
                  >
                    {bucket.issues.map((issue) => (
                      <div key={issue.id}>{renderIssue(issue)}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
