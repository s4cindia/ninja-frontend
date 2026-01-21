import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { CheckCircle, AlertCircle, MinusCircle, XCircle } from 'lucide-react';

interface Criterion {
  conformanceLevel: string;
}

interface BatchAcrSummaryProps {
  criteria: Criterion[];
}

export function BatchAcrSummary({ criteria }: BatchAcrSummaryProps) {
  const counts = criteria.reduce(
    (acc, c) => {
      acc[c.conformanceLevel] = (acc[c.conformanceLevel] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const total = criteria.length;

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
