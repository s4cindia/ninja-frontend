import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { DocumentUploader } from '@/components/epub/EPUBUploader';
import { validateJobId } from '@/utils/validation';
import type { AuditSummary } from '@/types/audit.types';

export const PdfAccessibilityPage: React.FC = () => {
  const navigate = useNavigate();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUploadComplete = (summary: AuditSummary) => {
    // Validate jobId format to prevent path traversal
    if (!validateJobId(summary.jobId)) {
      setUploadError('Unable to process upload. Please try again or contact support.');
      return;
    }
    // Redirect to the PDF audit results page
    navigate(`/pdf/audit/${summary.jobId}`);
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Breadcrumbs items={[{ label: 'PDF Accessibility' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary-600" />
            PDF Accessibility
          </h1>
          <p className="text-gray-600 mt-1">
            Upload and audit PDF files for accessibility compliance
          </p>
        </div>
      </div>

      {uploadError && (
        <Alert variant="error" onClose={() => setUploadError(null)}>
          {uploadError}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload PDF</CardTitle>
          <CardDescription>
            Upload a PDF file to analyze its accessibility features and identify issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUploader
            onUploadComplete={handleUploadComplete}
            onError={handleUploadError}
            acceptedFileTypes={['pdf']}
            endpoints={{
              pdf: {
                directUpload: '/pdf/audit-upload',
                auditFile: '/pdf/audit-file',
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};
