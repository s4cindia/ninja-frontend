import { useState } from 'react';
import { useStylesheetDetection, useConvertStyle } from '@/hooks/useStylesheetDetection';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  ArrowRightLeft,
  Loader2,
  ChevronDown,
  ChevronUp,
  Hash,
  Link2,
  BookOpen,
  Gauge,
  List,
  FileQuestion,
} from 'lucide-react';
import type {
  StylesheetDetectionResult,
  SequenceGap,
  ReferenceEntry,
} from '@/types/stylesheet-detection.types';

interface CitationsModuleProps {
  jobId: string;
  documentId?: string;
}

const STYLE_LABELS: Record<string, string> = {
  apa7: 'APA 7th Edition',
  mla9: 'MLA 9th Edition',
  chicago17: 'Chicago 17th Edition',
  vancouver: 'Vancouver',
  ieee: 'IEEE',
};

const CONFIDENCE_COLORS = {
  high: { bg: 'bg-green-100', text: 'text-green-800' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  low: { bg: 'bg-red-100', text: 'text-red-800' },
};

function getConfidenceLevel(confidence: number) {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
}

function getConfidenceLabel(confidence: number) {
  const level = getConfidenceLevel(confidence);
  if (level === 'high') return 'High';
  if (level === 'medium') return 'Medium';
  return 'Low';
}

const SKELETON_CARDS = 4;

export function CitationsModule({ documentId }: CitationsModuleProps): JSX.Element {
  const hasDocumentId = !!documentId;

  const {
    data,
    isLoading,
    isError,
    error,
  } = useStylesheetDetection(documentId ?? '');

  if (!hasDocumentId) {
    return (
      <div className="p-6 text-center">
        <FileQuestion className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Document not ready
        </h2>
        <p className="text-sm text-gray-500">
          The document ID could not be resolved. The job may still be processing.
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to load stylesheet analysis
        </h2>
        <p className="text-sm text-gray-500">
          {error?.message || 'An unexpected error occurred'}
        </p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div
        className="space-y-6"
        role="status"
        aria-label="Loading stylesheet analysis"
        aria-busy="true"
      >
        <div className="space-y-2">
          <div className="h-7 w-56 bg-gray-200 rounded animate-pulse" aria-hidden="true" />
          <div className="h-4 w-72 bg-gray-200 rounded animate-pulse" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: SKELETON_CARDS }, (_, i) => (
            <Card key={i} className="p-4 animate-pulse" aria-hidden="true">
              <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
              <div className="h-8 w-12 bg-gray-200 rounded" />
            </Card>
          ))}
        </div>
        <span className="sr-only">Loading stylesheet analysis, please wait...</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <HeaderSection data={data} />
        <DetectedStyleCard data={data} />
        <OverviewStats data={data} />
        <SequenceAnalysisSection data={data} />
        <CrossReferenceSection data={data} />
        <ReferenceTableSection data={data} />
        <ConversionSection data={data} />
      </div>
    </ErrorBoundary>
  );
}

function HeaderSection({ data }: { data: StylesheetDetectionResult }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">
        Stylesheet Detection
      </h2>
      <p className="text-sm text-gray-500">
        Automatic citation style identification, sequence checking, and cross-reference analysis
      </p>
      {data.filename && (
        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
          <FileText className="h-4 w-4" aria-hidden="true" />
          <span>{data.filename}</span>
          {(data.processingTimeMs ?? 0) > 0 && (
            <span className="text-gray-400 ml-2">({data.processingTimeMs}ms)</span>
          )}
        </div>
      )}
    </div>
  );
}

function DetectedStyleCard({ data }: { data: StylesheetDetectionResult }) {
  const style = data.detectedStyle;
  if (!style) {
    return (
      <Card className="p-5 text-center">
        <FileQuestion className="h-10 w-10 text-gray-400 mx-auto mb-3" aria-hidden="true" />
        <p className="text-gray-500 text-sm">
          No citation style could be detected in this document.
        </p>
      </Card>
    );
  }

  const level = getConfidenceLevel(style.confidence);
  const colors = CONFIDENCE_COLORS[level];
  const pct = Math.round(style.confidence * 100);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <BookOpen className="h-6 w-6 text-blue-600" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{style.styleName}</h3>
            <p className="text-sm text-gray-500">
              Format: <span className="font-medium">{style.citationFormat}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-gray-400" aria-hidden="true" />
              <span className="text-sm text-gray-500">Confidence</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Confidence: ${pct}%`}>
                <div
                  className={`h-full rounded-full ${
                    level === 'high' ? 'bg-green-500' : level === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`text-sm font-semibold ${colors.text}`}>
                {pct}%
              </span>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
          >
            {getConfidenceLabel(style.confidence)}
          </span>
        </div>
      </div>

      {style.evidence && style.evidence.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Detection Evidence</p>
          <ul className="space-y-1">
            {style.evidence.map((item, idx) => (
              <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function OverviewStats({ data }: { data: StylesheetDetectionResult }) {
  const citations = data.citations;
  const crossReference = data.crossReference;
  const sequenceAnalysis = data.sequenceAnalysis;

  const matchRate = (crossReference?.totalReferenceEntries ?? 0) > 0
    ? Math.round(((crossReference?.matched ?? 0) / crossReference!.totalReferenceEntries) * 100)
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Hash className="h-5 w-5 text-blue-600" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-gray-500">In-Body Citations</p>
            <p className="text-2xl font-semibold">{citations?.inBody ?? 0}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <List className="h-5 w-5 text-purple-600" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Reference Entries</p>
            <p className="text-2xl font-semibold">{data.referenceList?.totalEntries ?? 0}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <Link2 className="h-5 w-5 text-green-600" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Match Rate</p>
            <p className="text-2xl font-semibold text-green-600">{matchRate}%</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${sequenceAnalysis?.isSequential ? 'bg-green-50' : 'bg-red-50'}`}>
            {sequenceAnalysis?.isSequential ? (
              <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">Sequence</p>
            <p className={`text-lg font-semibold ${sequenceAnalysis?.isSequential ? 'text-green-600' : 'text-red-600'}`}>
              {sequenceAnalysis?.isSequential ? 'Valid' : sequenceAnalysis ? 'Issues' : 'N/A'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SequenceAnalysisSection({ data }: { data: StylesheetDetectionResult }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const seq = data.sequenceAnalysis;
  if (!seq) return null;

  const hasIssues = !seq.isSequential;
  const issueCount = (seq.missingNumbers?.length ?? 0) + (seq.duplicates?.length ?? 0) + (seq.outOfOrder?.length ?? 0);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${hasIssues ? 'bg-red-50' : 'bg-green-50'}`}>
            {hasIssues ? (
              <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
            )}
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Sequence Analysis</h3>
            <p className="text-sm text-gray-500">
              {hasIssues
                ? `${issueCount} issue${issueCount !== 1 ? 's' : ''} found in citation numbering`
                : 'Citation numbering is sequential and complete'}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t">
          <div className="pt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Expected Range</p>
              <p className="font-semibold">
                {seq.expectedRange?.start ?? '?'} – {seq.expectedRange?.end ?? '?'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Missing Numbers</p>
              <p className="font-semibold text-red-600">{seq.missingNumbers?.length ?? 0}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Duplicates</p>
              <p className="font-semibold text-yellow-600">{seq.duplicates?.length ?? 0}</p>
            </div>
          </div>

          {seq.missingNumbers && seq.missingNumbers.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Missing Numbers</p>
              <div className="flex flex-wrap gap-1.5">
                {seq.missingNumbers.map((num) => (
                  <span
                    key={num}
                    className="inline-flex items-center px-2 py-0.5 rounded bg-red-50 text-red-700 text-xs font-mono"
                  >
                    [{num}]
                  </span>
                ))}
              </div>
            </div>
          )}

          {seq.gaps && seq.gaps.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Gaps in Sequence</p>
              <div className="space-y-1">
                {seq.gaps.map((gap: SequenceGap, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-gray-600">[{gap.from}]</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-mono text-gray-600">[{gap.to}]</span>
                    <span className="text-xs text-gray-400">
                      ({gap.to - gap.from - 1} missing)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {seq.summary && (
            <p className="text-sm text-gray-500 italic">{seq.summary}</p>
          )}
        </div>
      )}
    </Card>
  );
}

function CrossReferenceSection({ data }: { data: StylesheetDetectionResult }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const xref = data.crossReference;
  if (!xref) return null;

  const orphanCount = xref.citationsWithoutReference?.length ?? 0;
  const uncitedCount = xref.referencesWithoutCitation?.length ?? 0;
  const hasIssues = orphanCount > 0 || uncitedCount > 0;

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${hasIssues ? 'bg-yellow-50' : 'bg-green-50'}`}>
            <Link2 className={`h-5 w-5 ${hasIssues ? 'text-yellow-600' : 'text-green-600'}`} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Cross-Reference Check</h3>
            <p className="text-sm text-gray-500">
              {xref.matched} of {xref.totalBodyCitations} body citation{xref.totalBodyCitations !== 1 ? 's' : ''} matched
              {uncitedCount > 0 && ` · ${uncitedCount} uncited reference${uncitedCount !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t">
          <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Body Citations</p>
              <p className="font-semibold">{xref.totalBodyCitations}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Reference Entries</p>
              <p className="font-semibold">{xref.totalReferenceEntries}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-gray-500">Matched</p>
              <p className="font-semibold text-green-600">{xref.matched}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-gray-500">Orphaned</p>
              <p className="font-semibold text-yellow-600">{orphanCount}</p>
            </div>
          </div>

          {orphanCount > 0 && (
            <div>
              <p className="text-sm font-medium text-red-700 mb-2">
                <XCircle className="h-4 w-4 inline mr-1" aria-hidden="true" />
                Citations Without Reference ({orphanCount})
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {xref.citationsWithoutReference.map((item, idx) => (
                  <div key={idx} className="p-2 bg-red-50 rounded text-sm flex items-start gap-2">
                    <span className="font-mono text-red-700 flex-shrink-0">[{item.number}]</span>
                    <span className="text-red-800 truncate">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uncitedCount > 0 && (
            <div>
              <p className="text-sm font-medium text-yellow-700 mb-2">
                <AlertTriangle className="h-4 w-4 inline mr-1" aria-hidden="true" />
                References Not Cited in Body ({uncitedCount})
              </p>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {xref.referencesWithoutCitation.map((item, idx) => (
                  <div key={idx} className="p-2 bg-yellow-50 rounded text-sm flex items-start gap-2">
                    <span className="font-mono text-yellow-700 flex-shrink-0">[{item.number}]</span>
                    <span className="text-yellow-800 line-clamp-2">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {xref.summary && (
            <p className="text-sm text-gray-500 italic">{xref.summary}</p>
          )}
        </div>
      )}
    </Card>
  );
}

function ReferenceTableSection({ data }: { data: StylesheetDetectionResult }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const refs = data.referenceList;
  if (!refs?.entries || refs.entries.length === 0) return null;

  const matchedCount = refs.entries.filter((e: ReferenceEntry) => e.hasMatch).length;

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <List className="h-5 w-5 text-purple-600" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Reference List</h3>
            <p className="text-sm text-gray-500">
              {refs.totalEntries} entries · {matchedCount} matched to body citations
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {refs.entries.map((entry: ReferenceEntry) => (
                <tr key={entry.index} className={entry.hasMatch ? '' : 'bg-yellow-50'}>
                  <td className="px-4 py-2 font-mono text-gray-600">[{entry.number}]</td>
                  <td className="px-4 py-2 text-gray-800 max-w-md">
                    <span className="line-clamp-2">{entry.text}</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {entry.hasMatch ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mx-auto" aria-label="Matched" />
                    ) : (
                      <XCircle className="h-4 w-4 text-yellow-500 mx-auto" aria-label="Not cited" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function ConversionSection({ data }: { data: StylesheetDetectionResult }) {
  const [targetStyle, setTargetStyle] = useState('');
  const convertMutation = useConvertStyle();

  const options = data.conversionOptions ?? [];
  const currentStyle = data.detectedStyle?.styleCode ?? '';

  if (options.length === 0) return null;

  const handleConvert = () => {
    if (!targetStyle || !data.documentId) return;
    convertMutation.mutate({ documentId: data.documentId, targetStyle });
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <ArrowRightLeft className="h-5 w-5 text-indigo-600" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Convert Citation Style</h3>
          <p className="text-sm text-gray-500">
            Re-format all citations to a different style
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select
            value={targetStyle}
            onChange={(e) => setTargetStyle(e.target.value)}
            disabled={convertMutation.isPending}
            className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            aria-label="Select target citation style"
          >
            <option value="">Select target style...</option>
            {options
              .filter((code) => code !== currentStyle)
              .map((code) => (
                <option key={code} value={code}>
                  {STYLE_LABELS[code] ?? code.toUpperCase()}
                </option>
              ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden="true" />
        </div>

        <Button
          onClick={handleConvert}
          disabled={!targetStyle || convertMutation.isPending}
        >
          {convertMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
              Converting...
            </>
          ) : (
            <>
              <ArrowRightLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Convert
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
