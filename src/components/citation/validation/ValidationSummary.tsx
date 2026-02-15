import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { ValidationSummary as ValidationSummaryType } from '@/types/citation-validation.types';

interface ValidationSummaryProps {
  data: ValidationSummaryType;
}

export function ValidationSummary({ data }: ValidationSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <span className="text-blue-600 font-semibold">#</span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-semibold">{data.totalCitations}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Valid</p>
            <p className="text-2xl font-semibold text-green-600">{data.validCitations}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg">
            <XCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Errors</p>
            <p className="text-2xl font-semibold text-red-600">{data.errorCount}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Warnings</p>
            <p className="text-2xl font-semibold text-yellow-600">{data.warningCount}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
