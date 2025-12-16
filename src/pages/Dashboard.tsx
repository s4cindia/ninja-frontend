import { FileText, Clock, CheckCircle, XCircle, Activity, Upload, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardStats, useRecentActivity } from '@/hooks/useDashboard';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { getErrorMessage } from '@/services/api';

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color = 'text-gray-900',
  loading = false 
}: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType;
  color?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            {loading ? (
              <div className="mt-2">
                <Spinner size="sm" />
              </div>
            ) : (
              <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
            )}
          </div>
          <div className="p-3 bg-gray-100 rounded-full">
            <Icon className="w-6 h-6 text-gray-600" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComplianceScoreCircle({ score, loading }: { score: number; loading: boolean }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const getScoreColor = (s: number) => {
    if (s >= 90) return { stroke: '#22c55e', text: 'text-green-600' };
    if (s >= 70) return { stroke: '#eab308', text: 'text-yellow-600' };
    return { stroke: '#ef4444', text: 'text-red-600' };
  };
  
  const colors = getScoreColor(score);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Average Compliance Score</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center py-4">
        {loading ? (
          <Spinner size="lg" />
        ) : (
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={colors.stroke}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${colors.text}`}>
                {score}%
              </span>
            </div>
          </div>
        )}
        <p className="text-sm text-gray-500 mt-4">Based on all validated files</p>
      </CardContent>
    </Card>
  );
}

function RecentActivityList() {
  const { data: activities, isLoading, error } = useRecentActivity(5);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'upload':
        return <Upload className="w-4 h-4 text-blue-500" aria-hidden="true" />;
      case 'validation':
        return <Search className="w-4 h-4 text-purple-500" aria-hidden="true" />;
      case 'compliance':
        return <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" aria-hidden="true" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Spinner size="md" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="error" title="Failed to load activity">
            {getErrorMessage(error)}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {!activities || activities.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recent activity</p>
        ) : (
          <ul className="space-y-4" role="list">
            {activities.map((activity) => (
              <li key={activity.id} className="flex items-start gap-3">
                <div className="mt-1">{getActivityIcon(activity.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{activity.description}</p>
                  {activity.fileName && (
                    <p className="text-xs text-gray-500 truncate">{activity.fileName}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {formatTime(activity.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();

  if (statsError) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        <Alert variant="error" title="Failed to load dashboard">
          {getErrorMessage(statsError)}
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-3">
          <Link to="/files">
            <Button variant="primary" leftIcon={<Upload className="w-4 h-4" />}>
              Upload File
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Files"
          value={stats?.totalFiles ?? 0}
          icon={FileText}
          loading={statsLoading}
        />
        <StatCard
          title="Files Processed"
          value={stats?.filesProcessed ?? 0}
          icon={CheckCircle}
          color="text-green-600"
          loading={statsLoading}
        />
        <StatCard
          title="Files Pending"
          value={stats?.filesPending ?? 0}
          icon={Clock}
          color="text-yellow-600"
          loading={statsLoading}
        />
        <StatCard
          title="Files Failed"
          value={stats?.filesFailed ?? 0}
          icon={XCircle}
          color="text-red-600"
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ComplianceScoreCircle 
          score={stats?.averageComplianceScore ?? 0} 
          loading={statsLoading} 
        />
        <div className="lg:col-span-2">
          <RecentActivityList />
        </div>
      </div>
    </div>
  );
}
