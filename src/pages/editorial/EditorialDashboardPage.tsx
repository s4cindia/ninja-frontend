import type { ComponentType } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, FileCheck, Upload, ArrowRight, Clock, FileText, CheckCircle, Edit3, Trash2, Zap, TrendingUp, FileBarChart } from 'lucide-react';
import { api } from '@/services/api';
import toast from 'react-hot-toast';

interface ModuleCard {
  title: string;
  description: string;
  benefits: string[];
  uploadPath: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  stats: {
    total: number;
    pending: number;
    completed: number;
  };
  perfStats: {
    avgProcessingTime: number | null;
    avgFileSize: number | null;
    avgWordCount: number | null;
    fastestTime: number | null;
    docsAnalyzed: number;
  };
}

interface DocumentWithTiming {
  id: string;
  fileName: string;
  originalName: string;
  fileSize?: number;
  wordCount?: number;
  pageCount?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  job?: {
    createdAt: string;
    completedAt: string | null;
  };
}

interface RecentActivity {
  id: string;
  type: 'citation' | 'validator';
  action: string;
  document: string;
  documentId: string;
  timestamp: string;
  rawTimestamp: Date;
  status: 'completed' | 'pending' | 'in_progress';
  fileSize?: number;
  wordCount?: number;
  processingTime?: number | null;
}

function computePerfStats(docs: DocumentWithTiming[]) {
  const completedDocs = docs.filter(
    d => (d.status === 'COMPLETED' || d.status === 'PARSED') && d.job?.completedAt && d.job?.createdAt
  );

  const processingTimes = completedDocs
    .map(d => {
      const start = new Date(d.job!.createdAt).getTime();
      const end = new Date(d.job!.completedAt!).getTime();
      return end - start;
    })
    .filter(t => t > 0 && t < 3600000); // Filter out negative or >1hr outliers

  const fileSizes = docs.filter(d => d.fileSize != null && d.fileSize > 0).map(d => d.fileSize!);
  const wordCounts = docs.filter(d => d.wordCount != null && d.wordCount > 0).map(d => d.wordCount!);

  return {
    avgProcessingTime: processingTimes.length > 0
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      : null,
    fastestTime: processingTimes.length > 0
      ? Math.min(...processingTimes)
      : null,
    avgFileSize: fileSizes.length > 0
      ? fileSizes.reduce((a, b) => a + b, 0) / fileSizes.length
      : null,
    avgWordCount: wordCounts.length > 0
      ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length)
      : null,
    docsAnalyzed: completedDocs.length,
  };
}

function getProcessingTime(doc: DocumentWithTiming): number | null {
  if (!doc.job?.createdAt || !doc.job?.completedAt) return null;
  const ms = new Date(doc.job.completedAt).getTime() - new Date(doc.job.createdAt).getTime();
  return ms > 0 && ms < 3600000 ? ms : null;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = Math.round(seconds % 60);
  return `${minutes}m ${remainingSecs}s`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EditorialDashboardPage() {
  const navigate = useNavigate();
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [validatorStats, setValidatorStats] = useState({ total: 0, pending: 0, completed: 0 });
  const [citationStats, setCitationStats] = useState({ total: 0, pending: 0, completed: 0 });
  const [citationPerfStats, setCitationPerfStats] = useState<ModuleCard['perfStats']>({
    avgProcessingTime: null, avgFileSize: null, avgWordCount: null, fastestTime: null, docsAnalyzed: 0,
  });
  const [validatorPerfStats, setValidatorPerfStats] = useState<ModuleCard['perfStats']>({
    avgProcessingTime: null, avgFileSize: null, avgWordCount: null, fastestTime: null, docsAnalyzed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hasPending, setHasPending] = useState(false);

  const fetchRecentDocuments = useCallback(async () => {
    try {
      setLoading(true);

      const [validatorResponse, citationResponse] = await Promise.all([
        api.get<{
          success: boolean;
          data: {
            documents: DocumentWithTiming[];
            total: number;
          };
        }>('/validator/documents', { params: { limit: 100 } }).catch(() => null),
        api.get<{
          success: boolean;
          data: {
            documents: DocumentWithTiming[];
            pagination?: { total: number };
          };
        }>('/citation-management/documents', { params: { limit: 100 } }).catch(() => null),
      ]);

      const allActivities: RecentActivity[] = [];

      // Process Validator documents
      if (validatorResponse?.data?.success && validatorResponse?.data?.data?.documents) {
        const docs = validatorResponse.data.data.documents;
        const total = validatorResponse.data.data.total ?? docs.length;
        const pending = docs.filter(d => d.status === 'UPLOADED' || d.status === 'PARSING').length;
        const completed = docs.filter(d => d.status === 'COMPLETED' || d.status === 'PARSED').length;

        setValidatorStats({ total, pending, completed });
        setValidatorPerfStats(computePerfStats(docs));

        docs.forEach(doc => {
          allActivities.push({
            id: `validator-${doc.id}`,
            type: 'validator' as const,
            action: getActionText(doc.status, 'validator'),
            document: doc.originalName,
            documentId: doc.id,
            timestamp: formatRelativeTime(doc.updatedAt),
            rawTimestamp: new Date(doc.updatedAt),
            status: getActivityStatus(doc.status),
            fileSize: doc.fileSize,
            wordCount: doc.wordCount,
            processingTime: getProcessingTime(doc),
          });
        });
      }

      // Process Citation Management documents
      if (citationResponse?.data?.success && citationResponse?.data?.data?.documents) {
        const docs = citationResponse.data.data.documents;
        const total = citationResponse.data.data.pagination?.total ?? docs.length;
        const pending = docs.filter(d => d.status === 'UPLOADED' || d.status === 'PARSING' || d.status === 'ANALYZING').length;
        const completed = docs.filter(d => d.status === 'COMPLETED' || d.status === 'PARSED').length;

        setCitationStats({ total, pending, completed });
        setCitationPerfStats(computePerfStats(docs));

        docs.forEach(doc => {
          allActivities.push({
            id: `citation-${doc.id}`,
            type: 'citation' as const,
            action: getActionText(doc.status, 'citation'),
            document: doc.originalName || doc.fileName,
            documentId: doc.id,
            timestamp: formatRelativeTime(doc.updatedAt),
            rawTimestamp: new Date(doc.updatedAt),
            status: getActivityStatus(doc.status),
            fileSize: doc.fileSize,
            wordCount: doc.wordCount,
            processingTime: getProcessingTime(doc),
          });
        });
      }

      // Sort by timestamp (most recent first) and take top 10
      allActivities.sort((a, b) => b.rawTimestamp.getTime() - a.rawTimestamp.getTime());
      setRecentActivities(allActivities.slice(0, 10));

      // Track if any documents are still processing (for auto-refresh)
      setHasPending(allActivities.some(a => a.status === 'pending' || a.status === 'in_progress'));
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentDocuments();
  }, [fetchRecentDocuments]);

  // Auto-refresh every 10s when documents are pending/in-progress
  useEffect(() => {
    if (!hasPending) return;
    const interval = setInterval(fetchRecentDocuments, 10000);
    return () => clearInterval(interval);
  }, [hasPending, fetchRecentDocuments]);

  const getActionText = (status: string, type: 'citation' | 'validator' = 'validator'): string => {
    const prefix = type === 'citation' ? 'Citation' : 'Validator';
    switch (status) {
      case 'UPLOADED':
        return type === 'citation' ? 'Uploaded for citation analysis' : 'Document uploaded - ready to edit';
      case 'PARSING':
        return `${prefix}: Processing document...`;
      case 'ANALYZING':
        return 'Citation: Analyzing references...';
      case 'PARSED':
      case 'COMPLETED':
        return type === 'citation' ? 'Citation analysis complete' : 'Document ready';
      default:
        return `${prefix}: Document uploaded`;
    }
  };

  const getActivityStatus = (status: string): 'completed' | 'pending' | 'in_progress' => {
    switch (status) {
      case 'COMPLETED':
      case 'PARSED':
        return 'completed';
      case 'PARSING':
      case 'ANALYZING':
        return 'in_progress';
      default:
        return 'pending';
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleDeleteDocument = async (e: React.MouseEvent, activity: RecentActivity) => {
    e.stopPropagation();
    if (!confirm('Delete this document? This cannot be undone.')) return;

    setDeletingId(activity.documentId);
    try {
      if (activity.type === 'citation') {
        await api.delete(`/citation-management/document/${activity.documentId}`);
      } else {
        await api.delete(`/validator/documents/${activity.documentId}`);
      }
      toast.success('Document deleted');
      fetchRecentDocuments();
    } catch (err) {
      console.error('[EditorialDashboard] Delete failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenDocument = (activity: RecentActivity) => {
    if (activity.type === 'citation') {
      navigate(`/citation/analysis/${activity.documentId}`);
    } else {
      navigate(`/validator/editor/${activity.documentId}?name=${encodeURIComponent(activity.document)}`);
    }
  };

  const MODULES: ModuleCard[] = [
    {
      title: 'Citation Management',
      description: 'AI-powered citation extraction, validation, and formatting. Catch incorrect references, missing DOIs, and style inconsistencies before they reach production.',
      benefits: [
        'Detect mismatched in-text citations and reference list entries',
        'Auto-validate against APA, MLA, Chicago, and Vancouver styles',
        'Flag missing authors, wrong years, and broken DOIs instantly',
      ],
      uploadPath: '/citation/upload',
      icon: BookOpen,
      color: 'blue',
      stats: citationStats,
      perfStats: citationPerfStats,
    },
    {
      title: 'Validator',
      description: 'Comprehensive document quality checker with version control and track changes. Identify formatting errors, structural issues, and inconsistencies before publication.',
      benefits: [
        'Spot heading hierarchy violations and broken cross-references',
        'Track every edit with full version history and accept/reject workflow',
        'Export clean, production-ready DOCX with all corrections applied',
      ],
      uploadPath: '/validator/upload',
      icon: FileCheck,
      color: 'emerald',
      stats: validatorStats,
      perfStats: validatorPerfStats,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Module Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {MODULES.map((module) => {
          const IconComponent = module.icon;
          const isBlue = module.color === 'blue';
          const colorClasses = isBlue
            ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
            : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100';
          const buttonClasses = isBlue
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-emerald-600 hover:bg-emerald-700';
          const perfAccent = isBlue ? 'text-blue-600' : 'text-emerald-600';
          const perfBg = isBlue ? 'bg-blue-50' : 'bg-emerald-50';

          return (
            <div
              key={module.title}
              className="bg-white rounded-xl border shadow-sm overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg transition-colors ${colorClasses}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {module.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {module.description}
                    </p>
                  </div>
                </div>

                {/* Benefits */}
                <ul className="mt-4 space-y-1.5">
                  {module.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2 text-xs text-gray-600">
                      <CheckCircle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${perfAccent}`} />
                      {benefit}
                    </li>
                  ))}
                </ul>

                {/* Document Stats */}
                <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">{module.stats.total}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-amber-600">{module.stats.pending}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-green-600">{module.stats.completed}</p>
                    <p className="text-xs text-gray-500">Completed</p>
                  </div>
                </div>

                {/* Performance Stats */}
                {module.perfStats.docsAnalyzed > 0 && (
                  <div className={`mt-4 p-3 rounded-lg ${perfBg}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap className={`w-3.5 h-3.5 ${perfAccent}`} />
                      <span className={`text-xs font-semibold ${perfAccent}`}>Performance</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        Based on {module.perfStats.docsAnalyzed} document{module.perfStats.docsAnalyzed !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {module.perfStats.avgProcessingTime !== null && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatDuration(module.perfStats.avgProcessingTime)}
                            </p>
                            <p className="text-[10px] text-gray-500">Avg. analysis time</p>
                          </div>
                        </div>
                      )}
                      {module.perfStats.fastestTime !== null && (
                        <div className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-gray-400" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatDuration(module.perfStats.fastestTime)}
                            </p>
                            <p className="text-[10px] text-gray-500">Fastest analysis</p>
                          </div>
                        </div>
                      )}
                      {module.perfStats.avgFileSize !== null && (
                        <div className="flex items-center gap-2">
                          <FileBarChart className="w-3.5 h-3.5 text-gray-400" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatFileSize(module.perfStats.avgFileSize)}
                            </p>
                            <p className="text-[10px] text-gray-500">Avg. document size</p>
                          </div>
                        </div>
                      )}
                      {module.perfStats.avgWordCount !== null && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-gray-400" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {module.perfStats.avgWordCount.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-gray-500">Avg. word count</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="px-6 pb-6">
                <Link
                  to={module.uploadPath}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-white rounded-lg text-sm font-medium transition-colors ${buttonClasses}`}
                >
                  <Upload className="w-4 h-4" />
                  Upload Document
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Documents
          </h3>
          {recentActivities.length > 0 && (
            <button
              onClick={fetchRecentDocuments}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Refresh
            </button>
          )}
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-3"></div>
              <p className="text-sm text-gray-500">Loading documents...</p>
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No recent documents</p>
              <p className="text-sm text-gray-400 mt-1">
                Upload a document to Citation Management or Validator to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivities.map((activity) => {
                const typeColors = activity.type === 'citation'
                  ? { bg: 'bg-blue-50', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', button: 'bg-blue-100 text-blue-600' }
                  : { bg: 'bg-emerald-50', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', button: 'bg-emerald-100 text-emerald-600' };

                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => handleOpenDocument(activity)}
                  >
                    <div className={`p-2 rounded-lg ${typeColors.bg}`}>
                      {activity.type === 'citation' ? (
                        <BookOpen className={`w-4 h-4 ${typeColors.icon}`} />
                      ) : (
                        <FileCheck className={`w-4 h-4 ${typeColors.icon}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.document}
                        </p>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${typeColors.badge}`}>
                          {activity.type === 'citation' ? 'Citation' : 'Validator'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{activity.action}</span>
                        {activity.fileSize != null && activity.fileSize > 0 && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span>{formatFileSize(activity.fileSize)}</span>
                          </>
                        )}
                        {activity.wordCount != null && activity.wordCount > 0 && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span>{activity.wordCount.toLocaleString()} words</span>
                          </>
                        )}
                        {activity.processingTime != null && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="text-green-600 font-medium">
                              {formatDuration(activity.processingTime)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {activity.status === 'completed' && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      {activity.status === 'pending' && (
                        <Clock className="w-4 h-4 text-amber-500" />
                      )}
                      {activity.status === 'in_progress' && (
                        <FileText className="w-4 h-4 text-blue-500" />
                      )}
                      <span className="text-xs text-gray-400 w-16 text-right">{activity.timestamp}</span>
                      <button
                        className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 transition-opacity ${typeColors.button}`}
                        title={activity.type === 'citation' ? 'Open Citation Analysis' : 'Open in Editor'}
                        aria-label={activity.type === 'citation' ? 'Open Citation Analysis' : 'Open in Editor'}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-400 transition-opacity bg-red-100 text-red-600 hover:bg-red-200"
                        title="Delete document"
                        aria-label={`Delete document ${activity.document}`}
                        disabled={deletingId === activity.documentId}
                        onClick={(e) => handleDeleteDocument(e, activity)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
