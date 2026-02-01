/**
 * Example usage of PDF Audit API Service
 *
 * This file demonstrates how to use the pdfAuditApi service
 * for various PDF accessibility audit operations.
 */

/* eslint-disable react-refresh/only-export-components */

import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { pdfAuditApi, PdfApiError } from './pdfAuditApi';
import type { PdfAuditResult } from '@/types/pdf.types';

// ============================================================================
// Example 1: Upload PDF with Progress Tracking
// ============================================================================

export async function uploadPdfExample(file: File) {
  try {
    console.log('Uploading PDF...');

    const result = await pdfAuditApi.uploadPdfForAudit(file, (percentage) => {
      console.log(`Upload progress: ${percentage}%`);
      // Update UI progress bar here
    });

    console.log('Upload complete!', result);
    return result;
  } catch (error) {
    if (error instanceof PdfApiError) {
      console.error('Upload failed:', error.message, error.code);
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}

// ============================================================================
// Example 2: Check Audit Status
// ============================================================================

export async function checkAuditStatusExample(jobId: string) {
  try {
    const status = await pdfAuditApi.getAuditStatus(jobId);

    console.log(`Audit status: ${status.status}`);
    console.log(`Progress: ${status.progress}%`);

    if (status.message) {
      console.log(`Message: ${status.message}`);
    }

    return status;
  } catch (error) {
    if (error instanceof PdfApiError) {
      console.error('Failed to get status:', error.message);
    }
    throw error;
  }
}

// ============================================================================
// Example 3: Poll for Completion (Simple)
// ============================================================================

export async function pollUntilCompleteExample(jobId: string) {
  try {
    console.log('Starting audit polling...');

    const result = await pdfAuditApi.pollForCompletion(
      jobId,
      2000, // Check every 2 seconds
      300000 // Timeout after 5 minutes
    );

    console.log('Audit completed!', result);
    return result;
  } catch (error) {
    if (error instanceof PdfApiError) {
      if (error.code === 'POLLING_TIMEOUT') {
        console.error('Audit took too long to complete');
      } else if (error.code === 'AUDIT_FAILED') {
        console.error('Audit failed:', error.message);
      } else {
        console.error('Polling error:', error.message);
      }
    }
    throw error;
  }
}

// ============================================================================
// Example 4: Cancellable Polling with React
// ============================================================================

export function useCancellablePolling(jobId: string) {
  const [result, setResult] = useState<PdfAuditResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Reset state when jobId changes
    setResult(null);
    setError(null);
    setIsLoading(true);

    const { promise, abort } = pdfAuditApi.createCancellablePolling(jobId, 2000, 300000);
    abortRef.current = abort;

    promise
      .then((auditResult) => {
        setResult(auditResult);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });

    return () => {
      // Cancel polling when component unmounts
      if (abortRef.current) {
        abortRef.current();
      }
    };
  }, [jobId]);

  return { result, error, isLoading };
}

// ============================================================================
// Example 5: Complete Upload and Audit Workflow
// ============================================================================

export async function completeAuditWorkflowExample(file: File) {
  try {
    // Step 1: Upload file
    console.log('Step 1: Uploading PDF...');
    const { jobId } = await pdfAuditApi.uploadPdfForAudit(file, (percentage) => {
      console.log(`Upload: ${percentage}%`);
    });

    console.log(`Job created: ${jobId}`);

    // Step 2: Poll for completion
    console.log('Step 2: Waiting for audit to complete...');
    const result = await pdfAuditApi.pollForCompletion(jobId);

    console.log('Step 3: Audit complete!');
    console.log(`Score: ${result.score}`);
    console.log(`Issues found: ${result.issues.length}`);

    return result;
  } catch (error) {
    if (error instanceof PdfApiError) {
      console.error('Audit workflow failed:', error.message, error.code);
    }
    throw error;
  }
}

// ============================================================================
// Example 6: Get Audit Result
// ============================================================================

export async function getAuditResultExample(jobId: string) {
  try {
    const result = await pdfAuditApi.getAuditResult(jobId);

    console.log('Audit Result:');
    console.log(`  File: ${result.fileName}`);
    console.log(`  Pages: ${result.pageCount}`);
    console.log(`  Score: ${result.score}`);
    console.log(`  Issues: ${result.issues.length}`);
    console.log(`  Matterhorn Passed: ${result.matterhornSummary.passed}`);
    console.log(`  Matterhorn Failed: ${result.matterhornSummary.failed}`);

    return result;
  } catch (error) {
    if (error instanceof PdfApiError) {
      console.error('Failed to get result:', error.message);
    }
    throw error;
  }
}

// ============================================================================
// Example 7: Download ACR Report
// ============================================================================

export async function downloadAcrReportExample(jobId: string) {
  try {
    // Get JSON format
    const jsonReport = await pdfAuditApi.getAcrReport(jobId, 'json');
    console.log('ACR Report (JSON):', jsonReport);

    // Get HTML format
    const htmlReport = await pdfAuditApi.getAcrReport(jobId, 'html');
    console.log('ACR Report (HTML):', htmlReport);

    return { json: jsonReport, html: htmlReport };
  } catch (error) {
    if (error instanceof PdfApiError) {
      console.error('Failed to get ACR report:', error.message);
    }
    throw error;
  }
}

// ============================================================================
// Example 8: Download Report as PDF/DOCX
// ============================================================================

export async function downloadReportFileExample(jobId: string, format: 'pdf' | 'docx' = 'pdf') {
  try {
    console.log(`Downloading ${format.toUpperCase()} report...`);

    const blob = await pdfAuditApi.downloadReport(jobId, format);

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${jobId}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Download complete!');
  } catch (error) {
    if (error instanceof PdfApiError) {
      console.error('Download failed:', error.message);
    }
    throw error;
  }
}

// ============================================================================
// Example 9: List All Audits with Pagination
// ============================================================================

export async function listAuditsExample(page: number = 1, limit: number = 20) {
  try {
    const response = await pdfAuditApi.listAudits(page, limit);

    if (response.success) {
      console.log(`Total audits: ${response.pagination.total}`);
      console.log(`Page: ${response.pagination.page} of ${Math.ceil(response.pagination.total / response.pagination.limit)}`);
      console.log(`Audits on this page: ${response.data.length}`);

      response.data.forEach((audit, index) => {
        console.log(`  ${index + 1}. ${audit.fileName} (Score: ${audit.score})`);
      });

      return response;
    } else {
      console.error('Failed to list audits:', response.error);
      return null;
    }
  } catch (error) {
    if (error instanceof PdfApiError) {
      console.error('Failed to list audits:', error.message);
    }
    throw error;
  }
}

// ============================================================================
// Example 10: Delete Audit
// ============================================================================

export async function deleteAuditExample(jobId: string) {
  try {
    console.log(`Deleting audit ${jobId}...`);
    await pdfAuditApi.deleteAudit(jobId);
    console.log('Audit deleted successfully');
  } catch (error) {
    if (error instanceof PdfApiError) {
      console.error('Delete failed:', error.message, error.code);
    }
    throw error;
  }
}

// ============================================================================
// Example 11: Error Handling Pattern
// ============================================================================

export async function errorHandlingExample(jobId: string) {
  try {
    const result = await pdfAuditApi.getAuditResult(jobId);
    return result;
  } catch (error) {
    if (error instanceof PdfApiError) {
      // Handle specific error codes
      switch (error.code) {
        case 'NOT_FOUND':
          console.error('Audit not found');
          // Redirect to upload page
          break;

        case 'UNAUTHORIZED':
          console.error('Not authorized');
          // Redirect to login
          break;

        case 'POLLING_TIMEOUT':
          console.error('Audit is taking longer than expected');
          // Show retry option
          break;

        case 'AUDIT_FAILED':
          console.error('Audit failed:', error.message);
          // Show error details to user
          break;

        default:
          console.error('Unknown error:', error.message);
      }

      // Access additional error details
      if (error.details) {
        console.error('Error details:', error.details);
      }
    } else {
      console.error('Unexpected error:', error);
    }

    throw error;
  }
}

// ============================================================================
// Example 12: React Component Integration
// ============================================================================

export function PdfAuditComponent() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<PdfAuditResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      // Upload file
      const { jobId: newJobId } = await pdfAuditApi.uploadPdfForAudit(file, (percentage) => {
        setUploadProgress(percentage);
      });

      setJobId(newJobId);

      // Poll for completion
      const auditResult = await pdfAuditApi.pollForCompletion(newJobId);
      setResult(auditResult);
    } catch (err) {
      if (err instanceof PdfApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (format: 'pdf' | 'docx') => {
    if (!jobId) return;

    try {
      const blob = await pdfAuditApi.downloadReport(jobId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-report-${jobId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof PdfApiError) {
        setError(err.message);
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div>
      {/* File upload UI */}
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {/* Progress bar */}
      {isUploading && (
        <div>
          <div style={{ width: `${uploadProgress}%` }}>Upload: {uploadProgress}%</div>
        </div>
      )}

      {/* Error message */}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      {/* Results */}
      {result && (
        <div>
          <h2>{result.fileName}</h2>
          <p>Score: {result.score}</p>
          <p>Issues: {result.issues.length}</p>
          <button onClick={() => handleDownload('pdf')}>Download PDF Report</button>
          <button onClick={() => handleDownload('docx')}>Download DOCX Report</button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Example 13: Batch Processing Multiple PDFs
// ============================================================================

export async function batchProcessExample(files: File[]) {
  const results = [];

  for (const file of files) {
    try {
      console.log(`Processing ${file.name}...`);

      const { jobId } = await pdfAuditApi.uploadPdfForAudit(file);
      const result = await pdfAuditApi.pollForCompletion(jobId);

      results.push({
        fileName: file.name,
        success: true,
        result,
      });
    } catch (error) {
      results.push({
        fileName: file.name,
        success: false,
        error: error instanceof PdfApiError ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
