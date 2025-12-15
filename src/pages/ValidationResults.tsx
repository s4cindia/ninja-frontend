import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  RefreshCw, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  FileText,
  Clock,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { IssueTable } from '@/components/validation/IssueTable';
import { useValidation, useUpdateIssueStatus, useRetryValidation } from '@/hooks/useAccessibility';
import { cn } from '@/utils/cn';
import type { IssueSeverity, IssueStatus } from '@/services/accessibility.service';

type FilterSeverity = IssueSeverity | 'all';
type FilterStatus = IssueStatus | 'all';

const severityOrder: IssueSeverity[] = ['critical', 'major', 'minor', 'info'];

function SummaryCard({ 
  icon: Icon, 
  label, 
  count, 
  color,
  isActive,
  onClick 
}: { 
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
  isActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border transition-all',
        isActive 
          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' 
          : 'border-gray-200 bg-white hover:border-gray-300'
      )}
    >
      <div className={cn('p-2 rounded-full', color)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="text-left">
        <p className="text-2xl font-bold text-gray-900">{count}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </button>
  );
}

export function ValidationResults() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const { data: validation, isLoading, error, refetch } = useValidation(fileId || '');
  const updateStatusMutation = useUpdateIssueStatus();
  const retryMutation = useRetryValidation();

  const handleStatusChange = (issueId: string, status: IssueStatus) => {
    if (!fileId) return;
    updateStatusMutation.mutate({ fileId, issueId, status });
  };

  const handleRetry = () => {
    if (!fileId) return;
    retryMutation.mutate(fileId);
  };

  const filteredIssues = useMemo(() => {
    if (!validation?.issues) return [];
    
    return validation.issues
      .filter(issue => {
        if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
        if (statusFilter !== 'all' && issue.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const aIndex = severityOrder.indexOf(a.severity);
        const bIndex = severityOrder.indexOf(b.severity);
        return aIndex - bIndex;
      });
  }, [validation?.issues, severityFilter, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Loading validation results...</span>
      </div>
    );
  }

  if (error || !validation) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/files')}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          Back to Files
        </Button>
        <Alert variant="error">
          Failed to load validation results. The file may not exist or validation hasn't started yet.
        </Alert>
      </div>
    );
  }

  const isProcessing = validation.status === 'processing' || validation.status === 'pending';
  const isFailed = validation.status === 'failed';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/files')}>
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Validation Results</h1>
            <div className="flex items-center gap-2 mt-1">
              <FileText className="h-4 w-4 text-gray-400" aria-hidden="true" />
              <span className="text-sm text-gray-500">{validation.fileName}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isProcessing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isProcessing && 'animate-spin')} aria-hidden="true" />
            Refresh
          </Button>
          {isFailed && (
            <Button 
              onClick={handleRetry}
              disabled={retryMutation.isPending}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', retryMutation.isPending && 'animate-spin')} aria-hidden="true" />
              Retry Validation
            </Button>
          )}
        </div>
      </div>

      {isProcessing && (
        <Alert variant="info">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Validation is in progress. Results will update automatically.</span>
          </div>
        </Alert>
      )}

      {isFailed && (
        <Alert variant="error">
          Validation failed: {validation.errorMessage || 'Unknown error'}
        </Alert>
      )}

      {validation.status === 'completed' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <SummaryCard
              icon={AlertCircle}
              label="Critical"
              count={validation.summary.critical}
              color="bg-red-100 text-red-600"
              isActive={severityFilter === 'critical'}
              onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
            />
            <SummaryCard
              icon={AlertTriangle}
              label="Major"
              count={validation.summary.major}
              color="bg-orange-100 text-orange-600"
              isActive={severityFilter === 'major'}
              onClick={() => setSeverityFilter(severityFilter === 'major' ? 'all' : 'major')}
            />
            <SummaryCard
              icon={AlertTriangle}
              label="Minor"
              count={validation.summary.minor}
              color="bg-yellow-100 text-yellow-600"
              isActive={severityFilter === 'minor'}
              onClick={() => setSeverityFilter(severityFilter === 'minor' ? 'all' : 'minor')}
            />
            <SummaryCard
              icon={Info}
              label="Info"
              count={validation.summary.info}
              color="bg-blue-100 text-blue-600"
              isActive={severityFilter === 'info'}
              onClick={() => setSeverityFilter(severityFilter === 'info' ? 'all' : 'info')}
            />
            <SummaryCard
              icon={CheckCircle}
              label="Fixed"
              count={validation.summary.fixed}
              color="bg-green-100 text-green-600"
              isActive={statusFilter === 'fixed'}
              onClick={() => setStatusFilter(statusFilter === 'fixed' ? 'all' : 'fixed')}
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Issues ({filteredIssues.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label="Filter by status"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="fixed">Fixed</option>
                    <option value="ignored">Ignored</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <IssueTable
                issues={filteredIssues}
                onStatusChange={handleStatusChange}
                isUpdating={updateStatusMutation.isPending}
              />
            </CardContent>
          </Card>
        </>
      )}

      {validation.completedAt && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" aria-hidden="true" />
          <span>
            Completed {new Date(validation.completedAt).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
