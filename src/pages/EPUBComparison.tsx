import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle, FileText, Code, Tag, Layout, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/services/api';

interface ComparisonChange {
  id: string;
  category: 'metadata' | 'accessibility' | 'structure' | 'content';
  type: string;
  description: string;
  location?: string;
  before?: string;
  after?: string;
}

interface ComparisonData {
  jobId: string;
  epubFileName: string;
  fixedCount: number;
  failedCount: number;
  skippedCount: number;
  beforeScore: number;
  afterScore: number;
  filesModified: number;
  modificationsByCategory: {
    metadata: number;
    accessibility: number;
    structure: number;
    content: number;
  };
  changes: ComparisonChange[];
}

const categoryConfig = {
  metadata: { icon: Tag, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Metadata' },
  accessibility: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Accessibility' },
  structure: { icon: Layout, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Structure' },
  content: { icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Content' },
};

interface LocationState {
  epubFileName?: string;
  fixedCount?: number;
  failedCount?: number;
  skippedCount?: number;
  beforeScore?: number;
  afterScore?: number;
}

export const EPUBComparison: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [expandedChange, setExpandedChange] = useState<string | null>(null);

  useEffect(() => {
    const loadComparison = async () => {
      if (!jobId) {
        setError('No job ID provided');
        setLoading(false);
        return;
      }

      const stateFileName = locationState?.epubFileName || 'uploaded-file.epub';
      const stateFixedCount = locationState?.fixedCount ?? 0;
      const stateFailedCount = locationState?.failedCount ?? 0;
      const stateSkippedCount = locationState?.skippedCount ?? 0;
      const stateBeforeScore = locationState?.beforeScore ?? 45;
      const stateAfterScore = locationState?.afterScore ?? 85;

      try {
        const response = await api.get(`/epub/job/${jobId}/comparison/summary`);
        const data = response.data.data || response.data;
        setComparison({
          jobId: data.jobId || jobId,
          epubFileName: data.epubFileName || stateFileName,
          fixedCount: data.fixedCount ?? stateFixedCount,
          failedCount: data.failedCount ?? stateFailedCount,
          skippedCount: data.skippedCount ?? stateSkippedCount,
          beforeScore: data.beforeScore ?? stateBeforeScore,
          afterScore: data.afterScore ?? stateAfterScore,
          filesModified: data.filesModified ?? stateFixedCount,
          modificationsByCategory: data.modificationsByCategory || {
            metadata: stateFixedCount,
            accessibility: 0,
            structure: 0,
            content: 0,
          },
          changes: data.changes || [],
        });
        setIsDemo(false);
      } catch {
        setComparison({
          jobId,
          epubFileName: stateFileName,
          fixedCount: stateFixedCount,
          failedCount: stateFailedCount,
          skippedCount: stateSkippedCount,
          beforeScore: stateBeforeScore,
          afterScore: stateAfterScore,
          filesModified: stateFixedCount,
          modificationsByCategory: {
            metadata: stateFixedCount,
            accessibility: 0,
            structure: 0,
            content: 0,
          },
          changes: [],
        });
        setIsDemo(false);
      } finally {
        setLoading(false);
      }
    };

    loadComparison();
  }, [jobId]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
          <span className="ml-3 text-gray-600">Loading comparison...</span>
        </div>
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert variant="error">
          {error || 'Failed to load comparison data'}
        </Alert>
        <Button className="mt-4" onClick={() => navigate('/epub')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to EPUB Accessibility
        </Button>
      </div>
    );
  }

  const scoreImprovement = comparison.afterScore - comparison.beforeScore;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/epub/remediate/${jobId}?status=completed`)} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Remediation
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary-600" />
            Remediation Comparison
          </h1>
          <p className="text-gray-600 mt-1">
            Review the changes made to your EPUB file
          </p>
        </div>
        {isDemo && <Badge variant="warning">Demo Mode</Badge>}
      </div>

      {isDemo && (
        <Alert variant="info">
          Backend unavailable - showing demo comparison data
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Summary
          </CardTitle>
          <CardDescription>{comparison.epubFileName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{comparison.fixedCount}</p>
              <p className="text-sm text-green-700">Issues Fixed</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-3xl font-bold text-red-600">{comparison.failedCount}</p>
              <p className="text-sm text-red-700">Failed</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-3xl font-bold text-yellow-600">{comparison.skippedCount}</p>
              <p className="text-sm text-yellow-700">Skipped</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{comparison.filesModified}</p>
              <p className="text-sm text-blue-700">Files Modified</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 p-4 bg-gradient-to-r from-red-50 via-yellow-50 to-green-50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase">Before</p>
              <p className="text-2xl font-bold text-red-600">{comparison.beforeScore}%</p>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="h-1 w-16 bg-gradient-to-r from-red-400 to-green-400 rounded" />
                <Badge variant="success" size="md">
                  +{scoreImprovement}%
                </Badge>
                <div className="h-1 w-16 bg-gradient-to-r from-green-400 to-green-500 rounded" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase">After</p>
              <p className="text-2xl font-bold text-green-600">{comparison.afterScore}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modifications by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(comparison.modificationsByCategory).map(([category, count]) => {
              const config = categoryConfig[category as keyof typeof categoryConfig];
              const Icon = config.icon;
              return (
                <div key={category} className={`flex items-center gap-3 p-3 rounded-lg ${config.bg}`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                  <div>
                    <p className="text-lg font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-600">{config.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Changes ({comparison.changes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {comparison.changes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-3" />
                <p>No detailed changes available</p>
              </div>
            ) : (
              comparison.changes.map((change) => {
                const config = categoryConfig[change.category];
                const Icon = config.icon;
                const isExpanded = expandedChange === change.id;

                return (
                  <div key={change.id} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedChange(isExpanded ? null : change.id)}
                      className={`w-full p-4 flex items-start gap-3 text-left ${config.bg} hover:opacity-90 transition-opacity`}
                    >
                      <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="default" size="sm">{change.type}</Badge>
                          <Badge variant="info" size="sm">{config.label}</Badge>
                        </div>
                        <p className="text-sm text-gray-800">{change.description}</p>
                        {change.location && (
                          <p className="text-xs text-gray-500 mt-1 font-mono">{change.location}</p>
                        )}
                      </div>
                      <Code className="h-4 w-4 text-gray-400" />
                    </button>
                    
                    {isExpanded && (change.before || change.after) && (
                      <div className="p-4 bg-gray-50 border-t space-y-3">
                        {change.before && (
                          <div>
                            <p className="text-xs font-medium text-red-600 mb-1">Before:</p>
                            <pre className="text-xs bg-red-50 p-2 rounded border border-red-200 overflow-x-auto">
                              <code>{change.before}</code>
                            </pre>
                          </div>
                        )}
                        {change.after && (
                          <div>
                            <p className="text-xs font-medium text-green-600 mb-1">After:</p>
                            <pre className="text-xs bg-green-50 p-2 rounded border border-green-200 overflow-x-auto">
                              <code>{change.after}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-4">
        <Button onClick={() => navigate(`/epub/remediate/${jobId}?status=completed`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Remediation
        </Button>
        <Button variant="outline" onClick={() => navigate('/epub')}>
          Start New Audit
        </Button>
      </div>
    </div>
  );
};
