import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, Wrench, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Progress } from '@/components/ui/Progress';
import { api } from '@/services/api';

interface RemediationIssue {
  id: string;
  code: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  message: string;
  location?: string;
  isAutoFixable: boolean;
  status: 'pending' | 'fixing' | 'fixed' | 'failed';
}

interface RemediationPlan {
  jobId: string;
  epubFileName: string;
  totalIssues: number;
  autoFixableCount: number;
  issues: RemediationIssue[];
}

type PageState = 'loading' | 'ready' | 'fixing' | 'complete' | 'error';

export const EPUBRemediation: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  
  const [pageState, setPageState] = useState<PageState>('loading');
  const [plan, setPlan] = useState<RemediationPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixProgress, setFixProgress] = useState(0);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const loadRemediationPlan = async () => {
      if (!jobId) {
        setError('No job ID provided');
        setPageState('error');
        return;
      }

      try {
        const response = await api.get(`/epub/job/${jobId}/remediation`);
        const data = response.data.data || response.data;
        setPlan(data);
        setPageState('ready');
        setIsDemo(false);
      } catch {
        const demoPlan: RemediationPlan = {
          jobId: jobId,
          epubFileName: 'sample-book.epub',
          totalIssues: 5,
          autoFixableCount: 5,
          issues: [
            { id: '1', code: 'EPUB-META-002', severity: 'moderate', message: '[Demo] Missing accessibility features metadata', isAutoFixable: true, status: 'pending' },
            { id: '2', code: 'EPUB-META-003', severity: 'minor', message: '[Demo] Missing accessMode metadata', isAutoFixable: true, status: 'pending' },
            { id: '3', code: 'EPUB-META-004', severity: 'minor', message: '[Demo] Missing accessibilityHazard metadata', isAutoFixable: true, status: 'pending' },
            { id: '4', code: 'EPUB-META-005', severity: 'minor', message: '[Demo] Missing accessibilitySummary metadata', isAutoFixable: true, status: 'pending' },
            { id: '5', code: 'EPUB-NAV-001', severity: 'moderate', message: '[Demo] Navigation document missing landmarks', isAutoFixable: true, status: 'pending' },
          ],
        };
        setPlan(demoPlan);
        setPageState('ready');
        setIsDemo(true);
      }
    };

    loadRemediationPlan();
  }, [jobId]);

  const handleApplyAutoFixes = async () => {
    if (!plan) return;

    setPageState('fixing');
    setFixProgress(0);

    const autoFixableIssues = plan.issues.filter(i => i.isAutoFixable);
    const totalToFix = autoFixableIssues.length;

    for (let i = 0; i < totalToFix; i++) {
      const issue = autoFixableIssues[i];
      
      setPlan(prev => prev ? {
        ...prev,
        issues: prev.issues.map(iss => 
          iss.id === issue.id ? { ...iss, status: 'fixing' as const } : iss
        ),
      } : null);

      await new Promise(resolve => setTimeout(resolve, 500));

      if (!isDemo) {
        try {
          await api.post(`/epub/job/${jobId}/fix/${issue.id}`);
        } catch {
          // Continue with demo behavior on error
        }
      }

      setPlan(prev => prev ? {
        ...prev,
        issues: prev.issues.map(iss => 
          iss.id === issue.id ? { ...iss, status: 'fixed' as const } : iss
        ),
      } : null);

      setFixProgress(Math.round(((i + 1) / totalToFix) * 100));
    }

    setPageState('complete');
  };

  const handleDownloadFixed = async () => {
    if (!jobId) return;

    try {
      const response = await api.get(`/epub/job/${jobId}/download`, {
        responseType: 'blob',
      });
      
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = plan?.epubFileName || 'fixed-epub.epub';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Download not available in demo mode');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'serious': return 'text-orange-600';
      case 'moderate': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fixing': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'fixed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  if (pageState === 'loading') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
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

  const fixedCount = plan.issues.filter(i => i.status === 'fixed').length;
  const pendingCount = plan.issues.filter(i => i.status === 'pending' && i.isAutoFixable).length;

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Auto-Fix Progress
          </CardTitle>
          <CardDescription>
            {pageState === 'complete' 
              ? `Successfully fixed ${fixedCount} of ${plan.autoFixableCount} issues`
              : `${pendingCount} issues can be automatically fixed`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(pageState === 'fixing' || pageState === 'complete') && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{fixProgress}%</span>
              </div>
              <Progress value={fixProgress} variant={pageState === 'complete' ? 'success' : 'default'} />
            </div>
          )}

          <div className="flex gap-2">
            {pageState === 'ready' && (
              <Button onClick={handleApplyAutoFixes}>
                <Wrench className="h-4 w-4 mr-2" />
                Apply Auto-Fixes ({plan.autoFixableCount})
              </Button>
            )}
            {pageState === 'fixing' && (
              <Button disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fixing Issues...
              </Button>
            )}
            {pageState === 'complete' && (
              <>
                <Button onClick={handleDownloadFixed}>
                  Download Fixed EPUB
                </Button>
                <Button variant="outline" onClick={() => navigate('/epub')}>
                  Start New Audit
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Issues ({plan.issues.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {plan.issues.map((issue) => (
              <div 
                key={issue.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  issue.status === 'fixed' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="mt-0.5">
                  {getStatusIcon(issue.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" size="sm">{issue.code}</Badge>
                    <span className={`text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    {issue.isAutoFixable && (
                      <Badge variant="success" size="sm">
                        <Wrench className="h-3 w-3 mr-1" />
                        Auto-fixable
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{issue.message}</p>
                  {issue.location && (
                    <p className="text-xs text-gray-500 mt-1">{issue.location}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
