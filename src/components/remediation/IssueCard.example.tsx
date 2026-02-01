/**
 * Example usage of enhanced IssueCard component
 *
 * This file demonstrates how to use IssueCard with both EPUB and PDF issues
 */

import React from 'react';
import { IssueCard } from './IssueCard';
import type { PdfAuditIssue } from '@/types/pdf.types';

// Example EPUB Issue
const epubIssue = {
  id: 'epub-1',
  code: 'EPUB-001',
  message: 'Missing alternative text for image',
  severity: 'critical',
  confidence: 0.98,
  fixType: 'autofix' as const,
  status: 'pending',
  location: 'chapter1.xhtml, line 42',
  source: 'js-auditor',
};

// Example PDF Issue
const pdfIssue: PdfAuditIssue = {
  id: 'pdf-1',
  ruleId: 'PDF-ALT-001',
  severity: 'critical',
  message: 'Image missing alternative text',
  description: 'Figure element does not have alternative text',
  pageNumber: 5,
  elementPath: '/Document/Page[5]/Figure[1]',
  matterhornCheckpoint: '01-003',
  wcagCriteria: ['1.1.1'],
  suggestedFix: 'Add Alt attribute to Figure element',
};

// Example 1: Basic EPUB Issue Card
export const EpubIssueExample: React.FC = () => {
  return <IssueCard issue={epubIssue} />;
};

// Example 2: EPUB Issue with Click Handler
export const EpubIssueWithClickExample: React.FC = () => {
  const handleClick = () => {
    console.log('Issue clicked:', epubIssue.id);
    // Navigate to issue details or expand issue
  };

  return <IssueCard issue={epubIssue} onClick={handleClick} />;
};

// Example 3: Basic PDF Issue Card
export const PdfIssueExample: React.FC = () => {
  return <IssueCard issue={pdfIssue} />;
};

// Example 4: PDF Issue with Matterhorn Checkpoint
export const PdfIssueWithMatterhornExample: React.FC = () => {
  return <IssueCard issue={pdfIssue} showMatterhorn={true} />;
};

// Example 5: PDF Issue with Page Navigation
export const PdfIssueWithPageNavExample: React.FC = () => {
  const handlePageClick = (pageNumber: number) => {
    console.log('Navigate to page:', pageNumber);
    // Navigate to PDF viewer at specific page
    // e.g., window.location.href = `/pdf-viewer?page=${pageNumber}`;
  };

  return (
    <IssueCard
      issue={pdfIssue}
      onPageClick={handlePageClick}
      showMatterhorn={true}
    />
  );
};

// Example 6: PDF Issue - Full Featured
export const PdfIssueFullExample: React.FC = () => {
  const handleClick = () => {
    console.log('Issue clicked');
  };

  const handlePageClick = (pageNumber: number) => {
    console.log('Navigate to page:', pageNumber);
  };

  return (
    <IssueCard
      issue={pdfIssue}
      onClick={handleClick}
      onPageClick={handlePageClick}
      showMatterhorn={true}
      className="shadow-md"
    />
  );
};

// Example 7: List of Mixed Issues (EPUB and PDF)
export const MixedIssuesListExample: React.FC = () => {
  const issues = [epubIssue, pdfIssue];

  const handleIssueClick = (issueId: string) => {
    console.log('Issue clicked:', issueId);
  };

  const handlePageClick = (pageNumber: number) => {
    console.log('Navigate to page:', pageNumber);
  };

  return (
    <div className="space-y-3">
      {issues.map((issue) => (
        <IssueCard
          key={issue.id}
          issue={issue}
          onClick={() => handleIssueClick(issue.id)}
          onPageClick={handlePageClick}
          showMatterhorn={true}
        />
      ))}
    </div>
  );
};

// Example 8: PDF Audit Results Integration
export const PdfAuditResultsExample: React.FC<{
  pdfAuditResult: { jobId: string; issues: PdfAuditIssue[] };
}> = ({ pdfAuditResult }) => {
  const handlePageClick = (pageNumber: number) => {
    // Open PDF viewer at specific page
    const jobId = pdfAuditResult.jobId;
    window.location.href = `/pdf/viewer/${jobId}?page=${pageNumber}`;
  };

  const handleIssueClick = (issue: PdfAuditIssue) => {
    // Show issue details in modal or expand inline
    console.log('Show details for issue:', issue.id);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">PDF Accessibility Issues</h2>
      <div className="space-y-3">
        {pdfAuditResult.issues.map((issue: PdfAuditIssue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            onClick={() => handleIssueClick(issue)}
            onPageClick={handlePageClick}
            showMatterhorn={true}
          />
        ))}
      </div>
    </div>
  );
};

// Example 9: Filtered by Matterhorn Checkpoint
export const FilteredByCheckpointExample: React.FC<{
  issues: PdfAuditIssue[];
  checkpointId: string;
}> = ({ issues, checkpointId }) => {
  const filteredIssues = issues.filter(
    issue => issue.matterhornCheckpoint === checkpointId
  );

  return (
    <div className="space-y-4">
      <h3 className="text-md font-semibold">
        Issues for Checkpoint {checkpointId}
      </h3>
      <div className="space-y-3">
        {filteredIssues.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            showMatterhorn={true}
          />
        ))}
      </div>
    </div>
  );
};

// Example 10: Multiple Issues in a List
export const IssueListExample: React.FC = () => {
  return (
    <div className="space-y-2">
      <IssueCard issue={epubIssue} />
      <IssueCard issue={pdfIssue} showMatterhorn={true} />
    </div>
  );
};
