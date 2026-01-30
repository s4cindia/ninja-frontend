/**
 * Example usage of MatterhornSummary component
 *
 * This file demonstrates how to use the MatterhornSummary component
 * in a PDF audit results page.
 */

import React from 'react';
import { MatterhornSummary } from './MatterhornSummary';
import type { MatterhornSummary as MatterhornSummaryType } from '@/types/pdf.types';

// Example data structure
const exampleSummary: MatterhornSummaryType = {
  totalCheckpoints: 136,
  passed: 120,
  failed: 10,
  notApplicable: 6,
  categories: [
    {
      id: '01',
      name: 'Document Structure',
      checkpoints: [
        {
          id: '01-001',
          description: 'Content is marked as Artifact',
          status: 'passed',
          issueCount: 0,
        },
        {
          id: '01-002',
          description: 'Real content is tagged',
          status: 'failed',
          issueCount: 5,
        },
        {
          id: '01-003',
          description: 'Meaningful sequence',
          status: 'passed',
          issueCount: 0,
        },
      ],
    },
    {
      id: '06',
      name: 'Headings',
      checkpoints: [
        {
          id: '06-001',
          description: 'Heading levels skip',
          status: 'passed',
          issueCount: 0,
        },
        {
          id: '06-002',
          description: 'Headings are nested',
          status: 'failed',
          issueCount: 3,
        },
      ],
    },
    {
      id: '09',
      name: 'Reading Order',
      checkpoints: [
        {
          id: '09-001',
          description: 'Tab order',
          status: 'passed',
          issueCount: 0,
        },
      ],
    },
    {
      id: '11',
      name: 'Natural Language',
      checkpoints: [
        {
          id: '11-001',
          description: 'Language is set',
          status: 'passed',
          issueCount: 0,
        },
      ],
    },
    {
      id: '13',
      name: 'Graphics',
      checkpoints: [
        {
          id: '13-001',
          description: 'Alternative representations',
          status: 'failed',
          issueCount: 2,
        },
      ],
    },
    {
      id: '14',
      name: 'Links',
      checkpoints: [
        {
          id: '14-001',
          description: 'Link annotations',
          status: 'not-applicable',
          issueCount: 0,
        },
      ],
    },
  ],
};

// Example 1: Basic usage
export const BasicExample: React.FC = () => {
  return <MatterhornSummary summary={exampleSummary} />;
};

// Example 2: With checkpoint click handler
export const WithClickHandlerExample: React.FC = () => {
  const handleCheckpointClick = (checkpointId: string) => {
    console.log('Clicked checkpoint:', checkpointId);
    // Navigate to issues view or show checkpoint details
    // e.g., navigate(`/pdf/audit/${jobId}/issues?checkpoint=${checkpointId}`);
  };

  return (
    <MatterhornSummary
      summary={exampleSummary}
      onCheckpointClick={handleCheckpointClick}
    />
  );
};

// Example 3: Start with categories collapsed
export const CollapsedExample: React.FC = () => {
  return <MatterhornSummary summary={exampleSummary} collapsed={true} />;
};

// Example 4: Integration with PDF audit results
export const PDFAuditResultsExample: React.FC<{ pdfAuditResult: any }> = ({
  pdfAuditResult
}) => {
  const handleCheckpointClick = (checkpointId: string) => {
    // Filter issues by Matterhorn checkpoint
    const relatedIssues = pdfAuditResult.issues.filter(
      (issue: any) => issue.matterhornCheckpoint === checkpointId
    );
    console.log('Issues for checkpoint', checkpointId, relatedIssues);
  };

  return (
    <div className="space-y-6">
      <MatterhornSummary
        summary={pdfAuditResult.matterhornSummary}
        onCheckpointClick={handleCheckpointClick}
      />

      {/* Other PDF audit result components */}
    </div>
  );
};
