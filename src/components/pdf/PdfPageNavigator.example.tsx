/**
 * Example usage of PdfPageNavigator component
 *
 * This file demonstrates how to use the PdfPageNavigator component
 * in PDF viewer and audit result pages.
 */

import React, { useState } from 'react';
import { PdfPageNavigator } from './PdfPageNavigator';
import type { PdfAuditIssue } from '@/types/pdf.types';

// Sample issues data
const createSampleIssues = (): Map<number, PdfAuditIssue[]> => {
  const issuesByPage = new Map<number, PdfAuditIssue[]>();

  // Page 1 - Critical and serious issues
  issuesByPage.set(1, [
    {
      id: '1-1',
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
      id: '1-2',
      ruleId: 'PDF-STRUCT-002',
      severity: 'serious',
      message: 'Heading structure skipped',
      description: 'Heading levels skip from H1 to H3',
      pageNumber: 1,
      elementPath: '/Document/Page[1]/H3[1]',
      matterhornCheckpoint: '06-001',
      wcagCriteria: ['1.3.1'],
    },
  ]);

  // Page 3 - Moderate issue
  issuesByPage.set(3, [
    {
      id: '3-1',
      ruleId: 'PDF-TABLE-001',
      severity: 'moderate',
      message: 'Table missing header',
      description: 'Table does not have proper header cells',
      pageNumber: 3,
      elementPath: '/Document/Page[3]/Table[1]',
      matterhornCheckpoint: '11-005',
    },
  ]);

  // Page 5 - Multiple critical issues
  issuesByPage.set(5, [
    {
      id: '5-1',
      ruleId: 'PDF-ALT-002',
      severity: 'critical',
      message: 'Chart missing alternative text',
      description: 'Chart graphic has no alternative description',
      pageNumber: 5,
      elementPath: '/Document/Page[5]/Figure[2]',
      matterhornCheckpoint: '01-003',
    },
    {
      id: '5-2',
      ruleId: 'PDF-ALT-003',
      severity: 'critical',
      message: 'Diagram missing description',
      description: 'Complex diagram lacks detailed description',
      pageNumber: 5,
      elementPath: '/Document/Page[5]/Figure[3]',
      matterhornCheckpoint: '01-003',
    },
    {
      id: '5-3',
      ruleId: 'PDF-LINK-001',
      severity: 'minor',
      message: 'Link text not descriptive',
      description: 'Link uses generic text like "click here"',
      pageNumber: 5,
      elementPath: '/Document/Page[5]/Link[1]',
    },
  ]);

  // Page 8 - Minor issue
  issuesByPage.set(8, [
    {
      id: '8-1',
      ruleId: 'PDF-COLOR-001',
      severity: 'minor',
      message: 'Color contrast insufficient',
      description: 'Text color does not meet WCAG AA standards',
      pageNumber: 8,
      elementPath: '/Document/Page[8]/P[5]',
    },
  ]);

  return issuesByPage;
};

// Example 1: Basic Usage
export const BasicExample: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const issuesByPage = createSampleIssues();

  return (
    <div className="h-screen p-4">
      <PdfPageNavigator
        pageCount={10}
        currentPage={currentPage}
        issuesByPage={issuesByPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

// Example 2: With Thumbnails
export const WithThumbnailsExample: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const issuesByPage = createSampleIssues();

  // Mock thumbnail data (would come from PDF processing)
  const thumbnails = Array.from({ length: 10 }, (_, i) =>
    `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140"><rect width="100" height="140" fill="%23f0f0f0"/><text x="50" y="70" text-anchor="middle" fill="%23999">${i + 1}</text></svg>`
  );

  return (
    <div className="h-screen p-4">
      <PdfPageNavigator
        pageCount={10}
        currentPage={currentPage}
        issuesByPage={issuesByPage}
        onPageChange={setCurrentPage}
        thumbnails={thumbnails}
      />
    </div>
  );
};

// Example 3: Horizontal Orientation
export const HorizontalExample: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const issuesByPage = createSampleIssues();

  return (
    <div className="p-4">
      <PdfPageNavigator
        pageCount={10}
        currentPage={currentPage}
        issuesByPage={issuesByPage}
        onPageChange={setCurrentPage}
        orientation="horizontal"
      />
    </div>
  );
};

// Example 4: PDF Viewer Integration
export const PdfViewerIntegrationExample: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const issuesByPage = createSampleIssues();

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll PDF viewer to the selected page
    console.log('Navigating to page:', page);
    // Example: pdfViewer.scrollToPage(page);
  };

  return (
    <div className="flex h-screen gap-4 p-4">
      {/* Navigator Sidebar */}
      <div className="w-64 flex-shrink-0">
        <PdfPageNavigator
          pageCount={10}
          currentPage={currentPage}
          issuesByPage={issuesByPage}
          onPageChange={handlePageChange}
        />
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 border border-gray-300 rounded-lg bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-600">
          <p className="text-lg font-medium">PDF Viewer</p>
          <p className="text-sm">Current Page: {currentPage}</p>
        </div>
      </div>
    </div>
  );
};

// Example 5: PDF Audit Results Page
export const AuditResultsPageExample: React.FC<{ pdfAuditResult: any }> = ({
  pdfAuditResult
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Group issues by page
  const issuesByPage = new Map<number, PdfAuditIssue[]>();
  pdfAuditResult.issues.forEach((issue: PdfAuditIssue) => {
    if (issue.pageNumber) {
      const pageIssues = issuesByPage.get(issue.pageNumber) || [];
      pageIssues.push(issue);
      issuesByPage.set(issue.pageNumber, pageIssues);
    }
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Optionally scroll to issues for this page
    const issuesSection = document.getElementById(`page-${page}-issues`);
    issuesSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex gap-6 p-6">
      {/* Sidebar with page navigator */}
      <aside className="w-72 flex-shrink-0">
        <PdfPageNavigator
          pageCount={pdfAuditResult.pageCount}
          currentPage={currentPage}
          issuesByPage={issuesByPage}
          onPageChange={handlePageChange}
        />
      </aside>

      {/* Main content area */}
      <main className="flex-1">
        <h1 className="text-2xl font-bold mb-4">PDF Audit Results</h1>
        <p className="text-gray-600 mb-6">{pdfAuditResult.fileName}</p>

        {/* Issues by page */}
        {Array.from(issuesByPage.entries()).map(([pageNum, issues]) => (
          <div key={pageNum} id={`page-${pageNum}-issues`} className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Page {pageNum}</h2>
            <div className="space-y-2">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-4 border rounded-lg bg-white"
                >
                  <p className="font-medium">{issue.message}</p>
                  <p className="text-sm text-gray-600">{issue.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

// Example 6: Responsive Layout
export const ResponsiveExample: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const issuesByPage = createSampleIssues();

  return (
    <div className="h-screen">
      {/* Mobile: Button to toggle navigator */}
      <div className="lg:hidden p-4">
        <button
          onClick={() => setIsNavigatorOpen(!isNavigatorOpen)}
          className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg"
        >
          {isNavigatorOpen ? 'Hide' : 'Show'} Pages
        </button>
      </div>

      <div className="flex h-full">
        {/* Navigator - Hidden on mobile unless toggled */}
        <div className={`lg:block ${isNavigatorOpen ? 'block' : 'hidden'} w-64 border-r`}>
          <PdfPageNavigator
            pageCount={10}
            currentPage={currentPage}
            issuesByPage={issuesByPage}
            onPageChange={(page) => {
              setCurrentPage(page);
              setIsNavigatorOpen(false); // Close on mobile after selection
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <p className="text-center">Page {currentPage} content</p>
        </div>
      </div>
    </div>
  );
};

// Example 7: With Custom Styling
export const CustomStyledExample: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const issuesByPage = createSampleIssues();

  return (
    <div className="h-screen p-4">
      <PdfPageNavigator
        pageCount={10}
        currentPage={currentPage}
        issuesByPage={issuesByPage}
        onPageChange={setCurrentPage}
        className="shadow-xl border-2 border-primary-200"
      />
    </div>
  );
};
