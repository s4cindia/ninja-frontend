/**
 * ModuleStatsCard
 *
 * Displays an individual module card with description, benefits,
 * document stats, performance stats, and an upload action button.
 */

import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { Upload, ArrowRight, CheckCircle, Zap, TrendingUp, FileBarChart, FileText } from 'lucide-react';

export interface ModuleCardData {
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

interface ModuleStatsCardProps {
  module: ModuleCardData;
}

export function ModuleStatsCard({ module }: ModuleStatsCardProps) {
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
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden group">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg transition-colors ${colorClasses}`}>
            <IconComponent className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{module.description}</p>
          </div>
        </div>

        <ul className="mt-4 space-y-1.5">
          {module.benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-xs text-gray-600">
              <CheckCircle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${perfAccent}`} />
              {benefit}
            </li>
          ))}
        </ul>

        <DocumentStatsGrid stats={module.stats} />

        {module.perfStats.docsAnalyzed > 0 && (
          <PerformanceStats perfStats={module.perfStats} accent={perfAccent} bg={perfBg} />
        )}
      </div>

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
}

function DocumentStatsGrid({ stats }: { stats: ModuleCardData['stats'] }) {
  return (
    <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t">
      <div className="text-center">
        <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
        <p className="text-xs text-gray-500">Total</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-semibold text-amber-600">{stats.pending}</p>
        <p className="text-xs text-gray-500">Pending</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-semibold text-green-600">{stats.completed}</p>
        <p className="text-xs text-gray-500">Completed</p>
      </div>
    </div>
  );
}

function PerformanceStats({
  perfStats,
  accent,
  bg,
}: {
  perfStats: ModuleCardData['perfStats'];
  accent: string;
  bg: string;
}) {
  return (
    <div className={`mt-4 p-3 rounded-lg ${bg}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Zap className={`w-3.5 h-3.5 ${accent}`} />
        <span className={`text-xs font-semibold ${accent}`}>Performance</span>
        <span className="text-xs text-gray-400 ml-auto">
          Based on {perfStats.docsAnalyzed} document{perfStats.docsAnalyzed !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {perfStats.avgProcessingTime !== null && (
          <PerfStatItem icon={TrendingUp} value={formatDuration(perfStats.avgProcessingTime)} label="Avg. analysis time" />
        )}
        {perfStats.fastestTime !== null && (
          <PerfStatItem icon={Zap} value={formatDuration(perfStats.fastestTime)} label="Fastest analysis" />
        )}
        {perfStats.avgFileSize !== null && (
          <PerfStatItem icon={FileBarChart} value={formatFileSize(perfStats.avgFileSize)} label="Avg. document size" />
        )}
        {perfStats.avgWordCount !== null && (
          <PerfStatItem icon={FileText} value={perfStats.avgWordCount.toLocaleString()} label="Avg. word count" />
        )}
      </div>
    </div>
  );
}

function PerfStatItem({
  icon: Icon,
  value,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-gray-400" />
      <div>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
        <p className="text-[10px] text-gray-500">{label}</p>
      </div>
    </div>
  );
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
