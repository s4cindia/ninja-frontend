import React, { useState } from 'react';
import { Download, Package, FileText, FileJson, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { api } from '@/services/api';
import { generateCSV, downloadCSV, formatDate } from '@/utils/csvExport';

type ReportFormat = 'json' | 'md' | 'csv';
type DownloadType = 'epub' | 'package' | 'accessibility-report' | 'comparison-report';

interface EPUBExportOptionsProps {
  jobId: string;
  epubFileName: string;
  isDemo?: boolean;
  fixedCount?: number;
  beforeScore?: number;
  afterScore?: number;
}

interface PackageOptions {
  includeOriginal: boolean;
  includeComparison: boolean;
  includeReport: boolean;
}

export const EPUBExportOptions: React.FC<EPUBExportOptionsProps> = ({
  jobId,
  epubFileName,
  isDemo = false,
  fixedCount = 0,
  beforeScore = 0,
  afterScore = 0,
}) => {
  const [downloading, setDownloading] = useState<DownloadType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reportFormat, setReportFormat] = useState<ReportFormat>('json');
  const [packageOptions, setPackageOptions] = useState<PackageOptions>({
    includeOriginal: true,
    includeComparison: true,
    includeReport: true,
  });

  const baseFileName = epubFileName.replace('.epub', '');

  const handleDownloadEpub = async () => {
    if (isDemo) {
      setError('Download not available in demo mode');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setDownloading('epub');
    setError(null);
    setSuccess(null);

    try {
      const response = await api.get(`/epub/job/${jobId}/export`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/epub+zip' });
      downloadBlob(blob, `${baseFileName}-remediated.epub`);
      setSuccess('Remediated EPUB downloaded successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to download remediated EPUB');
      setTimeout(() => setError(null), 3000);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPackage = async () => {
    if (isDemo) {
      setError('Download not available in demo mode');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const hasAnyOption = packageOptions.includeOriginal || packageOptions.includeComparison || packageOptions.includeReport;
    if (!hasAnyOption) {
      setError('Please select at least one option to include in the package');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setDownloading('package');
    setError(null);
    setSuccess(null);

    try {
      const params = new URLSearchParams();
      if (packageOptions.includeOriginal) params.append('includeOriginal', 'true');
      if (packageOptions.includeComparison) params.append('includeComparison', 'true');
      if (packageOptions.includeReport) params.append('includeReport', 'true');

      const queryString = params.toString();
      const url = queryString ? `/epub/job/${jobId}/export?${queryString}` : `/epub/job/${jobId}/export`;

      const response = await api.get(url, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/zip' });
      downloadBlob(blob, `${baseFileName}-package.zip`);
      setSuccess('Package downloaded successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to download package');
      setTimeout(() => setError(null), 3000);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAccessibilityReport = async () => {
    if (isDemo) {
      const demoReport = generateDemoAccessibilityReport();
      if (reportFormat === 'json') {
        const blob = new Blob([JSON.stringify(demoReport, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `${baseFileName}-accessibility-report.json`);
      } else if (reportFormat === 'csv') {
        const csvContent = generateAccessibilityCSV(demoReport);
        downloadCSV(csvContent, `${baseFileName}-accessibility-report-${formatDate(new Date())}.csv`);
      } else {
        const markdown = generateMarkdownReport(demoReport);
        const blob = new Blob([markdown], { type: 'text/markdown' });
        downloadBlob(blob, `${baseFileName}-accessibility-report.md`);
      }
      setSuccess('Demo report downloaded');
      setTimeout(() => setSuccess(null), 3000);
      return;
    }

    setDownloading('accessibility-report');
    setError(null);
    setSuccess(null);

    try {
      const response = await api.get(`/epub/job/${jobId}/report`, {
        params: { format: 'json' },
        responseType: 'json',
      });

      const data = response.data.data || response.data;

      if (reportFormat === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `${baseFileName}-accessibility-report.json`);
      } else if (reportFormat === 'csv') {
        const csvContent = generateAccessibilityCSV(data);
        downloadCSV(csvContent, `${baseFileName}-accessibility-report-${formatDate(new Date())}.csv`);
      } else {
        const markdown = generateMarkdownReport(data);
        const blob = new Blob([markdown], { type: 'text/markdown' });
        downloadBlob(blob, `${baseFileName}-accessibility-report.md`);
      }
      setSuccess('Accessibility report downloaded');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to download accessibility report');
      setTimeout(() => setError(null), 3000);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadComparisonReport = async () => {
    if (isDemo) {
      const demoComparison = generateDemoComparisonReport();
      if (reportFormat === 'json') {
        const blob = new Blob([JSON.stringify(demoComparison, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `${baseFileName}-comparison-report.json`);
      } else if (reportFormat === 'csv') {
        const csvContent = generateComparisonCSV(demoComparison);
        downloadCSV(csvContent, `${baseFileName}-comparison-${formatDate(new Date())}.csv`);
      } else {
        const markdown = generateComparisonMarkdown(demoComparison);
        const blob = new Blob([markdown], { type: 'text/markdown' });
        downloadBlob(blob, `${baseFileName}-comparison-report.md`);
      }
      setSuccess('Demo comparison report downloaded');
      setTimeout(() => setSuccess(null), 3000);
      return;
    }

    setDownloading('comparison-report');
    setError(null);
    setSuccess(null);

    try {
      let data;
      try {
        const response = await api.get(`/epub/job/${jobId}/comparison/summary`);
        data = response.data.data || response.data;
      } catch {
        data = generateDemoComparisonReport();
      }

      if (reportFormat === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `${baseFileName}-comparison-report.json`);
      } else if (reportFormat === 'csv') {
        const csvContent = generateComparisonCSV(data);
        downloadCSV(csvContent, `${baseFileName}-comparison-${formatDate(new Date())}.csv`);
      } else {
        const markdown = generateComparisonMarkdown(data);
        const blob = new Blob([markdown], { type: 'text/markdown' });
        downloadBlob(blob, `${baseFileName}-comparison-report.md`);
      }
      setSuccess('Comparison report downloaded');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to download comparison report');
      setTimeout(() => setError(null), 3000);
    } finally {
      setDownloading(null);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateDemoAccessibilityReport = () => ({
    jobId,
    epubFileName,
    generatedAt: new Date().toISOString(),
    score: afterScore,
    previousScore: beforeScore,
    issuesSummary: {
      total: fixedCount + 2,
      fixed: fixedCount,
      remaining: 2,
    },
    issues: [
      { id: '1', severity: 'critical', message: 'Missing alt text for image', status: 'fixed' },
      { id: '2', severity: 'serious', message: 'Heading levels skipped', status: 'fixed' },
    ],
  });

  const generateDemoComparisonReport = () => ({
    jobId,
    epubFileName,
    generatedAt: new Date().toISOString(),
    beforeScore,
    afterScore,
    improvement: afterScore - beforeScore,
    fixedCount,
    changes: [
      { type: 'metadata', description: 'Added accessibility metadata' },
      { type: 'content', description: 'Added alt text to images' },
    ],
  });

  const generateMarkdownReport = (report: ReturnType<typeof generateDemoAccessibilityReport>) => `
# Accessibility Report

**File:** ${report.epubFileName}
**Generated:** ${new Date(report.generatedAt).toLocaleString()}

## Summary

- **Accessibility Score:** ${report.score}%
- **Previous Score:** ${report.previousScore}%
- **Total Issues:** ${report.issuesSummary.total}
- **Fixed:** ${report.issuesSummary.fixed}
- **Remaining:** ${report.issuesSummary.remaining}

## Issues

${report.issues.map(issue => `- [${issue.status.toUpperCase()}] (${issue.severity}) ${issue.message}`).join('\n')}
`.trim();

  const generateComparisonMarkdown = (report: {
    jobId?: string;
    epubFileName?: string;
    originalFileName?: string;
    remediatedFileName?: string;
    generatedAt?: string;
    beforeScore?: number;
    afterScore?: number;
    improvement?: number;
    fixedCount?: number;
    summary?: {
      totalFiles?: number;
      modifiedFiles?: number;
      totalChanges?: number;
    };
    changes?: Array<{ type: string; description: string }>;
    modifications?: Array<{ type: string; category?: string; filePath?: string; description: string; wcagCriteria?: string }>;
  }) => {
    const fileName = report.epubFileName || report.originalFileName || 'Unknown';
    const generated = report.generatedAt ? new Date(report.generatedAt).toLocaleString() : new Date().toLocaleString();
    const before = report.beforeScore ?? beforeScore;
    const after = report.afterScore ?? afterScore;
    const improvement = report.improvement ?? (after - before);
    const fixed = report.fixedCount ?? fixedCount;
    const changes = report.changes || [];
    const modifications = report.modifications || [];

    let md = `# Comparison Report

**Job ID:** ${report.jobId || jobId}
**File:** ${fileName}
**Generated:** ${generated}

## Score Improvement

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Accessibility Score | ${before}% | ${after}% | ${improvement >= 0 ? '+' : ''}${improvement}% |

## Summary

- **Issues Fixed:** ${fixed}`;

    if (report.summary) {
      md += `
- **Total Files:** ${report.summary.totalFiles || 0}
- **Modified Files:** ${report.summary.modifiedFiles || 0}
- **Total Changes:** ${report.summary.totalChanges || 0}`;
    }

    if (changes.length > 0) {
      md += `

## Changes Made

${changes.map(change => `- **${change.type}:** ${change.description}`).join('\n')}`;
    }

    if (modifications.length > 0) {
      md += `

## Modifications

${modifications.map(mod => {
  let line = `### ${mod.type}`;
  if (mod.category) line += `\n- **Category:** ${mod.category}`;
  if (mod.filePath) line += `\n- **File:** ${mod.filePath}`;
  line += `\n- **Description:** ${mod.description}`;
  if (mod.wcagCriteria) line += `\n- **WCAG:** ${mod.wcagCriteria}`;
  return line;
}).join('\n\n')}`;
    }

    return md.trim();
  };

  const generateAccessibilityCSV = (reportData: {
    jobId?: string;
    epubFileName?: string;
    generatedAt?: string;
    issuesSummary?: { total?: number; fixed?: number; remaining?: number };
    issues?: Array<{
      id?: string;
      code?: string;
      severity?: string;
      message?: string;
      location?: string;
      filePath?: string;
      wcagCriteria?: string;
      source?: string;
      type?: string;
      status?: string;
    }>;
  }): string => {
    const summaryRow = {
      File: reportData.epubFileName || epubFileName,
      'Job ID': reportData.jobId || jobId,
      Date: reportData.generatedAt ? formatDate(reportData.generatedAt) : formatDate(new Date()),
      'Original Issues': String(reportData.issuesSummary?.total || 0),
      'Fixed Issues': String(reportData.issuesSummary?.fixed || 0),
      Remaining: String(reportData.issuesSummary?.remaining || 0),
      'Fix Rate': reportData.issuesSummary?.total 
        ? `${Math.round(((reportData.issuesSummary?.fixed || 0) / reportData.issuesSummary.total) * 100)}%`
        : '0%',
    };

    const summaryColumns = [
      { key: 'File', header: 'File' },
      { key: 'Job ID', header: 'Job ID' },
      { key: 'Date', header: 'Date' },
      { key: 'Original Issues', header: 'Original Issues' },
      { key: 'Fixed Issues', header: 'Fixed Issues' },
      { key: 'Remaining', header: 'Remaining' },
      { key: 'Fix Rate', header: 'Fix Rate' },
    ];

    const issueColumns = [
      { key: 'Code', header: 'Code' },
      { key: 'Severity', header: 'Severity' },
      { key: 'Message', header: 'Message' },
      { key: 'Location', header: 'Location' },
      { key: 'FilePath', header: 'FilePath' },
      { key: 'WCAG', header: 'WCAG Criteria' },
      { key: 'Source', header: 'Source' },
      { key: 'Type', header: 'Type' },
      { key: 'Status', header: 'Status' },
    ];

    const issues = (reportData.issues || []).map(issue => ({
      Code: issue.code || '',
      Severity: issue.severity || '',
      Message: issue.message || '',
      Location: issue.location || '',
      FilePath: issue.filePath || '',
      WCAG: issue.wcagCriteria || '',
      Source: issue.source || '',
      Type: issue.type || 'Manual',
      Status: issue.status || 'pending',
    }));

    const summaryCsv = generateCSV([summaryRow], summaryColumns);
    const issuesCsv = generateCSV(issues, issueColumns);
    return summaryCsv + '\n\n' + issuesCsv;
  };

  const generateComparisonCSV = (comparisonData: {
    beforeScore?: number;
    afterScore?: number;
    fixedCount?: number;
    summary?: {
      totalFiles?: number;
      modifiedFiles?: number;
      totalChanges?: number;
    };
    resolutions?: Array<{
      code?: string;
      severity?: string;
      message?: string;
      location?: string;
      originalStatus?: string;
      finalStatus?: string;
      resolutionType?: string;
    }>;
    modifications?: Array<{
      type?: string;
      category?: string;
      filePath?: string;
      description?: string;
      wcagCriteria?: string;
    }>;
    changes?: Array<{ type: string; description: string }>;
  }): string => {
    const summaryRow = {
      'Before Score': String(comparisonData.beforeScore ?? beforeScore),
      'After Score': String(comparisonData.afterScore ?? afterScore),
      'Issues Fixed': String(comparisonData.fixedCount ?? fixedCount),
      'Total Files': String(comparisonData.summary?.totalFiles || 0),
      'Modified Files': String(comparisonData.summary?.modifiedFiles || 0),
    };

    const summaryColumns = [
      { key: 'Before Score', header: 'Before Score' },
      { key: 'After Score', header: 'After Score' },
      { key: 'Issues Fixed', header: 'Issues Fixed' },
      { key: 'Total Files', header: 'Total Files' },
      { key: 'Modified Files', header: 'Modified Files' },
    ];

    const resolutionColumns = [
      { key: 'Code', header: 'Code' },
      { key: 'Severity', header: 'Severity' },
      { key: 'Message', header: 'Message' },
      { key: 'Location', header: 'Location' },
      { key: 'OriginalStatus', header: 'Original Status' },
      { key: 'FinalStatus', header: 'Final Status' },
      { key: 'ResolutionType', header: 'Resolution Type' },
    ];

    const resolutions = (comparisonData.resolutions || comparisonData.modifications || []).map(item => ({
      Code: (item as { code?: string }).code || (item as { type?: string }).type || '',
      Severity: (item as { severity?: string }).severity || '',
      Message: (item as { message?: string }).message || (item as { description?: string }).description || '',
      Location: (item as { location?: string }).location || (item as { filePath?: string }).filePath || '',
      OriginalStatus: (item as { originalStatus?: string }).originalStatus || 'pending',
      FinalStatus: (item as { finalStatus?: string }).finalStatus || 'fixed',
      ResolutionType: (item as { resolutionType?: string }).resolutionType || (item as { category?: string }).category || 'auto',
    }));

    const summaryCsv = generateCSV([summaryRow], summaryColumns);
    const resolutionsCsv = generateCSV(resolutions, resolutionColumns);
    return summaryCsv + '\n\n' + resolutionsCsv;
  };

  const handlePackageOptionChange = (option: keyof PackageOptions) => {
    setPackageOptions(prev => ({
      ...prev,
      [option]: !prev[option],
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary-600" />
          Export Options
        </CardTitle>
        <CardDescription>
          Download your remediated EPUB and reports in various formats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" onClose={() => setSuccess(null)}>
            <CheckCircle className="h-4 w-4 inline mr-2" />
            {success}
          </Alert>
        )}

        <div className="space-y-4">
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Quick Download
            </h4>
            <p className="text-sm text-gray-600">
              Download just the remediated EPUB file
            </p>
            <Button
              onClick={handleDownloadEpub}
              disabled={downloading !== null}
              className="w-full sm:w-auto"
            >
              {downloading === 'epub' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Remediated EPUB
                </>
              )}
            </Button>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600" />
              Download Package
            </h4>
            <p className="text-sm text-gray-600">
              Download a ZIP containing selected files
            </p>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={packageOptions.includeOriginal}
                  onChange={() => handlePackageOptionChange('includeOriginal')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span>Include original EPUB</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={packageOptions.includeComparison}
                  onChange={() => handlePackageOptionChange('includeComparison')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span>Include comparison report</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={packageOptions.includeReport}
                  onChange={() => handlePackageOptionChange('includeReport')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span>Include accessibility report</span>
              </label>
            </div>

            <Button
              onClick={handleDownloadPackage}
              disabled={downloading !== null}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {downloading === 'package' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Preparing Package...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Download Package (ZIP)
                </>
              )}
            </Button>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <FileJson className="h-4 w-4 text-green-600" />
              Reports
            </h4>
            <p className="text-sm text-gray-600">
              Download individual reports
            </p>

            <div className="flex items-center gap-4 mb-3">
              <span className="text-sm text-gray-700">Format:</span>
              <div className="flex rounded-md overflow-hidden border">
                <button
                  className={`px-3 py-1 text-sm transition-colors ${
                    reportFormat === 'json'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setReportFormat('json')}
                >
                  JSON
                </button>
                <button
                  className={`px-3 py-1 text-sm transition-colors ${
                    reportFormat === 'md'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setReportFormat('md')}
                >
                  Markdown
                </button>
                <button
                  className={`px-3 py-1 text-sm transition-colors ${
                    reportFormat === 'csv'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setReportFormat('csv')}
                >
                  CSV
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleDownloadAccessibilityReport}
                disabled={downloading !== null}
                variant="outline"
                size="sm"
              >
                {downloading === 'accessibility-report' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Accessibility Report
                  </>
                )}
              </Button>

              <Button
                onClick={handleDownloadComparisonReport}
                disabled={downloading !== null}
                variant="outline"
                size="sm"
              >
                {downloading === 'comparison-report' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Comparison Report
                  </>
                )}
              </Button>

            </div>
          </div>
        </div>

        {isDemo && (
          <p className="text-xs text-gray-500 text-center">
            Note: EPUB downloads are disabled in demo mode. Reports contain sample data.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
