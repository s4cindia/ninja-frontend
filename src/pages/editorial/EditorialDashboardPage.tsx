import type { ComponentType } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, FileCheck, Upload, ArrowRight, Clock, FileText, CheckCircle, Edit3 } from 'lucide-react';
import { api } from '@/services/api';

interface ModuleCard {
  title: string;
  description: string;
  uploadPath: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  stats: {
    total: number;
    pending: number;
    completed: number;
  };
}

interface ValidatorDocument {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CitationDocument {
  id: string;
  fileName: string;
  originalName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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
}

export function EditorialDashboardPage() {
  const navigate = useNavigate();
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [validatorStats, setValidatorStats] = useState({ total: 0, pending: 0, completed: 0 });
  const [citationStats, setCitationStats] = useState({ total: 0, pending: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  const fetchRecentDocuments = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch both Validator and Citation Management documents in parallel
      const [validatorResponse, citationResponse] = await Promise.all([
        api.get<{
          success: boolean;
          data: {
            documents: ValidatorDocument[];
            total: number;
          };
        }>('/validator/documents', { params: { limit: 10 } }).catch(() => null),
        api.get<{
          success: boolean;
          data: {
            documents: CitationDocument[];
          };
        }>('/citation-management/documents').catch(() => null),
      ]);

      const allActivities: RecentActivity[] = [];

      // Process Validator documents
      if (validatorResponse?.data?.success && validatorResponse?.data?.data?.documents) {
        const docs = validatorResponse.data.data.documents;
        const total = validatorResponse.data.data.total;
        const pending = docs.filter(d => d.status === 'UPLOADED' || d.status === 'PARSING').length;
        const completed = docs.filter(d => d.status === 'COMPLETED' || d.status === 'PARSED').length;

        setValidatorStats({ total, pending, completed });

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
          });
        });
      }

      // Process Citation Management documents
      if (citationResponse?.data?.success && citationResponse?.data?.data?.documents) {
        const docs = citationResponse.data.data.documents;
        const total = docs.length;
        const pending = docs.filter(d => d.status === 'UPLOADED' || d.status === 'PARSING' || d.status === 'ANALYZING').length;
        const completed = docs.filter(d => d.status === 'COMPLETED' || d.status === 'PARSED').length;

        setCitationStats({ total, pending, completed });

        docs.slice(0, 10).forEach(doc => {
          allActivities.push({
            id: `citation-${doc.id}`,
            type: 'citation' as const,
            action: getActionText(doc.status, 'citation'),
            document: doc.originalName || doc.fileName,
            documentId: doc.id,
            timestamp: formatRelativeTime(doc.updatedAt),
            rawTimestamp: new Date(doc.updatedAt),
            status: getActivityStatus(doc.status),
          });
        });
      }

      // Sort by timestamp (most recent first) and take top 10
      allActivities.sort((a, b) => b.rawTimestamp.getTime() - a.rawTimestamp.getTime());
      setRecentActivities(allActivities.slice(0, 10));
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentDocuments();
  }, [fetchRecentDocuments]);

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

  const handleOpenDocument = (activity: RecentActivity) => {
    if (activity.type === 'citation') {
      // Navigate to citation analysis page
      navigate(`/citation/analysis/${activity.documentId}`);
    } else {
      // Navigate to validator editor
      navigate(`/validator/editor/${activity.documentId}?name=${encodeURIComponent(activity.document)}`);
    }
  };

  const MODULES: ModuleCard[] = [
    {
      title: 'Citation Management',
      description: 'Extract, validate, and format citations from manuscripts. Supports APA, MLA, Chicago, and Vancouver styles.',
      uploadPath: '/citation/upload',
      icon: BookOpen,
      color: 'blue',
      stats: citationStats,
    },
    {
      title: 'Validator',
      description: 'Document editing with version control, track changes, and OnlyOffice integration for DOCX files.',
      uploadPath: '/validator/upload',
      icon: FileCheck,
      color: 'emerald',
      stats: validatorStats,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Module Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {MODULES.map((module) => {
          const IconComponent = module.icon;
          const colorClasses = module.color === 'blue'
            ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
            : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100';
          const buttonClasses = module.color === 'blue'
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-emerald-600 hover:bg-emerald-700';

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

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
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
                // Color coding based on type
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
                      <p className="text-xs text-gray-500">{activity.action}</p>
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
                        className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${typeColors.button}`}
                        title={activity.type === 'citation' ? 'Open Citation Analysis' : 'Open in Editor'}
                      >
                        <Edit3 className="w-4 h-4" />
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
