import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssueCard } from './IssueCard';
import type { PdfAuditIssue } from '@/types/pdf.types';

// Mock EPUB/Generic issue
const mockEpubIssue = {
  id: 'issue-1',
  code: 'EPUB-001',
  message: 'Missing alternative text for image',
  severity: 'critical',
  confidence: 0.98,
  fixType: 'autofix' as const,
  status: 'pending',
  location: 'chapter1.xhtml, line 42',
  source: 'js-auditor',
};

// Mock PDF issue
const mockPdfIssue: PdfAuditIssue = {
  id: 'pdf-issue-1',
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

describe('IssueCard', () => {
  describe('EPUB/Generic Issues', () => {
    it('renders basic EPUB issue information', () => {
      render(<IssueCard issue={mockEpubIssue} />);

      expect(screen.getByText('EPUB-001')).toBeInTheDocument();
      expect(screen.getByText('Missing alternative text for image')).toBeInTheDocument();
      expect(screen.getByText('critical')).toBeInTheDocument();
    });

    it('displays location for EPUB issues', () => {
      render(<IssueCard issue={mockEpubIssue} />);

      expect(screen.getByText('chapter1.xhtml, line 42')).toBeInTheDocument();
    });

    it('shows confidence badge for EPUB issues', () => {
      render(<IssueCard issue={mockEpubIssue} />);

      expect(screen.getByText('98% confident')).toBeInTheDocument();
    });

    it('shows fix type badge for EPUB issues', () => {
      render(<IssueCard issue={mockEpubIssue} />);

      expect(screen.getByText('Auto-Fix')).toBeInTheDocument();
    });

    it('applies severity-based styling', () => {
      const { container } = render(<IssueCard issue={mockEpubIssue} />);

      const card = container.querySelector('.border-red-200.bg-red-50');
      expect(card).toBeInTheDocument();
    });

    it('calls onClick when card is clicked', () => {
      const onClick = jest.fn();
      render(<IssueCard issue={mockEpubIssue} onClick={onClick} />);

      const card = screen.getByRole('button');
      fireEvent.click(card);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('is keyboard accessible when onClick is provided', () => {
      const onClick = jest.fn();
      render(<IssueCard issue={mockEpubIssue} onClick={onClick} />);

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('PDF Issues', () => {
    it('renders basic PDF issue information', () => {
      render(<IssueCard issue={mockPdfIssue} />);

      expect(screen.getByText('PDF-ALT-001')).toBeInTheDocument();
      expect(screen.getByText('Image missing alternative text')).toBeInTheDocument();
      expect(screen.getByText('critical')).toBeInTheDocument();
    });

    it('displays PDF icon for PDF issues', () => {
      render(<IssueCard issue={mockPdfIssue} />);

      const icon = screen.getByLabelText('PDF issue');
      expect(icon).toBeInTheDocument();
    });

    it('displays page number badge', () => {
      render(<IssueCard issue={mockPdfIssue} />);

      expect(screen.getByText('Page 5')).toBeInTheDocument();
    });

    it('displays element path instead of location', () => {
      render(<IssueCard issue={mockPdfIssue} />);

      expect(screen.getByText('/Document/Page[5]/Figure[1]')).toBeInTheDocument();
    });

    it('shows Matterhorn checkpoint when showMatterhorn is true', () => {
      render(<IssueCard issue={mockPdfIssue} showMatterhorn={true} />);

      expect(screen.getByText('01-003')).toBeInTheDocument();
    });

    it('hides Matterhorn checkpoint when showMatterhorn is false', () => {
      render(<IssueCard issue={mockPdfIssue} showMatterhorn={false} />);

      expect(screen.queryByText('01-003')).not.toBeInTheDocument();
    });

    it('calls onPageClick when page badge is clicked', () => {
      const onPageClick = jest.fn();
      render(<IssueCard issue={mockPdfIssue} onPageClick={onPageClick} />);

      const pageBadge = screen.getByText('Page 5');
      fireEvent.click(pageBadge);

      expect(onPageClick).toHaveBeenCalledWith(5);
    });

    it('does not trigger onPageClick when page badge click is disabled', () => {
      const onPageClick = jest.fn();
      render(<IssueCard issue={mockPdfIssue} />);

      const pageBadge = screen.getByText('Page 5');
      fireEvent.click(pageBadge);

      expect(onPageClick).not.toHaveBeenCalled();
    });

    it('opens Matterhorn documentation link in new tab', () => {
      render(<IssueCard issue={mockPdfIssue} showMatterhorn={true} />);

      const link = screen.getByText('01-003').closest('a');
      expect(link).toHaveAttribute('href', 'https://www.pdfa.org/resource/the-matterhorn-protocol/');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('does not show fix type or confidence badges for PDF issues', () => {
      render(<IssueCard issue={mockPdfIssue} />);

      expect(screen.queryByText('Auto-Fix')).not.toBeInTheDocument();
      expect(screen.queryByText(/confident/)).not.toBeInTheDocument();
    });

    it('handles PDF issue without page number', () => {
      const issueWithoutPage = { ...mockPdfIssue, pageNumber: undefined };
      render(<IssueCard issue={issueWithoutPage} />);

      expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
    });

    it('handles PDF issue without Matterhorn checkpoint', () => {
      const issueWithoutMatterhorn = { ...mockPdfIssue, matterhornCheckpoint: undefined };
      render(<IssueCard issue={issueWithoutMatterhorn} showMatterhorn={true} />);

      expect(screen.queryByText(/01-003/)).not.toBeInTheDocument();
    });

    it('stops event propagation when page badge is clicked', () => {
      const onClick = jest.fn();
      const onPageClick = jest.fn();
      render(<IssueCard issue={mockPdfIssue} onClick={onClick} onPageClick={onPageClick} />);

      const pageBadge = screen.getByText('Page 5');
      fireEvent.click(pageBadge);

      expect(onPageClick).toHaveBeenCalledWith(5);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('stops event propagation when Matterhorn link is clicked', () => {
      const onClick = jest.fn();
      render(<IssueCard issue={mockPdfIssue} onClick={onClick} showMatterhorn={true} />);

      const matterhornLink = screen.getByText('01-003');
      fireEvent.click(matterhornLink);

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Different Severity Levels', () => {
    it.each([
      ['critical', 'bg-red-50', 'bg-red-100'],
      ['serious', 'bg-orange-50', 'bg-orange-100'],
      ['moderate', 'bg-yellow-50', 'bg-yellow-100'],
      ['minor', 'bg-blue-50', 'bg-blue-100'],
    ])('applies correct styling for %s severity', (severity, bgClass, badgeClass) => {
      const issue = { ...mockEpubIssue, severity };
      const { container } = render(<IssueCard issue={issue} />);

      expect(container.querySelector(`.${bgClass}`)).toBeInTheDocument();
      expect(container.querySelector(`.${badgeClass}`)).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <IssueCard issue={mockEpubIssue} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles issue without optional fields', () => {
      const minimalIssue = {
        id: 'minimal-1',
        code: 'TEST-001',
        message: 'Test issue',
        severity: 'minor',
        status: 'pending',
      };

      render(<IssueCard issue={minimalIssue} />);

      expect(screen.getByText('TEST-001')).toBeInTheDocument();
      expect(screen.getByText('Test issue')).toBeInTheDocument();
    });
  });
});
