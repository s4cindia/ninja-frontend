import { useParams, Link } from 'react-router-dom';
import { CheckSquare, FileText, Upload, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function StylePage() {
  const { jobId } = useParams<{ jobId: string }>();

  if (!jobId) {
    return <StyleLandingPage />;
  }

  // Redirect to documents - style validation happens in the editor
  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-lg bg-green-500 text-white">
          <CheckSquare className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Style Validation</h2>
          <p className="text-sm text-gray-500">
            Job ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{jobId}</code>
          </p>
        </div>
      </div>
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          Style validation is now integrated into the document editor. Open your document in the editor
          and use the <strong>Style Check</strong> button to run validation.
        </p>
      </div>
      <div className="mt-4">
        <Link to="/validator/upload">
          <Button variant="primary" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Open Validator
          </Button>
        </Link>
      </div>
    </div>
  );
}

function StyleLandingPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-green-500 text-white">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Style Validation</h2>
            <p className="text-sm text-gray-500">
              Check documents against Chicago, APA, MLA, and custom house styles
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">How Style Validation Works</h3>

        <div className="grid md:grid-cols-2 gap-6">
          {/* For DOCX */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-blue-600">
              <FileText className="w-5 h-5" />
              <span className="font-medium">DOCX Documents</span>
            </div>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2 ml-2">
              <li>Upload your DOCX file in the Validator</li>
              <li>Open the document in the editor</li>
              <li>Click <strong>Style Check</strong> in the toolbar</li>
              <li>Review violations with suggested fixes</li>
              <li>Click <strong>Apply Fix</strong> to accept suggestions</li>
              <li>Changes appear with track changes for review</li>
            </ol>
            <p className="text-xs text-gray-500 mt-2">
              Supports: Accept/reject individual fixes, bulk actions, export edited document
            </p>
          </div>

          {/* For PDF */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-600">
              <FileText className="w-5 h-5" />
              <span className="font-medium">PDF Documents</span>
            </div>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2 ml-2">
              <li>Upload your PDF file in the Validator</li>
              <li>Open the document in the PDF viewer</li>
              <li>Click <strong>Style Check</strong> in the toolbar</li>
              <li>Review violations with page numbers</li>
              <li>Click <strong>Go to Location</strong> to navigate to the issue</li>
              <li>Note issues for manual correction in source document</li>
            </ol>
            <p className="text-xs text-gray-500 mt-2">
              Note: PDFs are read-only. Export the issues list for offline correction.
            </p>
          </div>
        </div>
      </Card>

      {/* Supported Style Guides */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Supported Style Guides</h3>
        <div className="flex flex-wrap gap-2">
          {['Chicago', 'APA', 'MLA', 'AP', 'Vancouver', 'IEEE', 'Nature', 'Elsevier', 'Custom House Rules'].map((style) => (
            <span
              key={style}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
            >
              {style}
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Validation includes punctuation, capitalization, grammar, terminology, numbers,
          abbreviations, hyphenation, and formatting rules.
        </p>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Link to="/validator/upload">
          <Button variant="primary">
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </Link>
        <Link to="/editorial/documents">
          <Button variant="outline">
            <ExternalLink className="w-4 h-4 mr-2" />
            View Documents
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default StylePage;
