import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { CheckCircle, AlertCircle, MinusCircle, XCircle } from 'lucide-react';

interface Criterion {
  conformanceLevel: string;
}

interface BatchAcrSummaryProps {
  criteria: Criterion[];
}

const KNOWN_LEVELS = ['Supports', 'Partially Supports', 'Does Not Support', 'Not Applicable'] as const;
type KnownLevel = typeof KNOWN_LEVELS[number];

export function BatchAcrSummary({ criteria }: BatchAcrSummaryProps) {
  const rawCounts = criteria.reduce(
    (acc, c) => {
      acc[c.conformanceLevel] = (acc[c.conformanceLevel] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const counts: Record<string, number> = {};
  let otherCount = 0;

  for (const [level, count] of Object.entries(rawCounts)) {
    if (KNOWN_LEVELS.includes(level as KnownLevel)) {
      counts[level] = count;
    } else {
      otherCount += count;
    }
  }

  if (otherCount > 0) {
    counts['Other'] = otherCount;
  }

  const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

  const stats = [
    {
      label: 'Supports',
      count: counts['Supports'] || 0,
      percentage: total > 0 ? Math.round(((counts['Supports'] || 0) / total) * 100) : 0,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      Icon: CheckCircle,
    },
    {
      label: 'Partially Supports',
      count: counts['Partially Supports'] || 0,
      percentage: total > 0 ? Math.round(((counts['Partially Supports'] || 0) / total) * 100) : 0,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      Icon: AlertCircle,
    },
    {
      label: 'Does Not Support',
      count: counts['Does Not Support'] || 0,
      percentage: total > 0 ? Math.round(((counts['Does Not Support'] || 0) / total) * 100) : 0,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      Icon: XCircle,
    },
    {
      label: 'Not Applicable',
      count: counts['Not Applicable'] || 0,
      percentage: total > 0 ? Math.round(((counts['Not Applicable'] || 0) / total) * 100) : 0,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      Icon: MinusCircle,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overall Compliance Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${stat.bgColor} mb-2`}
              >
                <stat.Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
              <div className="text-xs text-gray-500">{stat.percentage}%</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
