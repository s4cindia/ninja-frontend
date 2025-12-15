import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ConformanceBadge } from '@/components/compliance/ConformanceBadge';
import { useSection508Mapping } from '@/hooks/useCompliance';

export function Section508Page() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useSection508Mapping(fileId || '');
  const [copiedCriterion, setCopiedCriterion] = useState<string | null>(null);

  const copyToClipboard = (text: string, criterionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCriterion(criterionId);
    setTimeout(() => setCopiedCriterion(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Loading Section 508 mapping...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(`/validation/${fileId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          Back to Validation
        </Button>
        <Alert variant="error">Failed to load Section 508 mapping. Please try again.</Alert>
      </div>
    );
  }

  const supportsCounts = {
    supports: data.criteriaResults.filter(c => c.conformanceLevel === 'Supports').length,
    partial: data.criteriaResults.filter(c => c.conformanceLevel === 'Partially Supports').length,
    notSupport: data.criteriaResults.filter(c => c.conformanceLevel === 'Does Not Support').length,
    na: data.criteriaResults.filter(c => c.conformanceLevel === 'Not Applicable').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/validation/${fileId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          Back to Validation
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Section 508 Compliance</h1>
        <p className="mt-1 text-sm text-gray-500">WCAG 2.0 Level AA mapping to Section 508 requirements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-3xl font-bold text-primary-600">{data.overallCompliance}%</div>
          <div className="text-sm text-gray-500">Overall Compliance</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{supportsCounts.supports}</div>
          <div className="text-sm text-gray-500">Supports</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-yellow-600">{supportsCounts.partial}</div>
          <div className="text-sm text-gray-500">Partially Supports</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-600">{supportsCounts.notSupport}</div>
          <div className="text-sm text-gray-500">Does Not Support</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-400">{supportsCounts.na}</div>
          <div className="text-sm text-gray-500">Not Applicable</div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <FileText className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" aria-hidden="true" />
          <div className="flex-1">
            <h2 className="text-lg font-medium text-blue-900">Competitive Positioning</h2>
            <p className="mt-2 text-blue-800">{data.competitivePositioning}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4" 
              onClick={() => copyToClipboard(data.competitivePositioning, 'positioning')}
            >
              {copiedCriterion === 'positioning' ? (
                <><CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />Copied!</>
              ) : (
                <><Copy className="h-4 w-4 mr-2" aria-hidden="true" />Copy for Procurement</>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Criteria Results</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Criterion</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WCAG Mapping</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conformance</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.criteriaResults.map((criterion) => (
                <tr key={criterion.criterionId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{criterion.criterionId}</div>
                    <div className="text-sm text-gray-500">{criterion.title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {criterion.wcagMapping.slice(0, 5).map((wcag) => (
                        <span key={wcag} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{wcag}</span>
                      ))}
                      {criterion.wcagMapping.length > 5 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                          +{criterion.wcagMapping.length - 5} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <ConformanceBadge level={criterion.conformanceLevel} size="sm" />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-md">{criterion.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data.bestMeetsGuidance.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Best Meets Guidance</h2>
            <p className="text-sm text-gray-500">Suggested language for procurement responses</p>
          </div>
          <div className="divide-y divide-gray-200">
            {data.bestMeetsGuidance.map((guidance) => (
              <div key={guidance.criterionId} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{guidance.criterionId}</span>
                  <ConformanceBadge level={guidance.currentStatus} size="sm" />
                </div>
                <p className="text-sm text-gray-700 mb-2">{guidance.bestMeetsLanguage}</p>
                {guidance.improvementPath && (
                  <p className="text-xs text-gray-500">
                    <strong>Improvement:</strong> {guidance.improvementPath}
                  </p>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2" 
                  onClick={() => copyToClipboard(guidance.bestMeetsLanguage, guidance.criterionId)}
                >
                  {copiedCriterion === guidance.criterionId ? (
                    <><CheckCircle className="h-3 w-3 mr-1" aria-hidden="true" />Copied</>
                  ) : (
                    <><Copy className="h-3 w-3 mr-1" aria-hidden="true" />Copy</>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
