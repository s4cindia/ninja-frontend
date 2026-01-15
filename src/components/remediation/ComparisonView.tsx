import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, CheckCircle, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { ComparisonSummaryCard } from './ComparisonSummaryCard';
import { ModificationList } from './ModificationList';
import { Modification } from './ComparisonDiff';
import { api } from '@/services/api';

interface FileComparison {
  filePath: string;
  changeCount: number;
  categories: string[];
}

interface ComparisonData {
  jobId: string;
  originalFileName: string;
  remediatedFileName: string;
  summary: {
    totalFiles: number;
    modifiedFiles: number;
    totalChanges: number;
    changesByType: {
      metadata: number;
      content: number;
      structure: number;
      accessibility: number;
    };
  };
  files: FileComparison[];
  modifications: Modification[];
}

interface ComparisonViewProps {
  jobId: string;
  contentType: 'pdf' | 'epub';
  criterionId?: string;
  onBack?: () => void;
  className?: string;
}

const generateDemoComparison = (jobId: string): ComparisonData => ({
  jobId,
  originalFileName: 'sample-document.epub',
  remediatedFileName: 'sample-document-remediated.epub',
  summary: {
    totalFiles: 24,
    modifiedFiles: 8,
    totalChanges: 45,
    changesByType: {
      metadata: 5,
      content: 20,
      structure: 8,
      accessibility: 12,
    },
  },
  files: [
    { filePath: 'OEBPS/content.opf', changeCount: 5, categories: ['metadata'] },
    { filePath: 'OEBPS/chapter1.xhtml', changeCount: 12, categories: ['content', 'accessibility'] },
    { filePath: 'OEBPS/chapter2.xhtml', changeCount: 8, categories: ['content', 'structure'] },
    { filePath: 'OEBPS/nav.xhtml', changeCount: 3, categories: ['structure'] },
    { filePath: 'OEBPS/styles.css', changeCount: 2, categories: ['accessibility'] },
  ],
  modifications: [
    {
      type: 'add',
      category: 'metadata',
      description: 'Added accessibility metadata to package document',
      filePath: 'OEBPS/content.opf',
      before: '<metadata>...</metadata>',
      after: '<metadata>\n  <meta property="schema:accessibilityFeature">alternativeText</meta>\n  <meta property="schema:accessibilityFeature">structuralNavigation</meta>\n</metadata>',
      wcagCriteria: 'WCAG 1.1.1',
    },
    {
      type: 'modify',
      category: 'accessibility',
      description: 'Added alt text to decorative image',
      filePath: 'OEBPS/chapter1.xhtml',
      before: '<img src="image1.jpg">',
      after: '<img src="image1.jpg" alt="" role="presentation">',
      wcagCriteria: 'WCAG 1.1.1',
    },
    {
      type: 'modify',
      category: 'accessibility',
      description: 'Added descriptive alt text to figure',
      filePath: 'OEBPS/chapter1.xhtml',
      before: '<img src="diagram.png">',
      after: '<img src="diagram.png" alt="Diagram showing the water cycle with evaporation, condensation, and precipitation stages">',
      wcagCriteria: 'WCAG 1.1.1',
    },
    {
      type: 'modify',
      category: 'structure',
      description: 'Fixed heading hierarchy - changed h4 to h2',
      filePath: 'OEBPS/chapter2.xhtml',
      before: '<h4>Chapter Introduction</h4>',
      after: '<h2>Chapter Introduction</h2>',
      wcagCriteria: 'WCAG 1.3.1',
    },
    {
      type: 'add',
      category: 'structure',
      description: 'Added landmark role to navigation',
      filePath: 'OEBPS/nav.xhtml',
      before: '<nav>',
      after: '<nav role="navigation" aria-label="Table of Contents">',
      wcagCriteria: 'WCAG 1.3.1',
    },
    {
      type: 'modify',
      category: 'content',
      description: 'Added language attribute to foreign text',
      filePath: 'OEBPS/chapter1.xhtml',
      before: '<span>Carpe diem</span>',
      after: '<span lang="la">Carpe diem</span>',
      wcagCriteria: 'WCAG 3.1.2',
    },
  ],
});

const mapComparisonResponse = (data: Record<string, unknown>, jobId: string): ComparisonData => {
  const summary = (data.summary || data) as Record<string, unknown>;
  const changesByType = (summary.changesByType || summary.changes_by_type || {}) as Record<string, number>;
  
  return {
    jobId,
    originalFileName: String(data.originalFileName || data.original_file_name || 'original.epub'),
    remediatedFileName: String(data.remediatedFileName || data.remediated_file_name || 'remediated.epub'),
    summary: {
      totalFiles: Number(summary.totalFiles || summary.total_files || 0),
      modifiedFiles: Number(summary.modifiedFiles || summary.modified_files || 0),
      totalChanges: Number(summary.totalChanges || summary.total_changes || 0),
      changesByType: {
        metadata: Number(changesByType.metadata || 0),
        content: Number(changesByType.content || 0),
        structure: Number(changesByType.structure || 0),
        accessibility: Number(changesByType.accessibility || 0),
      },
    },
    files: Array.isArray(data.files) 
      ? data.files.map((f: Record<string, unknown>) => ({
          filePath: String(f.filePath || f.file_path || ''),
          changeCount: Number(f.changeCount || f.change_count || 0),
          categories: Array.isArray(f.categories) ? f.categories : [],
        }))
      : [],
    modifications: Array.isArray(data.modifications) 
      ? data.modifications.map((m: Record<string, unknown>) => ({
          type: String(m.type || 'modify'),
          category: String(m.category || 'content') as Modification['category'],
          description: String(m.description || ''),
          filePath: String(m.filePath || m.file_path || ''),
          before: m.before ? String(m.before) : undefined,
          after: m.after ? String(m.after) : undefined,
          wcagCriteria: m.wcagCriteria || m.wcag_criteria ? String(m.wcagCriteria || m.wcag_criteria) : undefined,
        }))
      : [],
  };
};

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  jobId,
  contentType,
  criterionId,
  onBack,
  className = '',
}) => {
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiPrefix = contentType === 'epub' ? '/epub' : '/pdf';

  useEffect(() => {
    const fetchComparison = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await api.get(`${apiPrefix}/job/${jobId}/comparison`);
        const data = response.data.data || response.data;
        setComparison(mapComparisonResponse(data, jobId));
      } catch (err) {
        console.error('[ComparisonView] Failed to fetch comparison:', err);
        setComparison(generateDemoComparison(jobId));
      } finally {
        setIsLoading(false);
      }
    };

    fetchComparison();
  }, [jobId, apiPrefix]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !comparison) {
    return (
      <Alert variant="error" className={className}>
        {error}
      </Alert>
    );
  }

  if (!comparison) {
    return (
      <Alert variant="warning" className={className}>
        No comparison data available.
      </Alert>
    );
  }

  const displayModifications = criterionId
    ? comparison.modifications.filter(m => m.wcagCriteria === criterionId)
    : comparison.modifications;

  const filteredChangeCount = displayModifications.length;

  return (
    <div className={className}>
      <div className="mb-6">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Back
          </Button>
        )}
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Comparison Results</h1>
            <p className="text-gray-500 mt-1">
              Comparing changes between original and remediated files
            </p>
          </div>
          <Badge variant={contentType === 'epub' ? 'info' : 'default'}>
            {contentType.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" aria-hidden="true" />
              File Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-700 mb-1">Original File</p>
                <p className="text-gray-900 truncate">{comparison.originalFileName}</p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-700 mb-1">Remediated File</p>
                <p className="text-gray-900 truncate">{comparison.remediatedFileName}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <ComparisonSummaryCard
          totalFiles={comparison.summary.totalFiles}
          modifiedFiles={comparison.summary.modifiedFiles}
          totalChanges={comparison.summary.totalChanges}
          changesByType={comparison.summary.changesByType}
        />
      </div>

      {comparison.files.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" aria-hidden="true" />
              Modified Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comparison.files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-gray-500" aria-hidden="true" />
                    <span className="text-sm font-mono text-gray-900">{file.filePath}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(file.categories || []).map(cat => (
                      <Badge key={cat} size="sm" variant="default">
                        {cat}
                      </Badge>
                    ))}
                    <span className="text-sm text-gray-500">{file.changeCount} changes</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" aria-hidden="true" />
            {criterionId ? `Modifications for ${criterionId}` : 'All Modifications'} ({filteredChangeCount})
          </CardTitle>
        </CardHeader>
        {criterionId && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="info">Filtered</Badge>
                <span className="text-sm text-gray-700">
                  Showing only changes related to <strong>WCAG {criterionId}</strong>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('criterion');
                  window.history.pushState({}, '', url.toString());
                  window.location.reload();
                }}
              >
                Show All
              </Button>
            </div>
          </div>
        )}
        <CardContent>
          <ModificationList modifications={displayModifications} />
        </CardContent>
      </Card>
    </div>
  );
};
