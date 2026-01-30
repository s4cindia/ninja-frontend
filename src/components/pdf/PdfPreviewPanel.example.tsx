/**
 * Example usage of PdfPreviewPanel component
 *
 * This file demonstrates how to use the PdfPreviewPanel component
 * for displaying PDFs with issue highlighting.
 */

import React, { useState } from 'react';
import { PdfPreviewPanel } from './PdfPreviewPanel';
import type { PdfAuditIssue } from '@/types/pdf.types';

// Sample issues data
const createSampleIssues = (): PdfAuditIssue[] => [
  {
    id: '1',
    ruleId: 'PDF-ALT-001',
    severity: 'critical',
    message: 'Image missing alternative text',
    description: 'Figure element does not have alternative text',
    pageNumber: 1,
    elementPath: '/Document/Page[1]/Figure[1]',
    matterhornCheckpoint: '01-003',
    wcagCriteria: ['1.1.1'],
    suggestedFix: 'Add Alt attribute to Figure element',
  },
  {
    id: '2',
    ruleId: 'PDF-STRUCT-002',
    severity: 'serious',
    message: 'Heading structure skipped',
    description: 'Heading levels skip from H1 to H3',
    pageNumber: 1,
    elementPath: '/Document/Page[1]/H3[1]',
    matterhornCheckpoint: '06-001',
    wcagCriteria: ['1.3.1'],
  },
  {
    id: '3',
    ruleId: 'PDF-TABLE-001',
    severity: 'moderate',
    message: 'Table missing header',
    description: 'Table does not have proper header cells',
    pageNumber: 3,
    elementPath: '/Document/Page[3]/Table[1]',
    matterhornCheckpoint: '11-005',
  },
  {
    id: '4',
    ruleId: 'PDF-COLOR-001',
    severity: 'minor',
    message: 'Color contrast insufficient',
    description: 'Text color does not meet WCAG AA standards',
    pageNumber: 5,
    elementPath: '/Document/Page[5]/P[1]',
  },
];

// Example 1: Basic Usage
export const BasicExample: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIssueId, setSelectedIssueId] = useState<string>();
  const issues = createSampleIssues();

  return (
    <div className="h-screen">
      <PdfPreviewPanel
        pdfUrl="https://example.com/sample.pdf"
        currentPage={currentPage}
        issues={issues}
        selectedIssueId={selectedIssueId}
        onPageChange={setCurrentPage}
        onIssueSelect={(issue) => {
          setSelectedIssueId(issue.id);
          console.log('Selected issue:', issue);
        }}
      />
    </div>
  );
};

// Example 2: With Sidebar Integration
export const WithSidebarExample: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIssueId, setSelectedIssueId] = useState<string>();
  const issues = createSampleIssues();

  const selectedIssue = issues.find((i) => i.id === selectedIssueId);

  return (
    <div className="flex h-screen gap-4 p-4">
      {/* Preview Panel */}
      <div className="flex-1">
        <PdfPreviewPanel
          pdfUrl="https://example.com/sample.pdf"
          currentPage={currentPage}
          issues={issues}
          selectedIssueId={selectedIssueId}
          onPageChange={setCurrentPage}
          onIssueSelect={(issue) => setSelectedIssueId(issue.id)}
        />
      </div>

      {/* Issue Details Sidebar */}
      <aside className="w-96 bg-white border border-gray-200 rounded-lg p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Issue Details</h2>
        {selectedIssue ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Rule ID</p>
              <p className="text-sm text-gray-900">{selectedIssue.ruleId}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Severity</p>
              <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700">
                {selectedIssue.severity}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Message</p>
              <p className="text-sm text-gray-900">{selectedIssue.message}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Description</p>
              <p className="text-sm text-gray-700">{selectedIssue.description}</p>
            </div>
            {selectedIssue.suggestedFix && (
              <div>
                <p className="text-sm font-medium text-gray-700">Suggested Fix</p>
                <p className="text-sm text-gray-700">{selectedIssue.suggestedFix}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Select an issue highlight to view details</p>
        )}
      </aside>
    </div>
  );
};

// Example 3: PDF Audit Results Page
export const AuditResultsExample: React.FC<{ pdfAuditResult: any }> = ({
  pdfAuditResult,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIssueId, setSelectedIssueId] = useState<string>();

  const handleIssueSelect = (issue: PdfAuditIssue) => {
    setSelectedIssueId(issue.id);
    // Navigate to the page where the issue is located
    if (issue.pageNumber && issue.pageNumber !== currentPage) {
      setCurrentPage(issue.pageNumber);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-2xl font-bold">PDF Audit Results</h1>
        <p className="text-gray-600">{pdfAuditResult.fileName}</p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <PdfPreviewPanel
          pdfUrl={pdfAuditResult.pdfUrl}
          currentPage={currentPage}
          issues={pdfAuditResult.issues}
          selectedIssueId={selectedIssueId}
          onPageChange={setCurrentPage}
          onIssueSelect={handleIssueSelect}
        />
      </div>
    </div>
  );
};

// Example 4: With Issue List Navigation
export const WithIssueListExample: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIssueId, setSelectedIssueId] = useState<string>();
  const issues = createSampleIssues();

  const handleIssueClick = (issue: PdfAuditIssue) => {
    setSelectedIssueId(issue.id);
    if (issue.pageNumber) {
      setCurrentPage(issue.pageNumber);
    }
  };

  return (
    <div className="flex h-screen gap-4 p-4">
      {/* Issue List */}
      <aside className="w-80 bg-white border border-gray-200 rounded-lg p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">All Issues</h2>
        <div className="space-y-2">
          {issues.map((issue) => (
            <button
              key={issue.id}
              onClick={() => handleIssueClick(issue)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                issue.id === selectedIssueId
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{issue.ruleId}</span>
                <span className="text-xs text-gray-500">Page {issue.pageNumber}</span>
              </div>
              <p className="text-sm text-gray-700">{issue.message}</p>
            </button>
          ))}
        </div>
      </aside>

      {/* PDF Preview */}
      <div className="flex-1">
        <PdfPreviewPanel
          pdfUrl="https://example.com/sample.pdf"
          currentPage={currentPage}
          issues={issues}
          selectedIssueId={selectedIssueId}
          onPageChange={setCurrentPage}
          onIssueSelect={(issue) => setSelectedIssueId(issue.id)}
        />
      </div>
    </div>
  );
};

// Example 5: Responsive Layout
export const ResponsiveExample: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIssueId, setSelectedIssueId] = useState<string>();
  const [showSidebar, setShowSidebar] = useState(false);
  const issues = createSampleIssues();

  return (
    <div className="h-screen flex flex-col lg:flex-row">
      {/* Mobile toggle */}
      <div className="lg:hidden p-4 bg-white border-b">
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="px-4 py-2 bg-primary-600 text-white rounded"
        >
          {showSidebar ? 'Hide' : 'Show'} Issues
        </button>
      </div>

      {/* Sidebar - hidden on mobile unless toggled */}
      {(showSidebar || window.innerWidth >= 1024) && (
        <aside className="w-full lg:w-80 bg-white border-r p-4">
          <h2 className="text-lg font-semibold mb-4">Issues</h2>
          <div className="space-y-2">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="p-2 border rounded cursor-pointer hover:bg-gray-50"
                onClick={() => {
                  setSelectedIssueId(issue.id);
                  if (issue.pageNumber) setCurrentPage(issue.pageNumber);
                  setShowSidebar(false); // Close sidebar on mobile
                }}
              >
                <p className="text-sm font-medium">{issue.message}</p>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* PDF Preview */}
      <div className="flex-1">
        <PdfPreviewPanel
          pdfUrl="https://example.com/sample.pdf"
          currentPage={currentPage}
          issues={issues}
          selectedIssueId={selectedIssueId}
          onPageChange={setCurrentPage}
          onIssueSelect={(issue) => setSelectedIssueId(issue.id)}
        />
      </div>
    </div>
  );
};

// Example 6: Installation Instructions Component
export const InstallationGuide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">PdfPreviewPanel Installation</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Install Dependencies</h2>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code>npm install react-pdf pdfjs-dist</code>
          </pre>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Uncomment react-pdf Imports</h2>
          <p className="text-gray-700 mb-2">
            In <code className="bg-gray-100 px-2 py-1 rounded">PdfPreviewPanel.tsx</code>, uncomment the following lines:
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code>{`import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
pdfjs.GlobalWorkerOptions.workerSrc = \`//cdnjs.cloudflare.com/ajax/libs/pdf.js/\${pdfjs.version}/pdf.worker.min.js\`;`}</code>
          </pre>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. Enable PDF Rendering</h2>
          <p className="text-gray-700 mb-2">
            Uncomment the Document and Page components in the render section and remove the placeholder div.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Test the Component</h2>
          <p className="text-gray-700">
            The component should now render PDFs with full functionality including zoom, navigation, and issue highlighting.
          </p>
        </section>
      </div>
    </div>
  );
};
