/**
 * EditorialDashboardPage
 *
 * Main dashboard for the editorial module. Loads document data from
 * Citation Management and Validator APIs, then renders module cards
 * and a recent activity list.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileCheck } from 'lucide-react';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { ModuleStatsCard, type ModuleCardData } from './ModuleStatsCard';
import { RecentActivityList, type RecentActivity } from './RecentActivityList';

interface DocWithTiming {
  id: string; fileName: string; originalName: string; fileSize?: number;
  wordCount?: number; pageCount?: number; status: string;
  createdAt: string; updatedAt: string;
  job?: { createdAt: string; completedAt: string | null };
}

function computePerfStats(docs: DocWithTiming[]) {
  const completed = docs.filter(d => (d.status === 'COMPLETED' || d.status === 'PARSED') && d.job?.completedAt && d.job?.createdAt);
  const times = completed
    .map(d => new Date(d.job!.completedAt!).getTime() - new Date(d.job!.createdAt).getTime())
    .filter(t => t > 0 && t < 3600000);
  const sizes = docs.filter(d => d.fileSize != null && d.fileSize > 0).map(d => d.fileSize!);
  const words = docs.filter(d => d.wordCount != null && d.wordCount > 0).map(d => d.wordCount!);
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  return {
    avgProcessingTime: avg(times),
    fastestTime: times.length > 0 ? Math.min(...times) : null,
    avgFileSize: avg(sizes),
    avgWordCount: words.length > 0 ? Math.round(words.reduce((a, b) => a + b, 0) / words.length) : null,
    docsAnalyzed: completed.length,
  };
}

function getProcessingTime(doc: DocWithTiming): number | null {
  if (!doc.job?.createdAt || !doc.job?.completedAt) return null;
  const ms = new Date(doc.job.completedAt).getTime() - new Date(doc.job.createdAt).getTime();
  return ms > 0 && ms < 3600000 ? ms : null;
}

function getActionText(status: string, type: 'citation' | 'validator'): string {
  const prefix = type === 'citation' ? 'Citation' : 'Validator';
  if (status === 'UPLOADED') return type === 'citation' ? 'Uploaded for citation analysis' : 'Document uploaded - ready to edit';
  if (status === 'PARSING') return `${prefix}: Processing document...`;
  if (status === 'ANALYZING') return 'Citation: Analyzing references...';
  if (status === 'PARSED' || status === 'COMPLETED') return type === 'citation' ? 'Citation analysis complete' : 'Document ready';
  return `${prefix}: Document uploaded`;
}

function getActivityStatus(status: string): 'completed' | 'pending' | 'in_progress' {
  if (status === 'COMPLETED' || status === 'PARSED') return 'completed';
  if (status === 'PARSING' || status === 'ANALYZING') return 'in_progress';
  return 'pending';
}

function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diffMs / 86400000);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function buildActivities(docs: DocWithTiming[], type: 'citation' | 'validator'): RecentActivity[] {
  return docs.map(doc => ({
    id: `${type}-${doc.id}`,
    type,
    action: getActionText(doc.status, type),
    document: doc.originalName || doc.fileName,
    documentId: doc.id,
    timestamp: formatRelativeTime(doc.updatedAt),
    rawTimestamp: new Date(doc.updatedAt),
    status: getActivityStatus(doc.status),
    fileSize: doc.fileSize,
    wordCount: doc.wordCount,
    processingTime: getProcessingTime(doc),
  }));
}

type Stats = { total: number; pending: number; completed: number };
const emptyPerf: ModuleCardData['perfStats'] = { avgProcessingTime: null, avgFileSize: null, avgWordCount: null, fastestTime: null, docsAnalyzed: 0 };

export function EditorialDashboardPage() {
  const navigate = useNavigate();
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [validatorStats, setValidatorStats] = useState<Stats>({ total: 0, pending: 0, completed: 0 });
  const [citationStats, setCitationStats] = useState<Stats>({ total: 0, pending: 0, completed: 0 });
  const [citationPerfStats, setCitationPerfStats] = useState<ModuleCardData['perfStats']>({ ...emptyPerf });
  const [validatorPerfStats, setValidatorPerfStats] = useState<ModuleCardData['perfStats']>({ ...emptyPerf });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hasPending, setHasPending] = useState(false);

  const fetchRecentDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const [vRes, cRes] = await Promise.all([
        api.get<{ success: boolean; data: { documents: DocWithTiming[]; total: number } }>('/validator/documents', { params: { limit: 100 } }).catch(() => null),
        api.get<{ success: boolean; data: { documents: DocWithTiming[]; pagination?: { total: number } } }>('/citation-management/documents', { params: { limit: 100 } }).catch(() => null),
      ]);
      const all: RecentActivity[] = [];

      if (vRes?.data?.success && vRes?.data?.data?.documents) {
        const docs = vRes.data.data.documents;
        setValidatorStats({ total: vRes.data.data.total ?? docs.length, pending: docs.filter(d => d.status === 'UPLOADED' || d.status === 'PARSING').length, completed: docs.filter(d => d.status === 'COMPLETED' || d.status === 'PARSED').length });
        setValidatorPerfStats(computePerfStats(docs));
        all.push(...buildActivities(docs, 'validator'));
      }
      if (cRes?.data?.success && cRes?.data?.data?.documents) {
        const docs = cRes.data.data.documents;
        setCitationStats({ total: cRes.data.data.pagination?.total ?? docs.length, pending: docs.filter(d => d.status === 'UPLOADED' || d.status === 'PARSING' || d.status === 'ANALYZING').length, completed: docs.filter(d => d.status === 'COMPLETED' || d.status === 'PARSED').length });
        setCitationPerfStats(computePerfStats(docs));
        all.push(...buildActivities(docs, 'citation'));
      }
      all.sort((a, b) => b.rawTimestamp.getTime() - a.rawTimestamp.getTime());
      setRecentActivities(all.slice(0, 10));
      setHasPending(all.some(a => a.status === 'pending' || a.status === 'in_progress'));
    } catch { /* fetch error handled gracefully — empty state is shown */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRecentDocuments(); }, [fetchRecentDocuments]);
  useEffect(() => {
    if (!hasPending) return;
    const interval = setInterval(fetchRecentDocuments, 10000);
    return () => clearInterval(interval);
  }, [hasPending, fetchRecentDocuments]);

  const handleDeleteDocument = async (e: React.MouseEvent, activity: RecentActivity) => {
    e.stopPropagation();
    if (!confirm('Delete this document? This cannot be undone.')) return;
    setDeletingId(activity.documentId);
    try {
      const path = activity.type === 'citation' ? `/citation-management/document/${activity.documentId}` : `/validator/documents/${activity.documentId}`;
      await api.delete(path);
      toast.success('Document deleted');
      fetchRecentDocuments();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to delete document'); }
    finally { setDeletingId(null); }
  };

  const handleOpenDocument = (activity: RecentActivity) => {
    if (activity.type === 'citation') navigate(`/citation/analysis/${activity.documentId}`);
    else navigate(`/validator/editor/${activity.documentId}?name=${encodeURIComponent(activity.document)}`);
  };

  const MODULES: ModuleCardData[] = useMemo(() => [
    {
      title: 'Citation Management',
      description: 'AI-powered citation extraction, validation, and formatting. Catch incorrect references, missing DOIs, and style inconsistencies before they reach production.',
      benefits: ['Detect mismatched in-text citations and reference list entries', 'Auto-validate against APA, MLA, Chicago, and Vancouver styles', 'Flag missing authors, wrong years, and broken DOIs instantly'],
      uploadPath: '/citation/upload', icon: BookOpen, color: 'blue', stats: citationStats, perfStats: citationPerfStats,
    },
    {
      title: 'Validator',
      description: 'Comprehensive document quality checker with version control and track changes. Identify formatting errors, structural issues, and inconsistencies before publication.',
      benefits: ['Spot heading hierarchy violations and broken cross-references', 'Track every edit with full version history and accept/reject workflow', 'Export clean, production-ready DOCX with all corrections applied'],
      uploadPath: '/validator/upload', icon: FileCheck, color: 'emerald', stats: validatorStats, perfStats: validatorPerfStats,
    },
  ], [citationStats, citationPerfStats, validatorStats, validatorPerfStats]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {MODULES.map((m) => <ModuleStatsCard key={m.title} module={m} />)}
      </div>
      <RecentActivityList
        activities={recentActivities} loading={loading} deletingId={deletingId}
        onRefresh={fetchRecentDocuments} onOpenDocument={handleOpenDocument} onDeleteDocument={handleDeleteDocument}
      />
    </div>
  );
}
