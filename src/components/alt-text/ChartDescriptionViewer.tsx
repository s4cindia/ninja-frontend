import React, { useState } from 'react';
import { 
  BarChart3, LineChart, PieChart, GitBranch, Network,
  Table, Map, Image, TrendingUp, Lightbulb, Database,
  ChevronDown, ChevronUp, Copy, Check, FileText
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '@/utils/cn';
import { ChartDescription, ImageType, DataTableRow } from '@/types/alt-text.types';

interface ChartDescriptionViewerProps {
  description: ChartDescription;
  imageUrl?: string;
  showImage?: boolean;
  expandedByDefault?: boolean;
  onEdit?: (field: string, value: string) => void;
}

const IMAGE_TYPE_CONFIG: Record<ImageType, { 
  icon: React.ReactNode; 
  label: string; 
  color: string;
  description: string;
}> = {
  BAR_CHART: { 
    icon: <BarChart3 className="h-4 w-4" />, 
    label: 'Bar Chart', 
    color: 'blue',
    description: 'Vertical or horizontal bars showing quantities'
  },
  LINE_CHART: { 
    icon: <LineChart className="h-4 w-4" />, 
    label: 'Line Chart', 
    color: 'green',
    description: 'Lines connecting data points over time'
  },
  PIE_CHART: { 
    icon: <PieChart className="h-4 w-4" />, 
    label: 'Pie Chart', 
    color: 'purple',
    description: 'Circular chart divided into slices'
  },
  SCATTER_PLOT: { 
    icon: <span className="text-xs">⬡</span>, 
    label: 'Scatter Plot', 
    color: 'cyan',
    description: 'Dots plotted on x-y axes'
  },
  FLOWCHART: { 
    icon: <GitBranch className="h-4 w-4" />, 
    label: 'Flowchart', 
    color: 'orange',
    description: 'Process or decision flow diagram'
  },
  ORG_CHART: { 
    icon: <Network className="h-4 w-4" />, 
    label: 'Org Chart', 
    color: 'pink',
    description: 'Hierarchical organization structure'
  },
  DIAGRAM: { 
    icon: <GitBranch className="h-4 w-4" />, 
    label: 'Diagram', 
    color: 'indigo',
    description: 'Technical drawing or schematic'
  },
  TABLE_IMAGE: { 
    icon: <Table className="h-4 w-4" />, 
    label: 'Table', 
    color: 'gray',
    description: 'Tabular data image'
  },
  MAP: { 
    icon: <Map className="h-4 w-4" />, 
    label: 'Map', 
    color: 'emerald',
    description: 'Geographical or floor plan'
  },
  INFOGRAPHIC: { 
    icon: <FileText className="h-4 w-4" />, 
    label: 'Infographic', 
    color: 'rose',
    description: 'Mixed graphics, charts, and text'
  },
  PHOTO: { 
    icon: <Image className="h-4 w-4" />, 
    label: 'Photo', 
    color: 'gray',
    description: 'Photograph of real-world scene'
  },
  UNKNOWN: { 
    icon: <Image className="h-4 w-4" />, 
    label: 'Unknown', 
    color: 'gray',
    description: 'Unable to classify'
  },
};

export const ChartDescriptionViewer: React.FC<ChartDescriptionViewerProps> = ({
  description,
  imageUrl,
  showImage = true,
  expandedByDefault = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(expandedByDefault);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'description' | 'data' | 'insights'>('description');

  const typeConfig = IMAGE_TYPE_CONFIG[description.imageType] || IMAGE_TYPE_CONFIG.UNKNOWN;

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const hasData = description.dataTable && description.dataTable.length > 0;
  const hasInsights = (description.trends && description.trends.length > 0) || 
                      (description.keyFindings && description.keyFindings.length > 0);

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div 
        className="flex items-center gap-3 p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={cn(
          'p-2 rounded-lg',
          `bg-${typeConfig.color}-100 text-${typeConfig.color}-600`
        )}>
          {typeConfig.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={typeConfig.color as 'default' | 'success' | 'warning' | 'error' | 'info'}>{typeConfig.label}</Badge>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              description.confidence >= 85 ? 'bg-green-100 text-green-700' :
              description.confidence >= 70 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            )}>
              {description.confidence}%
            </span>
          </div>
          <p className="text-sm text-gray-600 truncate mt-1">{description.shortAlt}</p>
        </div>

        <div className="flex items-center gap-2">
          {hasData && (
            <Badge variant="info" className="text-xs">
              <Database className="h-3 w-3 mr-1" />
              Data
            </Badge>
          )}
          {hasInsights && (
            <Badge variant="default" className="text-xs">
              <Lightbulb className="h-3 w-3 mr-1" />
              Insights
            </Badge>
          )}
        </div>

        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {showImage && imageUrl && (
            <div className="flex justify-center bg-gray-100 rounded-lg p-2">
              <img 
                src={imageUrl} 
                alt={description.shortAlt}
                className="max-h-48 object-contain rounded"
              />
            </div>
          )}

          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('description')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px',
                activeTab === 'description' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              Description
            </button>
            {hasData && (
              <button
                onClick={() => setActiveTab('data')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px',
                  activeTab === 'data' 
                    ? 'border-primary-500 text-primary-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <Database className="h-4 w-4 inline mr-1" />
                Extracted Data
              </button>
            )}
            {hasInsights && (
              <button
                onClick={() => setActiveTab('insights')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px',
                  activeTab === 'insights' 
                    ? 'border-primary-500 text-primary-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <Lightbulb className="h-4 w-4 inline mr-1" />
                Insights
              </button>
            )}
          </div>

          {activeTab === 'description' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-500">
                    Short Alt Text ({description.shortAlt.length}/125)
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto"
                    onClick={() => handleCopy(description.shortAlt, 'short')}
                  >
                    {copiedField === 'short' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3 text-gray-400" />
                    )}
                  </Button>
                </div>
                <p className="p-2 bg-gray-50 rounded text-sm">{description.shortAlt}</p>
              </div>

              {description.longDescription && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-500">
                      Long Description ({description.longDescription.split(' ').length} words)
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto"
                      onClick={() => handleCopy(description.longDescription, 'long')}
                    >
                      {copiedField === 'long' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  <p className="p-2 bg-gray-50 rounded text-sm text-gray-700 whitespace-pre-wrap">
                    {description.longDescription}
                  </p>
                </div>
              )}

              {description.flags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {description.flags.map((flag) => (
                    <Badge key={flag} variant="default" className="text-xs">
                      {flag.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'data' && hasData && (
            <DataTableDisplay data={description.dataTable!} />
          )}

          {activeTab === 'insights' && hasInsights && (
            <InsightsDisplay 
              trends={description.trends} 
              keyFindings={description.keyFindings} 
            />
          )}

          <p className="text-xs text-gray-400 pt-2 border-t">
            Generated by {description.aiModel} • {typeConfig.description}
          </p>
        </div>
      )}
    </div>
  );
};

const DataTableDisplay: React.FC<{ data: DataTableRow[] }> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAsCSV = async () => {
    const csv = data.map(row => `${row.label},${row.values.join(',')}`).join('\n');
    try {
      await navigator.clipboard.writeText(csv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const maxCols = Math.max(...data.map(row => row.values.length));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500">
          Extracted Data ({data.length} rows)
        </p>
        <Button variant="ghost" size="sm" onClick={handleCopyAsCSV}>
          {copied ? (
            <Check className="h-3 w-3 text-green-500 mr-1" />
          ) : (
            <Copy className="h-3 w-3 mr-1" />
          )}
          Copy as CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 text-left font-medium text-gray-700 border">Label</th>
              {Array.from({ length: maxCols }).map((_, i) => (
                <th key={i} className="px-3 py-2 text-right font-medium text-gray-700 border">
                  Value {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 border font-medium">{row.label}</td>
                {Array.from({ length: maxCols }).map((_, j) => (
                  <td key={j} className="px-3 py-2 text-right border">
                    {row.values[j] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const InsightsDisplay: React.FC<{ 
  trends?: string[]; 
  keyFindings?: string[];
}> = ({ trends, keyFindings }) => {
  return (
    <div className="space-y-4">
      {trends && trends.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-medium text-gray-700">Trends</p>
          </div>
          <ul className="space-y-1">
            {trends.map((trend, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-blue-500 mt-1">•</span>
                {trend}
              </li>
            ))}
          </ul>
        </div>
      )}

      {keyFindings && keyFindings.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <p className="text-sm font-medium text-gray-700">Key Findings</p>
          </div>
          <ul className="space-y-1">
            {keyFindings.map((finding, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-yellow-500 mt-1">•</span>
                {finding}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const ChartDescriptionBadge: React.FC<{
  imageType: ImageType;
  confidence: number;
  hasData?: boolean;
  onClick?: () => void;
}> = ({ imageType, confidence, hasData, onClick }) => {
  const config = IMAGE_TYPE_CONFIG[imageType] || IMAGE_TYPE_CONFIG.UNKNOWN;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs transition-colors"
    >
      {config.icon}
      <span className="font-medium">{config.label}</span>
      <span className={cn(
        'px-1.5 py-0.5 rounded-full text-xs',
        confidence >= 85 ? 'bg-green-200 text-green-700' :
        confidence >= 70 ? 'bg-yellow-200 text-yellow-700' :
        'bg-red-200 text-red-700'
      )}>
        {confidence}%
      </span>
      {hasData && <Database className="h-3 w-3 text-blue-500" />}
    </button>
  );
};
