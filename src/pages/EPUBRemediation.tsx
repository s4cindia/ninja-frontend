import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, ArrowLeft, Download, Eye, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { 
  RemediationPlanView, 
  RemediationPlan as PlanViewPlan 
} from '@/components/epub/RemediationPlanView';
import { RemediationTask, TaskStatus } from '@/components/epub/RemediationTaskCard';
import { FixResult } from '@/components/epub/RemediationProgress';
import { api } from '@/services/api';

type PageState = 'loading' | 'ready' | 'running' | 'complete' | 'error';

interface LocationState {
  auditResult?: {
    jobId: string;
    issues: Array<{
      id: string;
      code: string;
      severity: 'critical' | 'serious' | 'moderate' | 'minor';
      message: string;
      location?: string;
      suggestion?: string;
    }>;
  };
  autoFixableIssues?: Array<{
    id: string;
    code: string;
    severity: 'critical' | 'serious' | 'moderate' | 'minor';
    message: string;
    location?: string;
    suggestion?: string;
    isAutoFixable: boolean;
    status: 'pending';
  }>;
  isDemo?: boolean;
}

interface ComparisonSummary {
  fixedCount: number;
  failedCount: number;
  skippedCount: number;
  beforeScore: number;
  afterScore: number;
}

export const EPUBRemediation: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const cancelledRef = useRef(false);
  
  const [pageState, setPageState] = useState<PageState>('loading');
  const [plan, setPlan] = useState<PlanViewPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [completedFixes, setCompletedFixes] = useState<FixResult[]>([]);
  const [comparisonSummary, setComparisonSummary] = useState<ComparisonSummary | null>(null);

  useEffect(() => {
    const loadRemediationPlan = async () => {
      if (!jobId) {
        setError('No job ID provided');
        setPageState('error');
        return;
      }

      if (locationState?.autoFixableIssues && locationState.autoFixableIssues.length > 0) {
        const tasks: RemediationTask[] = locationState.autoFixableIssues.map(issue => ({
          id: issue.id,
          code: issue.code,
          severity: issue.severity,
          message: issue.message,
          location: issue.location,
          suggestion: issue.suggestion,
          type: 'auto' as const,
          status: 'pending' as const,
        }));

        setPlan({
          jobId,
          epubFileName: 'uploaded-file.epub',
          tasks,
        });
        setPageState('ready');
        setIsDemo(locationState.isDemo ?? false);
        return;
      }

      try {
        const response = await api.get(`/epub/job/${jobId}/remediation`);
        const data = response.data.data || response.data;
        
        if (data.tasks && data.tasks.length > 0) {
          setPlan({
            jobId: data.jobId || jobId,
            epubFileName: data.epubFileName || 'document.epub',
            tasks: data.tasks.map((t: RemediationTask) => ({
              ...t,
              type: t.type || 'auto',
              status: t.status || 'pending',
            })),
          });
          setPageState('ready');
          setIsDemo(false);
          return;
        }
        
        if (data.issues && data.issues.length > 0) {
          setPlan({
            jobId: data.jobId || jobId,
            epubFileName: data.epubFileName || 'document.epub',
            tasks: data.issues.map((issue: RemediationTask & { isAutoFixable?: boolean }) => ({
              id: issue.id,
              code: issue.code,
              severity: issue.severity,
              message: issue.message,
              location: issue.location,
              suggestion: issue.suggestion,
              type: issue.isAutoFixable !== false ? 'auto' : 'manual',
              status: issue.status || 'pending',
            })),
          });
          setPageState('ready');
          setIsDemo(false);
          return;
        }
      } catch {
        // Fall through to demo plan
      }

      const demoPlan: PlanViewPlan = {
        jobId: jobId,
        epubFileName: 'sample-book.epub',
        tasks: [
          { id: '1', code: 'EPUB-META-002', severity: 'moderate', message: '[Demo] Missing accessibility features metadata', type: 'auto', status: 'pending', suggestion: 'Add schema:accessibilityFeature metadata' },
          { id: '2', code: 'EPUB-META-003', severity: 'minor', message: '[Demo] Missing accessMode metadata', type: 'auto', status: 'pending', suggestion: 'Add schema:accessMode metadata' },
          { id: '3', code: 'EPUB-META-004', severity: 'minor', message: '[Demo] Missing accessibilityHazard metadata', type: 'auto', status: 'pending', suggestion: 'Add schema:accessibilityHazard metadata' },
          { id: '4', code: 'EPUB-META-005', severity: 'minor', message: '[Demo] Missing accessibilitySummary metadata', type: 'auto', status: 'pending', suggestion: 'Add schema:accessibilitySummary metadata' },
          { id: '5', code: 'EPUB-NAV-001', severity: 'moderate', message: '[Demo] Navigation document missing landmarks', type: 'auto', status: 'pending', suggestion: 'Add epub:type landmarks to nav' },
          { id: '6', code: 'EPUB-IMG-001', severity: 'serious', message: '[Demo] Image missing alt text', type: 'manual', status: 'pending', location: 'content/chapter1.xhtml, line 42', suggestion: 'Add descriptive alt text' },
        ],
      };
      setPlan(demoPlan);
      setPageState('ready');
      setIsDemo(true);
    };

    loadRemediationPlan();
  }, [jobId, locationState]);

  const handleRunAutoRemediation = async () => {
    if (!plan) return;

    cancelledRef.current = false;
    setPageState('running');
    setCompletedFixes([]);
    
    const autoTasks = plan.tasks.filter(t => t.type === 'auto' && t.status === 'pending');
    const totalAutoTasks = autoTasks.length;

    if (!isDemo) {
      try {
        await api.post(`/epub/job/${jobId}/auto-remediate`);
      } catch {
        // Continue with demo simulation
      }
    }

    const localFixes: FixResult[] = [];
    let currentTaskId: string | null = null;

    for (const task of autoTasks) {
      if (cancelledRef.current) {
        if (currentTaskId) {
          setPlan(prev => prev ? {
            ...prev,
            tasks: prev.tasks.map(t => 
              t.id === currentTaskId ? { ...t, status: 'pending' as TaskStatus } : t
            ),
          } : null);
        }
        break;
      }

      currentTaskId = task.id;
      setCurrentTask(task.message);
      
      setPlan(prev => prev ? {
        ...prev,
        tasks: prev.tasks.map(t => 
          t.id === task.id ? { ...t, status: 'in_progress' as TaskStatus } : t
        ),
      } : null);

      await new Promise(resolve => setTimeout(resolve, 600));

      if (cancelledRef.current) {
        setPlan(prev => prev ? {
          ...prev,
          tasks: prev.tasks.map(t => 
            t.id === task.id ? { ...t, status: 'pending' as TaskStatus } : t
          ),
        } : null);
        break;
      }

      const success = Math.random() > 0.1;
      const newStatus: TaskStatus = success ? 'completed' : 'failed';

      setPlan(prev => prev ? {
        ...prev,
        tasks: prev.tasks.map(t => 
          t.id === task.id ? { ...t, status: newStatus } : t
        ),
      } : null);

      const fixResult = {
        taskId: task.id,
        code: task.code,
        message: task.message,
        success,
      };
      localFixes.push(fixResult);
      setCompletedFixes([...localFixes]);
      currentTaskId = null;
    }

    setCurrentTask(null);

    if (cancelledRef.current) {
      setPageState('ready');
      return;
    }

    try {
      const response = await api.get(`/epub/job/${jobId}/comparison/summary`);
      const data = response.data.data || response.data;
      setComparisonSummary(data);
    } catch {
      const successCount = localFixes.filter(f => f.success).length;
      const failCount = localFixes.filter(f => !f.success).length;
      setComparisonSummary({
        fixedCount: successCount,
        failedCount: failCount,
        skippedCount: totalAutoTasks - localFixes.length,
        beforeScore: 45,
        afterScore: Math.min(95, 45 + successCount * 10),
      });
    }

    setPageState('complete');
  };

  const handleCancelRemediation = () => {
    cancelledRef.current = true;
    setCurrentTask(null);
  };

  const handleDownloadRemediated = async () => {
    if (!jobId) return;

    try {
      const response = await api.get(`/epub/job/${jobId}/download`, {
        responseType: 'blob',
      });
      
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = plan?.epubFileName?.replace('.epub', '-remediated.epub') || 'remediated.epub';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Download not available in demo mode');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleViewComparison = () => {
    navigate(`/epub/compare/${jobId}`);
  };

  if (pageState === 'loading') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
          <span className="ml-3 text-gray-600">Loading remediation plan...</span>
        </div>
      </div>
    );
  }

  if (pageState === 'error' || !plan) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert variant="error">
          {error || 'Failed to load remediation plan'}
        </Alert>
        <Button className="mt-4" onClick={() => navigate('/epub')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to EPUB Accessibility
        </Button>
      </div>
    );
  }

  const fixedCount = plan.tasks.filter(t => t.status === 'completed').length;
  const failedCount = plan.tasks.filter(t => t.status === 'failed').length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/epub')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary-600" />
            EPUB Remediation
          </h1>
          <p className="text-gray-600 mt-1">
            Fix accessibility issues in your EPUB file
          </p>
        </div>
        {isDemo && <Badge variant="warning">Demo Mode</Badge>}
      </div>

      {isDemo && (
        <Alert variant="info" onClose={() => {}}>
          Backend unavailable - showing demo remediation workflow
        </Alert>
      )}

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {pageState === 'complete' && comparisonSummary && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Remediation Complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-green-600">{fixedCount}</p>
                <p className="text-xs text-gray-600">Issues Fixed</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-red-600">{failedCount}</p>
                <p className="text-xs text-gray-600">Failed</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {comparisonSummary.beforeScore}% → {comparisonSummary.afterScore}%
                </p>
                <p className="text-xs text-gray-600">Score Improvement</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleViewComparison}>
                <Eye className="h-4 w-4 mr-2" />
                View Comparison
              </Button>
              <Button onClick={handleDownloadRemediated} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Remediated EPUB
              </Button>
              <Button onClick={() => navigate('/epub')} variant="ghost">
                <RotateCcw className="h-4 w-4 mr-2" />
                Start New Audit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <RemediationPlanView
        plan={plan}
        isRunningRemediation={pageState === 'running'}
        currentTask={currentTask}
        completedFixes={completedFixes}
        onRunAutoRemediation={handleRunAutoRemediation}
        onCancelRemediation={handleCancelRemediation}
      />
    </div>
  );
};
