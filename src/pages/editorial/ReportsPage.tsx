import { FileText } from 'lucide-react';

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-gray-500 text-white">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
              <p className="text-sm text-gray-500">View and export analysis reports</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-medium text-gray-900">Recent Reports</h3>
        </div>
        <div className="p-8 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Yet</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Complete an analysis to generate reports. Reports can be exported in
            PDF, DOCX, and CSV formats.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
