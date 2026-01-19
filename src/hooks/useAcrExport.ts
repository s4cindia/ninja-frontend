import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { jsPDF } from 'jspdf';
import { api } from '@/services/api';
import type { ExportOptions, ExportResult, ExportFormat } from '@/types/acr.types';

interface ApiResponse {
  success: boolean;
  data: ExportResult;
}

async function exportAcr(acrId: string, options: ExportOptions): Promise<ExportResult> {
  const cleanId = acrId.replace(/^acr-/, '');
  const response = await api.post<ApiResponse>(`/acr/${cleanId}/export`, {
    options: {
      format: options.format,
      includeMethodology: options.includeMethodology,
      includeAttribution: options.includeAttributionTags,
    },
  });
  return response.data.data;
}

function triggerBase64Download(content: string, filename: string, format: string): void {
  try {
    const byteArray = Uint8Array.from(atob(content), c => c.charCodeAt(0));
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      html: 'text/html',
    };
    const blob = new Blob([byteArray], { type: mimeTypes[format] || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('Failed to decode and download file:', error);
    throw new Error('Failed to process the exported file. The file content may be corrupted.');
  }
}

export function useExportAcr() {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<Error | null>(null);

  const mutation = useMutation({
    mutationFn: ({ acrId, options }: { acrId: string; options: ExportOptions }) =>
      exportAcr(acrId, options),
    onSuccess: (data) => {
      setDownloadError(null);
      try {
        triggerBase64Download(data.content, data.filename, data.format);
        setDownloadUrl(data.downloadUrl);
        setFilename(data.filename);
      } catch (error) {
        setDownloadUrl(null);
        setFilename(null);
        setDownloadError(error instanceof Error ? error : new Error('Download failed'));
      }
    },
  });

  const doExport = async (acrId: string, options: ExportOptions): Promise<ExportResult> => {
    return mutation.mutateAsync({ acrId, options });
  };

  const reset = useCallback(() => {
    setDownloadUrl(null);
    setFilename(null);
    setDownloadError(null);
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const combinedError = mutation.error || downloadError;

  return {
    exportAcr: doExport,
    isExporting: mutation.isPending,
    downloadUrl,
    filename,
    error: combinedError,
    reset,
  };
}

function generatePdfDocument(options: ExportOptions): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;
  const lineHeight = 7;
  const margin = 20;
  
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Accessibility Conformance Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('VPAT 2.5 - Section 508 Edition', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Product Information', margin, yPosition);
  yPosition += lineHeight * 1.5;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Product Name: ACR Document', margin, yPosition);
  yPosition += lineHeight;
  doc.text(`Report Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += lineHeight * 2;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('VPAT Version and Standards', margin, yPosition);
  yPosition += lineHeight * 1.5;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Version: VPAT 2.5', margin, yPosition);
  yPosition += lineHeight;
  doc.text('Standards: Section 508, WCAG 2.1 Level AA', margin, yPosition);
  yPosition += lineHeight * 2;
  
  if (options.includeMethodology) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Evaluation Methodology', margin, yPosition);
    yPosition += lineHeight * 1.5;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const methodology = 'This report was generated using automated accessibility testing tools combined with manual expert review. The evaluation covers WCAG 2.1 Level A and AA success criteria.';
    const splitMethodology = doc.splitTextToSize(methodology, pageWidth - margin * 2);
    doc.text(splitMethodology, margin, yPosition);
    yPosition += lineHeight * (splitMethodology.length + 1);
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Conformance Results Summary', margin, yPosition);
  yPosition += lineHeight * 1.5;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Criteria evaluated according to WCAG 2.1 guidelines.', margin, yPosition);
  yPosition += lineHeight;
  doc.text('Conformance levels: Supports, Partially Supports, Does Not Support, Not Applicable', margin, yPosition);
  yPosition += lineHeight * 2;
  
  if (options.includeAttributionTags) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Attribution', margin, yPosition);
    yPosition += lineHeight * 1.5;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('AUTOMATED - Generated by automated testing tools', margin, yPosition);
    yPosition += lineHeight;
    doc.text('AI-SUGGESTED - Generated with AI assistance', margin, yPosition);
    yPosition += lineHeight;
    doc.text('HUMAN-VERIFIED - Reviewed and confirmed by accessibility expert', margin, yPosition);
    yPosition += lineHeight * 2;
  }
  
  if (options.includeLegalDisclaimer) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Legal Disclaimer', margin, yPosition);
    yPosition += lineHeight * 1.5;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const disclaimer = 'This Accessibility Conformance Report is provided for informational purposes only. The assessments contained herein represent the state of the product at the time of evaluation. Accessibility compliance may vary based on configuration, usage context, and assistive technology combinations.';
    const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - margin * 2);
    doc.text(splitDisclaimer, margin, yPosition);
  }
  
  if (options.branding?.companyName) {
    doc.setFontSize(8);
    doc.text(`Prepared by: ${options.branding.companyName}`, margin, doc.internal.pageSize.getHeight() - 10);
  }
  
  return doc.output('blob');
}

function generateHtmlDocument(options: ExportOptions): Blob {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Conformance Report</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
    th { background-color: #f3f4f6; }
    .supports { color: #059669; }
    .partial { color: #d97706; }
    .not-support { color: #dc2626; }
    footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 0.875rem; color: #6b7280; }
  </style>
</head>
<body>
  <h1>Accessibility Conformance Report</h1>
  <p><strong>VPAT 2.5 - Section 508 Edition</strong></p>
  <p>Report Date: ${new Date().toLocaleDateString()}</p>
  
  <h2>Product Information</h2>
  <p>This report documents the accessibility conformance of the evaluated product.</p>
  
  <h2>Standards and Guidelines</h2>
  <ul>
    <li>Section 508 of the Rehabilitation Act</li>
    <li>WCAG 2.1 Level A and AA</li>
  </ul>
  
  ${options.includeMethodology ? `
  <h2>Evaluation Methodology</h2>
  <p>This report was generated using automated accessibility testing tools combined with manual expert review. The evaluation covers WCAG 2.1 Level A and AA success criteria.</p>
  ` : ''}
  
  <h2>Conformance Results Summary</h2>
  <p>Criteria were evaluated according to WCAG 2.1 guidelines.</p>
  
  ${options.includeAttributionTags ? `
  <h2>Attribution Key</h2>
  <ul>
    <li><strong>AUTOMATED</strong> - Generated by automated testing tools</li>
    <li><strong>AI-SUGGESTED</strong> - Generated with AI assistance</li>
    <li><strong>HUMAN-VERIFIED</strong> - Reviewed and confirmed by accessibility expert</li>
  </ul>
  ` : ''}
  
  ${options.includeLegalDisclaimer ? `
  <h2>Legal Disclaimer</h2>
  <p><small>This Accessibility Conformance Report is provided for informational purposes only. The assessments contained herein represent the state of the product at the time of evaluation. Accessibility compliance may vary based on configuration, usage context, and assistive technology combinations.</small></p>
  ` : ''}
  
  <footer>
    ${options.branding?.companyName ? `<p>Prepared by: ${options.branding.companyName}</p>` : ''}
    <p>Generated on ${new Date().toISOString()}</p>
  </footer>
</body>
</html>`;

  return new Blob([html], { type: 'text/html' });
}

function generateDocxDocument(options: ExportOptions): Blob {
  const content = `Accessibility Conformance Report
VPAT 2.5 - Section 508 Edition
Report Date: ${new Date().toLocaleDateString()}

PRODUCT INFORMATION
This report documents the accessibility conformance of the evaluated product.

STANDARDS AND GUIDELINES
- Section 508 of the Rehabilitation Act
- WCAG 2.1 Level A and AA

${options.includeMethodology ? `EVALUATION METHODOLOGY
This report was generated using automated accessibility testing tools combined with manual expert review. The evaluation covers WCAG 2.1 Level A and AA success criteria.

` : ''}CONFORMANCE RESULTS SUMMARY
Criteria were evaluated according to WCAG 2.1 guidelines.

${options.includeAttributionTags ? `ATTRIBUTION KEY
- AUTOMATED: Generated by automated testing tools
- AI-SUGGESTED: Generated with AI assistance  
- HUMAN-VERIFIED: Reviewed and confirmed by accessibility expert

` : ''}${options.includeLegalDisclaimer ? `LEGAL DISCLAIMER
This Accessibility Conformance Report is provided for informational purposes only. The assessments contained herein represent the state of the product at the time of evaluation.

` : ''}${options.branding?.companyName ? `Prepared by: ${options.branding.companyName}
` : ''}Generated on ${new Date().toISOString()}`;

  return new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function useMockExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  const exportAcr = async (_acrId: string, options: ExportOptions): Promise<ExportResult> => {
    setIsExporting(true);
    setDownloadUrl(null);
    setFilename(null);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const formatExtensions: Record<ExportFormat, string> = {
      docx: '.docx',
      pdf: '.pdf',
      html: '.html',
    };

    let blob: Blob;
    switch (options.format) {
      case 'pdf':
        blob = generatePdfDocument(options);
        break;
      case 'html':
        blob = generateHtmlDocument(options);
        break;
      case 'docx':
        blob = generateDocxDocument(options);
        break;
      default:
        blob = generatePdfDocument(options);
    }

    const generatedFilename = `ACR_Report_${new Date().toISOString().split('T')[0]}${formatExtensions[options.format]}`;
    
    triggerDownload(blob, generatedFilename);

    const result: ExportResult = {
      downloadUrl: '#downloaded',
      filename: generatedFilename,
      format: options.format,
      size: blob.size,
      content: '',
    };

    setDownloadUrl(result.downloadUrl);
    setFilename(result.filename);
    setIsExporting(false);

    return result;
  };

  const reset = useCallback(() => {
    setDownloadUrl(null);
    setFilename(null);
    setIsExporting(false);
  }, []);

  return {
    exportAcr,
    isExporting,
    downloadUrl,
    filename,
    error: null,
    reset,
  };
}
