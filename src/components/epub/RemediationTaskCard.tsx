import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  AlertTriangle,
  Hand,
  ExternalLink,
  FileCode,
  BookOpen,
  Copy,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";
import DOMPurify from "dompurify";
import { hasQuickFixTemplate } from "@/data/quickFixTemplates";
import { QuickFixPanel } from "@/components/quickfix/QuickFixPanel";
import { FixTypeBadge } from "@/components/remediation/FixTypeBadge";
import type { QuickFix } from "@/types/quickfix.types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatStep(step: string): string {
  let formatted = step;
  const codeMatches: string[] = [];
  formatted = formatted.replace(/`([^`]+)`/g, (_match, code) => {
    const placeholder = `__CODE_${codeMatches.length}__`;
    codeMatches.push(code);
    return placeholder;
  });
  formatted = escapeHtml(formatted);
  codeMatches.forEach((code, i) => {
    const escapedCode = escapeHtml(code);
    formatted = formatted.replace(
      `__CODE_${i}__`,
      `<code class="bg-amber-100 px-1 rounded text-xs font-mono">${escapedCode}</code>`,
    );
  });
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return formatted;
}

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped";
export type TaskType = "auto" | "manual";
export type FixTypeValue = "auto" | "quickfix" | "manual";

export interface RemediationTask {
  id: string;
  code: string;
  severity: "critical" | "serious" | "moderate" | "minor";
  message: string;
  location?: string;
  suggestion?: string;
  type: TaskType;
  fixType?: FixTypeValue;
  status: TaskStatus;
  notes?: string;
  completionMethod?: "auto" | "manual";
  filePath?: string;
  selector?: string;
  wcagCriteria?: string[];
  source?: string;
  html?: string;
  remediation?:
    | string
    | {
        title: string;
        steps: string[];
        codeExample?: { before: string; after: string };
        resources?: { label: string; url: string }[];
      };
}

interface RemediationTaskCardProps {
  task: RemediationTask;
  jobId?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onMarkFixed?: (taskId: string, notes?: string) => Promise<void>;
  onViewInContext?: (filePath: string, selector?: string) => void;
  onQuickFixApply?: (taskId: string, fix: QuickFix) => Promise<void>;
  onSkipTask?: (taskId: string, reason?: string) => Promise<void>;
  onFixApplied?: () => void;
}

const statusConfig: Record<
  TaskStatus,
  { icon: React.ReactNode; bgColor: string; textColor: string; label: string }
> = {
  pending: {
    icon: <Clock className="h-4 w-4" />,
    bgColor: "bg-gray-100",
    textColor: "text-gray-600",
    label: "Pending",
  },
  in_progress: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    bgColor: "bg-blue-100",
    textColor: "text-blue-600",
    label: "In Progress",
  },
  completed: {
    icon: <CheckCircle className="h-4 w-4" />,
    bgColor: "bg-green-100",
    textColor: "text-green-600",
    label: "Completed",
  },
  failed: {
    icon: <XCircle className="h-4 w-4" />,
    bgColor: "bg-red-100",
    textColor: "text-red-600",
    label: "Failed",
  },
  skipped: {
    icon: <AlertTriangle className="h-4 w-4" />,
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-600",
    label: "Skipped",
  },
};

const severityConfig: Record<
  string,
  { variant: "error" | "warning" | "info" | "default" }
> = {
  critical: { variant: "error" },
  serious: { variant: "error" },
  moderate: { variant: "warning" },
  minor: { variant: "info" },
};

const sourceConfig: Record<string, { bgColor: string; textColor: string }> = {
  ace: { bgColor: "bg-purple-100", textColor: "text-purple-700" },
  epubcheck: { bgColor: "bg-indigo-100", textColor: "text-indigo-700" },
  axe: { bgColor: "bg-teal-100", textColor: "text-teal-700" },
  manual: { bgColor: "bg-gray-100", textColor: "text-gray-700" },
};

const WcagBadge: React.FC<{ criterion: string }> = ({ criterion }) => {
  const wcagUrl = `https://www.w3.org/WAI/WCAG21/Understanding/${criterion.toLowerCase().replace(".", "")}`;

  return (
    <a
      href={wcagUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      WCAG {criterion}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
};

const SourceBadge: React.FC<{ source: string }> = ({ source }) => {
  const config = sourceConfig[source.toLowerCase()] || sourceConfig.manual;
  return (
    <span
      className={clsx(
        "px-2 py-0.5 text-xs rounded font-medium",
        config.bgColor,
        config.textColor,
      )}
    >
      {source.toUpperCase()}
    </span>
  );
};

const CopyButton: React.FC<{ text: string; label?: string }> = ({
  text,
  label = "Copy",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={clsx(
        "inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors",
        copied
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200",
      )}
      title={copied ? "Copied!" : label}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : label}
    </button>
  );
};

function highlightCodeChanges(before: string, after: string): string {
  const beforeLines = new Set(before.split("\n").map((l) => l.trim()));
  return after
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed && !beforeLines.has(trimmed) && !trimmed.startsWith("<!--")) {
        return `<span class="bg-green-200 text-green-900">${escapeHtml(line)}</span>`;
      }
      return escapeHtml(line);
    })
    .join("\n");
}

const RemediationGuidance: React.FC<{
  title: string;
  steps: string[];
  codeExample?: { before: string; after: string };
  resources?: { label: string; url: string }[];
  filePath?: string;
  onViewFile?: () => void;
}> = ({ title, steps, codeExample, resources, filePath, onViewFile }) => (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
    <h4 className="font-medium text-amber-800 flex items-center gap-2">
      <BookOpen className="h-4 w-4" />
      {title}
    </h4>
    {filePath && (
      <div className="flex items-center gap-2 text-xs">
        <FileCode className="h-3 w-3 text-amber-600" />
        <span className="font-mono text-amber-700">{filePath}</span>
        {onViewFile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewFile();
            }}
            className="text-blue-600 hover:underline"
          >
            Open File
          </button>
        )}
      </div>
    )}
    <ol className="list-decimal list-inside space-y-1.5 text-sm text-amber-900">
      {steps.map((step, idx) => (
        <li
          key={idx}
          className="leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(formatStep(step), {
              ALLOWED_TAGS: ["code", "strong"],
              ALLOWED_ATTR: ["class"],
            }),
          }}
        />
      ))}
    </ol>
    {codeExample && (
      <div className="mt-3 space-y-2">
        <div>
          <p className="text-xs font-medium text-red-600 mb-1">Before:</p>
          <pre className="p-2 bg-red-50 border border-red-200 rounded text-xs overflow-x-auto font-mono text-red-800">
            {codeExample.before}
          </pre>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-green-600">
              After (Fixed) - changes highlighted:
            </p>
            <CopyButton text={codeExample.after} label="Copy Code" />
          </div>
          <pre
            className="p-2 bg-green-50 border border-green-200 rounded text-xs overflow-x-auto font-mono text-green-800"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(
                highlightCodeChanges(codeExample.before, codeExample.after),
                { ALLOWED_TAGS: ["span", "br"], ALLOWED_ATTR: ["class"] },
              ),
            }}
          />
        </div>
      </div>
    )}
    <div className="pt-2 border-t border-amber-200 text-xs text-amber-700">
      <strong>Validation:</strong> After saving, use{" "}
      <code className="bg-amber-100 px-1 rounded">Tools → Validate EPUB</code>{" "}
      in Sigil to check for errors.
    </div>
    {resources && resources.length > 0 && (
      <div className="pt-2 border-t border-amber-200">
        <p className="text-xs font-medium text-amber-700 mb-1">Resources:</p>
        <div className="flex flex-wrap gap-2">
          {resources.map((resource, idx) => (
            <a
              key={idx}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {resource.label}
              <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>
      </div>
    )}
  </div>
);

export const RemediationTaskCard: React.FC<RemediationTaskCardProps> = ({
  task,
  jobId,
  isExpanded: controlledExpanded,
  onToggleExpand,
  onMarkFixed,
  onViewInContext,
  onQuickFixApply,
  onSkipTask,
  onFixApplied,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isExpanded = controlledExpanded ?? internalExpanded;
  
  const effectiveFixType: FixTypeValue = task.fixType || 
    (task.type === 'auto' ? 'auto' : hasQuickFixTemplate(task.code) ? 'quickfix' : 'manual');
  const canUseQuickFix = effectiveFixType === 'quickfix';
  
  const handleQuickFixApply = async (fix: QuickFix) => {
    if (!onQuickFixApply) return;
    await onQuickFixApply(task.id, fix);
  };

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  const handleMarkFixed = async () => {
    if (!onMarkFixed) return;
    setIsSubmitting(true);
    try {
      await onMarkFixed(task.id, notes || undefined);
      setShowNotes(false);
      setNotes("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewInContext = () => {
    if (onViewInContext && task.filePath) {
      onViewInContext(task.filePath, task.selector);
    }
  };

  const status = statusConfig[task.status];
  const severity = severityConfig[task.severity] || {
    variant: "default" as const,
  };

  return (
    <div
      className={clsx(
        "border rounded-lg transition-all",
        status.bgColor,
        "hover:shadow-sm",
      )}
    >
      <button
        onClick={handleToggle}
        className="w-full p-4 flex items-start gap-3 text-left"
        aria-expanded={isExpanded}
      >
        <div className={clsx("mt-0.5 flex-shrink-0", status.textColor)}>
          {status.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="default" size="sm">
              {task.code}
            </Badge>
            <Badge variant={severity.variant} size="sm">
              {task.severity}
            </Badge>
            <FixTypeBadge
              fixType={task.status === "completed" ? "fixed" : effectiveFixType}
              size="sm"
            />
            {task.source && <SourceBadge source={task.source} />}
            <span
              className={clsx("text-xs font-medium ml-auto", status.textColor)}
            >
              {status.label}
            </span>
          </div>

          <p className="text-sm text-gray-800">{task.message}</p>

          {task.location && (
            <p className="text-xs text-gray-500 mt-1 font-mono">
              {task.location}
            </p>
          )}

          {task.wcagCriteria && task.wcagCriteria.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {task.wcagCriteria.map((criterion) => (
                <WcagBadge key={criterion} criterion={criterion} />
              ))}
            </div>
          )}

          {task.status === "pending" && effectiveFixType !== "auto" && (
            <div className="mt-2 text-xs">
              {effectiveFixType === "quickfix" ? (
                <span className="text-blue-600">
                  Click to open Quick Fix Panel
                </span>
              ) : (
                <span className="text-yellow-600">
                  Requires external editor (Sigil)
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 text-gray-400">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-200 bg-white/50 space-y-4">
          {task.status !== "completed" && task.suggestion && (
            <div>
              <dt className="text-xs font-medium text-gray-500">Suggestion</dt>
              <dd className="text-sm text-gray-700 mt-0.5">
                {task.suggestion}
              </dd>
            </div>
          )}

          {task.filePath && task.type === "manual" && onViewInContext && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleViewInContext();
              }}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <FileCode className="h-4 w-4 mr-2" />
              View in Context
              {task.selector && (
                <span className="ml-2 text-xs text-gray-500 font-mono truncate max-w-[150px]">
                  {task.selector}
                </span>
              )}
            </Button>
          )}

          {task.type === "manual" && task.status === "pending" && canUseQuickFix && (
            <QuickFixPanel
              issue={{
                id: task.id,
                code: task.code,
                message: task.message,
                location: task.location,
                filePath: task.filePath,
                currentContent: task.html,
              }}
              jobId={jobId}
              onApplyFix={handleQuickFixApply}
              onFixApplied={onFixApplied}
              onMarkFixed={onMarkFixed}
              onSkip={async () => {
                try {
                  if (onSkipTask) {
                    await onSkipTask(task.id, "Skipped - will fix manually");
                  }
                } catch (err) {
                  console.error('Failed to skip task:', err);
                }
              }}
              onEditManually={() => setShowNotes(true)}
            />
          )}

          {task.status === "completed" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Issue Resolved</span>
              </div>
              {task.completionMethod && (
                <p className="text-sm text-green-600">
                  Method: {task.completionMethod === "auto" ? "Auto-Remediation" : 
                           task.completionMethod === "manual" ? "Manual Fix" : "Quick Fix"}
                </p>
              )}
              {task.notes && (
                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Notes:</span> {task.notes}
                </p>
              )}
            </div>
          )}

          {task.type === "manual" && task.status === "pending" && !canUseQuickFix && task.remediation &&
            (typeof task.remediation === "string" ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <h4 className="font-medium text-amber-800 flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4" />
                  Remediation Guidance
                </h4>
                <p className="text-sm text-amber-900">{task.remediation}</p>
              </div>
            ) : (
              <RemediationGuidance
                title={task.remediation.title}
                steps={task.remediation.steps}
                codeExample={task.remediation.codeExample}
                resources={task.remediation.resources}
                filePath={task.filePath}
                onViewFile={
                  task.filePath && onViewInContext
                    ? handleViewInContext
                    : undefined
                }
              />
            ))}

          {task.html && (
            <div>
              <dt className="text-xs font-medium text-gray-500 mb-1">
                Code Snippet
              </dt>
              <pre className="text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto">
                <code>{task.html}</code>
              </pre>
            </div>
          )}


          {task.type === "manual" &&
            task.status === "pending" &&
            onMarkFixed && (
              <div className="pt-3 border-t border-gray-200">
                {!showNotes ? (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNotes(true);
                    }}
                    size="sm"
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Manually Fixed
                  </Button>
                ) : (
                  <div
                    className="space-y-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe what was fixed (optional)..."
                      className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      rows={2}
                      aria-label="Notes about fix"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleMarkFixed}
                        disabled={isSubmitting}
                        size="sm"
                      >
                        {isSubmitting ? "Saving..." : "Confirm Fixed"}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowNotes(false);
                          setNotes("");
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

          {task.type === "manual" &&
            task.status === "pending" &&
            !onMarkFixed && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded">
                <Hand className="h-4 w-4" />
                <span className="text-xs font-medium">
                  This issue requires manual intervention
                </span>
              </div>
            )}
        </div>
      )}
    </div>
  );
};
