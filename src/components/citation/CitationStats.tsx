import {
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Quote
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import type { CitationStats as CitationStatsType } from '@/types/citation.types';

interface CitationStatsProps {
  stats: CitationStatsType;
  isLoading?: boolean;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function StatCard({ title, value, icon: Icon, color, bgColor }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', bgColor)}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </Card>
  );
}

export function CitationStats({ stats, isLoading }: CitationStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-200 rounded-lg" />
              <div>
                <div className="h-4 w-16 bg-gray-200 rounded mb-1" />
                <div className="h-6 w-12 bg-gray-200 rounded" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const parseRate = stats.total > 0
    ? Math.round((stats.parsed / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Main stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Citations"
          value={stats.total}
          icon={Quote}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Parsed"
          value={stats.parsed}
          icon={CheckCircle}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          title="Unparsed"
          value={stats.unparsed}
          icon={AlertCircle}
          color="text-yellow-600"
          bgColor="bg-yellow-50"
        />
        {/* AC-26: Show citations needing review */}
        <StatCard
          title="Needs Review"
          value={stats.needsReview}
          icon={AlertTriangle}
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
        <StatCard
          title="Avg Confidence"
          value={`${Math.round(stats.averageConfidence)}%`}
          icon={BarChart3}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
      </div>

      {/* Type breakdown */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Citations by Type
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {Object.entries(stats.byType).map(([type, count]) => (
            <div
              key={type}
              className="text-center p-2 bg-gray-50 rounded-lg"
            >
              <p className="text-lg font-semibold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 capitalize">
                {type.toLowerCase().replace(/_/g, ' ')}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Style breakdown */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Citations by Style
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
          {Object.entries(stats.byStyle).map(([style, count]) => (
            <div
              key={style}
              className="text-center p-2 bg-gray-50 rounded-lg"
            >
              <p className="text-lg font-semibold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500">{style}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Parse progress bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Parse Progress</span>
          <span className="text-sm font-medium text-gray-900">{parseRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${parseRate}%` }}
          />
        </div>
      </Card>
    </div>
  );
}
