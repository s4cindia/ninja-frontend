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

  const navigateToResults = (jobId: string) => {
    // Validate jobId format to prevent path traversal
    if (!validateJobId(jobId)) {
      setUploadError('Unable to process upload. Please try again or contact support.');
      return;
    }
    // Redirect to the PDF audit results page
    navigate(`/pdf/audit/${jobId}`);
  };

  const handleUploadComplete = (summary: AuditSummary) => navigateToResults(summary.jobId);

  // Fires as soon as the job exists (right after upload, before the audit
  // itself has even started) -- navigating here rather than waiting for
  // handleUploadComplete removes the window where a browser refresh on
  // this page (pure component state, no job ID in the URL) loses the
  // completed-audit view entirely. /pdf/audit/:jobId is fully
  // URL/API-driven and shows its own live progress for a still-running job.
  const handleJobCreated = (jobId: string) => navigateToResults(jobId);

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
            onJobCreated={handleJobCreated}
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
