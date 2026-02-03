import { useParams, Link } from 'react-router-dom';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ReportsPage() {
  const { jobId } = useParams<{ jobId: string }>();

  if (!jobId) {
    return <ReportsListPlaceholder />;
  }

  const handleExport = (format: 'json' | 'pdf' | 'docx') => {
    console.log(`Would export job ${jobId} as ${format}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-gray-500 text-white">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Editorial Report</h2>
            <p className="text-sm text-gray-500">
              Job: <code className="bg-gray-100 px-2 py-0.5 rounded">{jobId}</code>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
            <Download className="w-4 h-4 mr-2" />
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('docx')}>
            <Download className="w-4 h-4 mr-2" />
            DOCX
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <p className="text-sm text-gray-500">
          Combined report view will aggregate citation, plagiarism, and style results.
        </p>
      </div>
    </div>
  );
}

function ReportsListPlaceholder() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-gray-500 text-white">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Editorial Reports</h2>
            <p className="text-sm text-gray-500">View and export analysis reports</p>
          </div>
        </div>
        <Link
          to="/editorial/upload"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          + New Analysis
        </Link>
      </div>
      <div className="bg-white rounded-lg border p-6 text-center">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No reports generated yet.</p>
        <p className="text-sm text-gray-400 mt-1">
          Complete an analysis to generate a combined report.
        </p>
      </div>
    </div>
  );
}

export default ReportsPage;
