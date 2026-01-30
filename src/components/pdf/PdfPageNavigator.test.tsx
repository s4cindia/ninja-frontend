import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PdfPageNavigator } from './PdfPageNavigator';
import type { PdfAuditIssue } from '@/types/pdf.types';

const createMockIssue = (
  pageNumber: number,
  severity: 'critical' | 'serious' | 'moderate' | 'minor',
  id: string
): PdfAuditIssue => ({
  id,
  ruleId: `RULE-${id}`,
  severity,
  message: `Test issue ${id}`,
  description: `Test description ${id}`,
  pageNumber,
});

describe('PdfPageNavigator', () => {
  const mockOnPageChange = jest.fn();

  const createIssuesByPage = () => {
    const issuesByPage = new Map<number, PdfAuditIssue[]>();
    issuesByPage.set(1, [
      createMockIssue(1, 'critical', '1-1'),
      createMockIssue(1, 'serious', '1-2'),
    ]);
    issuesByPage.set(3, [
      createMockIssue(3, 'moderate', '3-1'),
    ]);
    issuesByPage.set(5, [
      createMockIssue(5, 'critical', '5-1'),
      createMockIssue(5, 'critical', '5-2'),
      createMockIssue(5, 'minor', '5-3'),
    ]);
    return issuesByPage;
  };

  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  describe('Basic Rendering', () => {
    it('renders page navigator with correct page count', () => {
      const issuesByPage = new Map();
      render(
        <PdfPageNavigator
          pageCount={10}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText('10 pages')).toBeInTheDocument();
      expect(screen.getByText('Page 1 / 10')).toBeInTheDocument();
    });

    it('renders all pages in list', () => {
      const issuesByPage = new Map();
      render(
        <PdfPageNavigator
          pageCount={5}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText('Page 1')).toBeInTheDocument();
      expect(screen.getByText('Page 2')).toBeInTheDocument();
      expect(screen.getByText('Page 3')).toBeInTheDocument();
      expect(screen.getByText('Page 4')).toBeInTheDocument();
      expect(screen.getByText('Page 5')).toBeInTheDocument();
    });

    it('highlights current page', () => {
      const issuesByPage = new Map();
      render(
        <PdfPageNavigator
          pageCount={5}
          currentPage={3}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      const page3Button = screen.getByLabelText('Page 3');
      expect(page3Button).toHaveClass('border-primary-500');
      expect(page3Button).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Issue Indicators', () => {
    it('displays issue counts on pages with issues', () => {
      const issuesByPage = createIssuesByPage();
      render(
        <PdfPageNavigator
          pageCount={10}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      // Page 1 has 2 issues
      expect(screen.getByLabelText('Page 1 - 2 issues')).toBeInTheDocument();
      // Page 3 has 1 issue
      expect(screen.getByLabelText('Page 3 - 1 issue')).toBeInTheDocument();
      // Page 5 has 3 issues
      expect(screen.getByLabelText('Page 5 - 3 issues')).toBeInTheDocument();
    });

    it('displays total issues summary', () => {
      const issuesByPage = createIssuesByPage();
      render(
        <PdfPageNavigator
          pageCount={10}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText('6 issues on 3 pages')).toBeInTheDocument();
    });

    it('does not show issue badge on pages without issues', () => {
      const issuesByPage = createIssuesByPage();
      render(
        <PdfPageNavigator
          pageCount={10}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      const page2Label = screen.getByLabelText('Page 2');
      expect(page2Label.textContent).not.toContain('issues');
    });
  });

  describe('Navigation', () => {
    it('calls onPageChange when page is clicked', () => {
      const issuesByPage = new Map();
      render(
        <PdfPageNavigator
          pageCount={5}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      const page3Button = screen.getByLabelText('Page 3');
      fireEvent.click(page3Button);

      expect(mockOnPageChange).toHaveBeenCalledWith(3);
    });

    it('navigates to previous page with prev button', () => {
      const issuesByPage = new Map();
      render(
        <PdfPageNavigator
          pageCount={5}
          currentPage={3}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      const prevButton = screen.getByLabelText('Previous page');
      fireEvent.click(prevButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('navigates to next page with next button', () => {
      const issuesByPage = new Map();
      render(
        <PdfPageNavigator
          pageCount={5}
          currentPage={3}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      const nextButton = screen.getByLabelText('Next page');
      fireEvent.click(nextButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(4);
    });

    it('disables prev button on first page', () => {
      const issuesByPage = new Map();
      render(
        <PdfPageNavigator
          pageCount={5}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      const prevButton = screen.getByLabelText('Previous page');
      expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
      const issuesByPage = new Map();
      render(
        <PdfPageNavigator
          pageCount={5}
          currentPage={5}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      const nextButton = screen.getByLabelText('Next page');
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Jump to Page', () => {
    it('navigates to entered page number', async () => {
      const issuesByPage = new Map();
      render(
        <PdfPageNavigator
          pageCount={10}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByPlaceholderText('Jump to...');
      const goButton = screen.getByText('Go');

      await userEvent.type(input, '7');
      fireEvent.click(goButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(7);
    });

    it('clears input after successful jump', async () => {
      const issuesByPage = new Map();
      render(
        <PdfPageNavigator
          pageCount={10}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByPlaceholderText('Jump to...') as HTMLInputElement;
      const goButton = screen.getByText('Go');

      await userEvent.type(input, '5');
      fireEvent.click(goButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('ignores invalid page numbers', async () => {
      const issuesByPage = new Map();
      render(
        <PdfPageNavigator
          pageCount={10}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByPlaceholderText('Jump to...');
      const goButton = screen.getByText('Go');

      await userEvent.type(input, '99');
      fireEvent.click(goButton);

      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it('submits form on Enter key', async () => {
      const issuesByPage = new Map();
      render(
        <PdfPageNavigator
          pageCount={10}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByPlaceholderText('Jump to...');

      await userEvent.type(input, '4');
      fireEvent.submit(input.closest('form')!);

      expect(mockOnPageChange).toHaveBeenCalledWith(4);
    });
  });

  describe('Filtering', () => {
    it('shows all pages by default', () => {
      const issuesByPage = createIssuesByPage();
      render(
        <PdfPageNavigator
          pageCount={5}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText('Page 1')).toBeInTheDocument();
      expect(screen.getByText('Page 2')).toBeInTheDocument();
      expect(screen.getByText('Page 3')).toBeInTheDocument();
      expect(screen.getByText('Page 4')).toBeInTheDocument();
      expect(screen.getByText('Page 5')).toBeInTheDocument();
    });

    it('filters to show only pages with issues', () => {
      const issuesByPage = createIssuesByPage();
      render(
        <PdfPageNavigator
          pageCount={5}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      const withIssuesButton = screen.getByText('With Issues');
      fireEvent.click(withIssuesButton);

      expect(screen.getByText('Page 1')).toBeInTheDocument();
      expect(screen.queryByText('Page 2')).not.toBeInTheDocument();
      expect(screen.getByText('Page 3')).toBeInTheDocument();
      expect(screen.queryByText('Page 4')).not.toBeInTheDocument();
      expect(screen.getByText('Page 5')).toBeInTheDocument();
    });

    it('filters to show only pages with critical issues', () => {
      const issuesByPage = createIssuesByPage();
      render(
        <PdfPageNavigator
          pageCount={5}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      const criticalButton = screen.getByText('Critical');
      fireEvent.click(criticalButton);

      expect(screen.getByText('Page 1')).toBeInTheDocument();
      expect(screen.queryByText('Page 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Page 3')).not.toBeInTheDocument(); // Only moderate
      expect(screen.queryByText('Page 4')).not.toBeInTheDocument();
      expect(screen.getByText('Page 5')).toBeInTheDocument();
    });

    it('shows message when no pages match filter', () => {
      const issuesByPage = new Map();
      render(
        <PdfPageNavigator
          pageCount={5}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      const withIssuesButton = screen.getByText('With Issues');
      fireEvent.click(withIssuesButton);

      expect(screen.getByText('No pages match the current filter')).toBeInTheDocument();
    });

    it('highlights active filter button', () => {
      const issuesByPage = new Map();
      render(
        <PdfPageNavigator
          pageCount={5}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      const allButton = screen.getByText('All');
      const withIssuesButton = screen.getByText('With Issues');

      expect(allButton).toHaveClass('bg-primary-100');

      fireEvent.click(withIssuesButton);

      expect(withIssuesButton).toHaveClass('bg-primary-100');
      expect(allButton).not.toHaveClass('bg-primary-100');
    });
  });

  describe('Thumbnails', () => {
    it('renders thumbnails when provided', () => {
      const issuesByPage = new Map();
      const thumbnails = [
        'data:image/png;base64,thumb1',
        'data:image/png;base64,thumb2',
        'data:image/png;base64,thumb3',
      ];

      render(
        <PdfPageNavigator
          pageCount={3}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
          thumbnails={thumbnails}
        />
      );

      const thumbnail1 = screen.getByAltText('Page 1 thumbnail');
      expect(thumbnail1).toHaveAttribute('src', thumbnails[0]);
    });

    it('renders page list without thumbnails when not provided', () => {
      const issuesByPage = new Map();
      render(
        <PdfPageNavigator
          pageCount={3}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.queryByAltText('Page 1 thumbnail')).not.toBeInTheDocument();
      expect(screen.getByText('Page 1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      const issuesByPage = new Map();
      render(
        <PdfPageNavigator
          pageCount={5}
          currentPage={1}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByLabelText('PDF pages')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
      expect(screen.getByLabelText('Jump to page number')).toBeInTheDocument();
    });

    it('marks current page with aria-current', () => {
      const issuesByPage = new Map();
      render(
        <PdfPageNavigator
          pageCount={5}
          currentPage={3}
          issuesByPage={issuesByPage}
          onPageChange={mockOnPageChange}
        />
      );

      const currentPageButton = screen.getByLabelText('Page 3');
      expect(currentPageButton).toHaveAttribute('aria-current', 'page');
    });
  });
});
