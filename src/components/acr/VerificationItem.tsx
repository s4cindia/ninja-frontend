import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  History,
  FileText,
  Copy
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { NaSuggestionBannerSimple } from './NaSuggestionBannerSimple';
import type {
  VerificationItem as VerificationItemType,
  VerificationStatus,
  VerificationMethod
} from '@/types/verification.types';

interface VerificationItemProps {
  item: VerificationItemType;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onSubmit: (itemId: string, status: VerificationStatus, method: VerificationMethod, notes: string) => void;
  isSubmitting: boolean;
  onViewGuidance?: (itemId: string) => void;
}

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800' },
  serious: { label: 'Serious', className: 'bg-orange-100 text-orange-800' },
  moderate: { label: 'Moderate', className: 'bg-yellow-100 text-yellow-800' },
  minor: { label: 'Minor', className: 'bg-gray-100 text-gray-800' },
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, className: 'text-gray-500' },
  verified_pass: { label: 'Verified Pass', icon: CheckCircle, className: 'text-green-600' },
  verified_fail: { label: 'Verified Fail', icon: XCircle, className: 'text-red-600' },
  verified_partial: { label: 'Partial', icon: AlertTriangle, className: 'text-yellow-600' },
  deferred: { label: 'Deferred', icon: Clock, className: 'text-blue-500' },
  not_applicable: { label: 'Not Applicable', icon: AlertTriangle, className: 'text-blue-600' },
};

const VERIFICATION_METHODS: VerificationMethod[] = [
  'NVDA 2024.1',
  'JAWS 2024',
  'VoiceOver',
  'Manual Review',
  'Keyboard Only',
  'Axe DevTools',
  'WAVE',
];

const VERIFICATION_STATUSES: { value: VerificationStatus; label: string }[] = [
  { value: 'verified_pass', label: 'Verified Pass' },
  { value: 'verified_fail', label: 'Verified Fail' },
  { value: 'verified_partial', label: 'Verified Partial' },
  { value: 'deferred', label: 'Deferred' },
];

export function VerificationItem({ item, isSelected, onSelect, onSubmit, isSubmitting, onViewGuidance }: VerificationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [showFixedIssues, setShowFixedIssues] = useState(false);
  
  const latestHistory = item.history.length > 0 ? item.history[item.history.length - 1] : null;
  const historyLength = item.history.length;
  
  const [formStatus, setFormStatus] = useState<VerificationStatus>(
    latestHistory?.status ?? 'verified_pass'
  );
  const [formMethod, setFormMethod] = useState<VerificationMethod>(
    latestHistory?.method ?? 'Manual Review'
  );
  const [formNotes, setFormNotes] = useState(latestHistory?.notes ?? '');

  useEffect(() => {
    const latest = item.history.length > 0 ? item.history[item.history.length - 1] : null;
    if (latest) {
      setFormStatus(latest.status);
      setFormMethod(latest.method);
      setFormNotes(latest.notes);
      setSubmitSuccess(true);
      const timer = setTimeout(() => setSubmitSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [historyLength, item.history]);

  const severityConfig = SEVERITY_CONFIG[item.severity];
  const statusConfig = STATUS_CONFIG[item.status];
  const StatusIcon = statusConfig.icon;

  const requiresNotes = formStatus === 'verified_fail' || formStatus === 'verified_partial';
  const canSubmit = !requiresNotes || formNotes.trim().length > 0;

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit(item.id, formStatus, formMethod, formNotes);
    }
  };

  const handleAcceptNASuggestion = () => {
    // Accept the N/A suggestion by marking as verified pass with AI-generated note
    const naNote = `AI-suggested Not Applicable (${item.naSuggestion?.confidence}% confidence): ${item.naSuggestion?.rationale}`;
    setFormStatus('verified_pass');
    setFormMethod('Manual Review');
    setFormNotes(naNote);
    // Auto-submit the verification
    onSubmit(item.id, 'verified_pass', 'Manual Review', naNote);
  };

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input[type="checkbox"]') || target.closest('button')) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={cn(
      'border rounded-lg overflow-hidden',
      isSelected && 'ring-2 ring-primary-500',
      item.status === 'pending' && 'border-orange-200 bg-orange-50/30'
    )}>
      <div 
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={handleRowClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
        aria-label={`${item.criterionId} ${item.criterionName} - Click to ${isExpanded ? 'collapse' : 'expand'} verification form`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(item.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          aria-label={`Select ${item.criterionId}`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{item.criterionId}</span>
            <span className="text-sm text-gray-600 truncate">{item.criterionName}</span>
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded font-medium',
              item.wcagLevel === 'A' && 'bg-blue-100 text-blue-700',
              item.wcagLevel === 'AA' && 'bg-purple-100 text-purple-700',
              item.wcagLevel === 'AAA' && 'bg-indigo-100 text-indigo-700'
            )}>
              {item.wcagLevel}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="default" className={severityConfig.className}>
              {severityConfig.label}
            </Badge>
            <span className="text-xs text-gray-500">
              Confidence: {item.confidenceScore}%
            </span>
            <span className="text-xs text-gray-500">
              Auto: {item.automatedResult}
            </span>
            {(item.issues && item.issues.length > 0) && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {item.issues.length} issue{item.issues.length !== 1 ? 's' : ''}
              </span>
            )}
            {(item.fixedIssues && item.fixedIssues.length > 0) && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                <CheckCircle className="h-3 w-3" aria-hidden="true" />
                {item.fixedIssues.length} fixed
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={cn('flex items-center gap-1', statusConfig.className)}>
            <StatusIcon className="h-4 w-4" />
            <span className="text-sm font-medium">{statusConfig.label}</span>
          </div>

          {item.history.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowHistory(!showHistory);
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
              aria-label="View history"
            >
              <History className="h-4 w-4" />
            </button>
          )}

          <ChevronDown className={cn(
            'h-5 w-5 text-gray-400 transition-transform',
            isExpanded && 'rotate-180'
          )} />
        </div>
      </div>

      {showHistory && item.history.length > 0 && (
        <div className="px-4 pb-4 border-t bg-gray-50">
          <h4 className="text-sm font-medium text-gray-700 mt-3 mb-2">Verification History</h4>
          <div className="space-y-2">
            {item.history.map((entry) => (
              <div key={entry.id} className="text-sm bg-white p-2 rounded border">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{STATUS_CONFIG[entry.status].label}</span>
                  <span className="text-gray-500 text-xs">{entry.verifiedAt}</span>
                </div>
                <div className="text-gray-600 text-xs mt-1">
                  {entry.method} by {entry.verifiedBy}
                </div>
                {entry.notes && (
                  <p className="text-gray-600 mt-1">{entry.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="px-4 pb-4 border-t">
          <div className="mt-4 space-y-4">
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Automated Finding</h4>
              <p className="text-sm text-gray-600">{item.automatedNotes}</p>
            </div>

            {/* N/A Suggestion Banner */}
            {item.naSuggestion && (
              <NaSuggestionBannerSimple
                suggestion={item.naSuggestion}
                onAccept={handleAcceptNASuggestion}
                isAccepting={isSubmitting}
              />
            )}

            {/* SECTION 1: Fixed Issues (Reference Only) */}
            {item.fixedIssues && item.fixedIssues.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowFixedIssues(!showFixedIssues)}
                  className="flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700"
                >
                  <ChevronRight className={cn(
                    'h-4 w-4 transition-transform',
                    showFixedIssues && 'rotate-90'
                  )} />
                  {showFixedIssues ? 'Hide' : 'Show'} {item.fixedIssues.length} Fixed Issue{item.fixedIssues.length !== 1 ? 's' : ''} (Reference)
                </button>

                {showFixedIssues && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded border border-green-200">
                      These issues were automatically fixed during remediation. Expand to verify fixes were applied correctly.
                    </p>

                    {item.fixedIssues.map((issue, idx) => {
                      const impactLabel = issue.impact || issue.severity || 'unknown';
                      
                      return (
                        <div key={issue.id || issue.issueId || idx} className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">
                                  FIXED - {String(impactLabel).toUpperCase()}
                                </span>
                                {issue.ruleId && (
                                  <span className="text-xs text-gray-600 font-mono">
                                    {issue.ruleId}
                                  </span>
                                )}
                                {issue.fixMethod && (
                                  <span className="text-xs text-green-600">
                                    ({issue.fixMethod === 'automated' ? 'Auto-fixed' : 'Manually fixed'})
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-900 mt-2 font-medium">
                                {issue.message}
                              </p>
                            </div>
                          </div>

                          {issue.location && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Original Location:</p>
                              <p className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                                {issue.filePath && <span className="font-mono">{issue.filePath} - </span>}
                                {issue.location}
                              </p>
                            </div>
                          )}

                          {(issue.html || issue.htmlSnippet) && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Original HTML (Before Fix):</p>
                              <pre className="text-xs text-gray-800 bg-white p-2 rounded overflow-x-auto border">
                                <code>{issue.html || issue.htmlSnippet}</code>
                              </pre>
                            </div>
                          )}

                          {issue.suggestedFix && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Applied Fix:</p>
                              <pre className="text-xs text-green-800 bg-white p-2 rounded overflow-x-auto border border-green-200">
                                <code>{issue.suggestedFix}</code>
                              </pre>
                            </div>
                          )}

                          <div className="mt-3 text-xs text-green-700">
                            Verify this fix was applied correctly by checking the remediated EPUB at the location above.
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 2: Remaining Issues (Requires Attention) */}
            {item.issues && item.issues.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowIssues(!showIssues)}
                  className="flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700"
                >
                  <ChevronRight className={cn(
                    'h-4 w-4 transition-transform',
                    showIssues && 'rotate-90'
                  )} />
                  {showIssues ? 'Hide' : 'Show'} {item.issues.length} Issue{item.issues.length !== 1 ? 's' : ''} Requiring Review
                </button>

                {showIssues && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-orange-700 bg-orange-50 px-3 py-2 rounded border border-orange-200">
                      These issues were NOT fixed during automated remediation and require manual attention.
                    </p>

                    {item.issues.map((issue, idx) => {
                      const impactLabel = issue.impact || issue.severity || 'unknown';
                      
                      return (
                        <div key={issue.id || issue.issueId || idx} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                                  {String(impactLabel).toUpperCase()}
                                </span>
                                {issue.ruleId && (
                                  <span className="text-xs text-gray-600 font-mono">
                                    {issue.ruleId}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-900 mt-2 font-medium">
                                {issue.message}
                              </p>
                            </div>
                          </div>

                          {issue.location && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Location:</p>
                              <p className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                                {issue.filePath && <span className="font-mono">{issue.filePath} - </span>}
                                {issue.location}
                              </p>
                            </div>
                          )}

                          {(issue.html || issue.htmlSnippet) && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-medium text-gray-700">Current HTML:</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(issue.html || issue.htmlSnippet || '');
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                  <Copy className="h-3 w-3" />
                                  Copy
                                </button>
                              </div>
                              <pre className="text-xs text-gray-800 bg-white p-2 rounded overflow-x-auto border">
                                <code>{issue.html || issue.htmlSnippet}</code>
                              </pre>
                            </div>
                          )}

                          {issue.suggestedFix && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Suggested Fix:</p>
                              <pre className="text-xs text-green-800 bg-green-50 p-2 rounded overflow-x-auto border border-green-200">
                                <code>{issue.suggestedFix}</code>
                              </pre>
                            </div>
                          )}

                          {issue.filePath && !issue.location && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">File:</p>
                              <p className="text-xs text-gray-600 font-mono">
                                {issue.filePath}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Show message if no issues at all */}
            {(!item.issues || item.issues.length === 0) &&
             (!item.fixedIssues || item.fixedIssues.length === 0) && (
              <div className="mt-4 text-sm text-gray-500 italic">
                No specific issues detected for this criterion. Manual verification still required.
              </div>
            )}

            {/* View Guidance Button */}
            {onViewGuidance && (
              <div className="mt-4 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewGuidance(item.id)}
                  className="w-full sm:w-auto"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Testing Guidance & Resources
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor={`status-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Status
                </label>
                <select
                  id={`status-${item.id}`}
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as VerificationStatus)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                >
                  {VERIFICATION_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={`method-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Method
                </label>
                <select
                  id={`method-${item.id}`}
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value as VerificationMethod)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                >
                  {VERIFICATION_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor={`notes-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                Notes {requiresNotes && <span className="text-red-500">*</span>}
              </label>
              <textarea
                id={`notes-${item.id}`}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
                placeholder={requiresNotes ? 'Notes are required for fail/partial status' : 'Optional notes...'}
                className={cn(
                  'w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm',
                  requiresNotes && !formNotes.trim() && 'border-red-300'
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              {submitSuccess && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Saved!
                </span>
              )}
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                isLoading={isSubmitting}
              >
                Submit Verification
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
