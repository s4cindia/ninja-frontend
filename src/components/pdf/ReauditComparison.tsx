import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { CheckCircle2, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import type { ReauditComparisonResult, Issue } from '../../types/pdf-remediation.types';

interface ReauditComparisonProps {
  comparison: ReauditComparisonResult;
}

export function ReauditComparison({ comparison }: ReauditComparisonProps) {
  const { metrics, comparison: issueComparison } = comparison;

  return (
    <div className="space-y-6">
      {/* Success Metrics Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Remediation Results
          </CardTitle>
          <CardDescription>
            Before and after comparison
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Resolution Rate"
              value={`${metrics.resolutionRate.toFixed(1)}%`}
              icon={<TrendingUp />}
              variant="success"
            />
            <MetricCard
              label="Resolved"
              value={metrics.resolvedCount}
              icon={<CheckCircle2 />}
              variant="success"
            />
            <MetricCard
              label="Remaining"
              value={metrics.remainingCount}
              icon={<AlertTriangle />}
              variant="warning"
            />
            <MetricCard
              label="Regressions"
              value={metrics.regressionCount}
              icon={<XCircle />}
              variant={metrics.regressionCount > 0 ? 'error' : 'neutral'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Resolved Issues */}
      {issueComparison.resolved.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Resolved Issues ({issueComparison.resolved.length})
            </CardTitle>
            <CardDescription>
              These issues were successfully fixed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {issueComparison.resolved.map((issue, index) => (
                <IssueRow key={index} issue={issue} status="resolved" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remaining Issues */}
      {issueComparison.remaining.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Remaining Issues ({issueComparison.remaining.length})
            </CardTitle>
            <CardDescription>
              These issues still need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {issueComparison.remaining.map((issue, index) => (
                <IssueRow key={index} issue={issue} status="remaining" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regressions */}
      {issueComparison.regressions.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              New Issues / Regressions ({issueComparison.regressions.length})
            </CardTitle>
            <CardDescription>
              These issues were introduced during remediation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {issueComparison.regressions.map((issue, index) => (
                <IssueRow key={index} issue={issue} status="regression" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper Components

function MetricCard({ label, value, icon, variant }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant: 'success' | 'warning' | 'error' | 'neutral';
}) {
  const variantClasses = {
    success: 'text-green-600 bg-green-50',
    warning: 'text-yellow-600 bg-yellow-50',
    error: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50',
  };

  return (
    <div className={`p-4 rounded-lg ${variantClasses[variant]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function IssueRow({ issue, status }: {
  issue: Issue;
  status: 'resolved' | 'remaining' | 'regression';
}) {
  const statusConfig = {
    resolved: { colorClass: 'text-green-600', icon: CheckCircle2 },
    remaining: { colorClass: 'text-yellow-600', icon: AlertTriangle },
    regression: { colorClass: 'text-red-600', icon: XCircle },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  // Map severity to supported Badge variants
  const getSeverityVariant = (severity: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
    const normalizedSeverity = severity?.toUpperCase() || '';
    if (normalizedSeverity === 'CRITICAL') return 'error';
    if (normalizedSeverity === 'SERIOUS' || normalizedSeverity === 'HIGH') return 'warning';
    if (normalizedSeverity === 'MODERATE' || normalizedSeverity === 'MEDIUM') return 'info';
    return 'default';
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-white">
      <Icon className={`h-5 w-5 mt-0.5 ${config.colorClass}`} />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{issue.code}</span>
          <Badge variant={getSeverityVariant(issue.severity)}>
            {issue.severity}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">{issue.message}</p>
        {issue.location && (
          <p className="text-xs text-gray-500 mt-1">Page {issue.page}</p>
        )}
      </div>
    </div>
  );
}
