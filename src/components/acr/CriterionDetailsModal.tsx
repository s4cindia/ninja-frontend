import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { X, ExternalLink, CheckCircle, AlertCircle, Book, Wrench, FileText } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { wcagDocumentationService } from '@/services/wcag-documentation.service';
import type { CriterionConfidence } from '@/services/api';
import type { IssueMapping } from '@/types/confidence.types';

interface CriterionDetailsModalProps {
  criterion: CriterionConfidence;
  relatedIssues?: IssueMapping[];
  isOpen: boolean;
  onClose: () => void;
  onVerifyClick?: (criterionId: string) => void;
  mode?: 'preview' | 'interactive';
}

export function CriterionDetailsModal({
  criterion,
  relatedIssues,
  isOpen,
  onClose,
  onVerifyClick,
  mode = 'interactive'
}: CriterionDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'testing' | 'remediation' | 'wcag'>('overview');
  const wcagDocs = wcagDocumentationService.getDocumentation(criterion.criterionId);

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'A':
        return 'bg-blue-100 text-blue-700';
      case 'AA':
        return 'bg-purple-100 text-purple-700';
      case 'AAA':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium',
                  getLevelBadgeClass(criterion.level)
                )}>
                  {criterion.level}
                </span>
                <DialogTitle className="text-xl font-semibold">
                  {criterion.criterionId} - {criterion.name}
                </DialogTitle>
              </div>
              {wcagDocs && (
                <p className="text-sm text-gray-600 mt-1">
                  {wcagDocs.shortDescription}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'testing' | 'remediation' | 'wcag')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" />
              Testing Guide
            </TabsTrigger>
            <TabsTrigger value="remediation" className="flex items-center gap-1.5">
              <Wrench className="h-4 w-4" />
              Remediation
            </TabsTrigger>
            <TabsTrigger value="wcag" className="flex items-center gap-1.5">
              <Book className="h-4 w-4" />
              WCAG Docs
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="overview" className="space-y-4 mt-0">
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  {criterion.status === 'pass' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  Audit Evidence
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      criterion.status === 'pass' && 'bg-green-100 text-green-700',
                      criterion.status === 'fail' && 'bg-red-100 text-red-700',
                      criterion.status === 'not_applicable' && 'bg-gray-100 text-gray-700'
                    )}>
                      {criterion.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Confidence Score:</span>
                    <span className="font-medium">{criterion.confidenceScore}%</span>
                  </div>
                  {criterion.needsVerification && (
                    <div className="bg-orange-50 border border-orange-200 rounded px-3 py-2 text-sm text-orange-800">
                      This criterion requires human verification
                    </div>
                  )}
                </div>
              </div>

              {wcagDocs && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Intent</h3>
                    <p className="text-sm text-blue-800">{wcagDocs.intent}</p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2">Who Benefits</h3>
                    <ul className="space-y-1">
                      {wcagDocs.benefits.map((benefit, idx) => (
                        <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {wcagDocs.commonIssues.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="font-semibold text-yellow-900 mb-2">Common Issues</h3>
                      <ul className="space-y-1">
                        {wcagDocs.commonIssues.map((issue, idx) => (
                          <li key={idx} className="text-sm text-yellow-800 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {criterion.automatedChecks && criterion.automatedChecks.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Automated Checks</h3>
                  <ul className="space-y-2">
                    {criterion.automatedChecks.map((check) => (
                      <li key={check.id} className="flex items-start gap-2 text-sm">
                        {check.passed ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        )}
                        <span className={cn(check.passed ? 'text-gray-700' : 'text-red-700')}>
                          {check.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {relatedIssues && relatedIssues.length > 0 && (
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Related Issues ({relatedIssues.length})
                  </h3>
                  <ul className="space-y-3">
                    {relatedIssues.map((issue) => (
                      <li key={issue.issueId} className="bg-white border border-red-100 rounded p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-red-800">{issue.message}</span>
                          <span className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium flex-shrink-0',
                            issue.impact === 'critical' && 'bg-red-200 text-red-900',
                            issue.impact === 'serious' && 'bg-orange-200 text-orange-900',
                            issue.impact === 'moderate' && 'bg-yellow-200 text-yellow-900',
                            issue.impact === 'minor' && 'bg-blue-200 text-blue-900'
                          )}>
                            {issue.impact}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">{issue.filePath}</p>
                        {issue.htmlSnippet && (
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                            <code>{issue.htmlSnippet}</code>
                          </pre>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>

            <TabsContent value="testing" className="space-y-4 mt-0">
              {wcagDocs ? (
                <>
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">How to Meet This Criterion</h3>
                      <a
                        href={wcagDocs.howToMeet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        Official Guide <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {wcagDocs.howToMeet.techniques.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">WCAG Techniques:</h4>
                        <ul className="space-y-2">
                          {wcagDocs.howToMeet.techniques.map((technique) => (
                            <li key={technique.id} className="text-sm flex items-start gap-2">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono flex-shrink-0">
                                {technique.id}
                              </span>
                              <span className="text-gray-700">{technique.title}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {wcagDocs.howToMeet.epubSpecific.length > 0 && (
                      <div className="bg-purple-50 border border-purple-200 rounded p-3">
                        <h4 className="text-sm font-medium text-purple-900 mb-2">EPUB-Specific Guidance:</h4>
                        <ul className="space-y-1">
                          {wcagDocs.howToMeet.epubSpecific.map((guidance, idx) => (
                            <li key={idx} className="text-sm text-purple-800 flex items-start gap-2">
                              <Book className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                              {guidance}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Testing Procedures</h3>

                    {wcagDocs.testingProcedure.automated.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Automated Testing:</h4>
                        <ul className="space-y-1">
                          {wcagDocs.testingProcedure.automated.map((step, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {wcagDocs.testingProcedure.manual.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Manual Testing:</h4>
                        <ol className="space-y-1">
                          {wcagDocs.testingProcedure.manual.map((step, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-gray-500 font-medium flex-shrink-0">{idx + 1}.</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {wcagDocs.testingProcedure.tools.length > 0 && (
                      <div className="bg-gray-50 rounded p-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Recommended Tools:</h4>
                        <div className="flex flex-wrap gap-2">
                          {wcagDocs.testingProcedure.tools.map((tool, idx) => (
                            <span key={idx} className="px-2 py-1 bg-white border rounded text-xs text-gray-700">
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {criterion.manualChecks && criterion.manualChecks.length > 0 && (
                    <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                      <h3 className="font-semibold text-orange-900 mb-3">Manual Checks Needed</h3>
                      <ul className="space-y-2">
                        {criterion.manualChecks.map((check, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-orange-800">
                            <span className="text-orange-500 mt-0.5">•</span>
                            {check}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No testing guidance available for this criterion.
                </div>
              )}
            </TabsContent>

            <TabsContent value="remediation" className="space-y-4 mt-0">
              {wcagDocs ? (
                <>
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Code Example</h3>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-red-600">BEFORE (Incorrect)</span>
                        </div>
                        <pre className="bg-red-50 border border-red-200 rounded p-3 text-xs overflow-x-auto">
                          <code className="text-red-900">{wcagDocs.remediationGuidance.before}</code>
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-green-600">AFTER (Correct)</span>
                        </div>
                        <pre className="bg-green-50 border border-green-200 rounded p-3 text-xs overflow-x-auto">
                          <code className="text-green-900">{wcagDocs.remediationGuidance.after}</code>
                        </pre>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-sm text-blue-900">
                          <span className="font-medium">Explanation:</span> {wcagDocs.remediationGuidance.explanation}
                        </p>
                      </div>
                    </div>
                  </div>

                  {wcagDocs.understanding.resources.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Additional Resources</h3>
                      <ul className="space-y-2">
                        {wcagDocs.understanding.resources.map((resource, idx) => (
                          <li key={idx}>
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {resource.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {wcagDocs.understanding.examples.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Examples</h3>
                      <div className="space-y-3">
                        {wcagDocs.understanding.examples.map((example, idx) => (
                          <div key={idx} className="bg-gray-50 rounded p-3">
                            <h4 className="text-sm font-medium text-gray-900 mb-1">{example.title}</h4>
                            <p className="text-sm text-gray-600">{example.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No remediation guidance available for this criterion.
                </div>
              )}
            </TabsContent>

            <TabsContent value="wcag" className="space-y-4 mt-0">
              {wcagDocs ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-3">Official W3C Documentation</h3>
                    <p className="text-sm text-blue-800 mb-3">
                      Click the links below to view the official WCAG documentation in a new tab.
                    </p>
                    <div className="space-y-3">
                      <a
                        href={wcagDocs.wcagUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 p-3 bg-white rounded border hover:border-blue-300 transition-colors"
                      >
                        <ExternalLink className="h-5 w-5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">Understanding {wcagDocs.number} - {wcagDocs.name}</div>
                          <div className="text-xs text-gray-500">Detailed explanation of the success criterion</div>
                        </div>
                      </a>
                      <a
                        href={wcagDocs.howToMeet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 p-3 bg-white rounded border hover:border-blue-300 transition-colors"
                      >
                        <ExternalLink className="h-5 w-5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">How to Meet {wcagDocs.number}</div>
                          <div className="text-xs text-gray-500">Sufficient techniques and common failures</div>
                        </div>
                      </a>
                    </div>
                  </div>

                  {/* Quick Reference Card */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Quick Reference</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Success Criterion:</span>
                        <span className="font-medium">{wcagDocs.number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Level:</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          wcagDocs.level === 'A' && 'bg-blue-100 text-blue-700',
                          wcagDocs.level === 'AA' && 'bg-purple-100 text-purple-700',
                          wcagDocs.level === 'AAA' && 'bg-indigo-100 text-indigo-700'
                        )}>
                          Level {wcagDocs.level}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Conformance:</span>
                        <span className="font-medium">WCAG 2.1</span>
                      </div>
                    </div>
                  </div>

                  {/* Why External Links */}
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Note:</span> WCAG documentation opens in new tabs for security reasons.
                      The W3C prevents embedding their content in other websites to protect against clickjacking attacks.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No WCAG documentation available for this criterion.
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-between items-center gap-2 pt-4 border-t mt-4">
          <div className="flex-1">
            {wcagDocs && (
              <span className="text-xs text-gray-500">
                Applicable to: {wcagDocs.applicableToEpub && 'EPUB'} {wcagDocs.applicableToEpub && wcagDocs.applicableToPdf && ' • '} {wcagDocs.applicableToPdf && 'PDF'}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {mode === 'interactive' && criterion.needsVerification && onVerifyClick && (
              <Button
                variant="primary"
                onClick={() => {
                  onVerifyClick(criterion.criterionId);
                  onClose();
                }}
              >
                Verify This Criterion
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
