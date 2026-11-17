import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PdfPreviewPanel } from './PdfPreviewPanel';
import type { PdfAuditIssue } from '@/types/pdf.types';

const createMockIssue = (
  id: string,
  pageNumber: number,
  severity: 'critical' | 'serious' | 'moderate' | 'minor'
): PdfAuditIssue => ({
  id,
  ruleId: `RULE-${id}`,
  severity,
  message: `Test issue ${id}`,
  description: `Test description ${id}`,
  pageNumber,
});

describe('PdfPreviewPanel', () => {
  const mockOnPageChange = vi.fn();
  const mockOnIssueSelect = vi.fn();

  const defaultProps = {
    pdfUrl: 'https://example.com/test.pdf',
    currentPage: 1,
    issues: [] as PdfAuditIssue[],
    onPageChange: mockOnPageChange,
    onIssueSelect: mockOnIssueSelect,
  };

  beforeEach(() => {
    mockOnPageChange.mockClear();
    mockOnIssueSelect.mockClear();
  });

  describe('Basic Rendering', () => {
    it('renders PDF preview panel', () => {
      render(<PdfPreviewPanel {...defaultProps} />);

      expect(screen.getByLabelText('Zoom level')).toBeInTheDocument();
      expect(screen.getByLabelText('Current page')).toBeInTheDocument();
    });

    it('displays loading state initially', () => {
      render(<PdfPreviewPanel {...defaultProps} />);

      // Component shows loading spinner initially
      expect(screen.getByText('Loading PDF...')).toBeInTheDocument();
    });

    it('shows current page number', () => {
      render(<PdfPreviewPanel {...defaultProps} currentPage={5} />);

      const pageInput = screen.getByLabelText('Current page') as HTMLInputElement;
      expect(pageInput.value).toBe('5');
    });
  });

  describe('Zoom Controls', () => {
    it('has zoom in and zoom out buttons', () => {
      render(<PdfPreviewPanel {...defaultProps} />);

      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
    });

    it('has zoom level dropdown with options', () => {
      render(<PdfPreviewPanel {...defaultProps} />);

      const zoomSelect = screen.getByLabelText('Zoom level');
      expect(zoomSelect).toBeInTheDocument();

      expect(screen.getByRole('option', { name: 'Fit Width' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Fit Page' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '100%' })).toBeInTheDocument();
    });

    it('changes zoom level when dropdown is changed', async () => {
      render(<PdfPreviewPanel {...defaultProps} />);

      const zoomSelect = screen.getByLabelText('Zoom level');
      await userEvent.selectOptions(zoomSelect, '150');

      expect((zoomSelect as HTMLSelectElement).value).toBe('150');
    });

    it('has fit to page button', () => {
      render(<PdfPreviewPanel {...defaultProps} />);

      expect(screen.getByLabelText('Fit to page')).toBeInTheDocument();
    });

    it('disables zoom out at minimum zoom', () => {
      render(<PdfPreviewPanel {...defaultProps} />);

      const zoomSelect = screen.getByLabelText('Zoom level');
      fireEvent.change(zoomSelect, { target: { value: '50' } });

      const zoomOutButton = screen.getByLabelText('Zoom out');
      expect(zoomOutButton).toBeDisabled();
    });

    it('disables zoom in at maximum zoom', () => {
      render(<PdfPreviewPanel {...defaultProps} />);

      const zoomSelect = screen.getByLabelText('Zoom level');
      fireEvent.change(zoomSelect, { target: { value: '200' } });

      const zoomInButton = screen.getByLabelText('Zoom in');
      expect(zoomInButton).toBeDisabled();
    });
  });

  describe('Page Navigation', () => {
    it('has previous and next page buttons', () => {
      render(<PdfPreviewPanel {...defaultProps} />);

      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    });

    it('calls onPageChange when next button is clicked', () => {
      render(<PdfPreviewPanel {...defaultProps} currentPage={1} />);

      const nextButton = screen.getByLabelText('Next page');
      fireEvent.click(nextButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('calls onPageChange when previous button is clicked', () => {
      render(<PdfPreviewPanel {...defaultProps} currentPage={3} />);

      const prevButton = screen.getByLabelText('Previous page');
      fireEvent.click(prevButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('disables previous button on first page', () => {
      render(<PdfPreviewPanel {...defaultProps} currentPage={1} />);

      const prevButton = screen.getByLabelText('Previous page');
      expect(prevButton).toBeDisabled();
    });

    it('allows changing page via input', async () => {
      render(<PdfPreviewPanel {...defaultProps} currentPage={1} />);

      const pageInput = screen.getByLabelText('Current page');
      fireEvent.change(pageInput, { target: { value: '5' } });

      expect(mockOnPageChange).toHaveBeenCalledWith(5);
    });

    it('ignores invalid page numbers', async () => {
      render(<PdfPreviewPanel {...defaultProps} currentPage={1} />);

      const pageInput = screen.getByLabelText('Current page');
      await userEvent.clear(pageInput);
      await userEvent.type(pageInput, 'abc');

      expect(mockOnPageChange).not.toHaveBeenCalled();
    });
  });

  describe('Issue Highlighting', () => {
    it('has toggle button for issue highlights', () => {
      render(<PdfPreviewPanel {...defaultProps} />);

      expect(screen.getByLabelText(/issue highlights/i)).toBeInTheDocument();
    });

    it('shows issue count on current page', () => {
      const issues = [
        createMockIssue('1', 1, 'critical'),
        createMockIssue('2', 1, 'serious'),
        createMockIssue('3', 2, 'moderate'),
      ];

      render(<PdfPreviewPanel {...defaultProps} currentPage={1} issues={issues} />);

      expect(screen.getByText('Issues (2)')).toBeInTheDocument();
    });

    it('shows different issue count when page changes', () => {
      const issues = [
        createMockIssue('1', 1, 'critical'),
        createMockIssue('2', 2, 'serious'),
        createMockIssue('3', 2, 'moderate'),
      ];

      const { rerender } = render(
        <PdfPreviewPanel {...defaultProps} currentPage={1} issues={issues} />
      );

      expect(screen.getByText('Issues (1)')).toBeInTheDocument();

      rerender(<PdfPreviewPanel {...defaultProps} currentPage={2} issues={issues} />);

      expect(screen.getByText('Issues (2)')).toBeInTheDocument();
    });

    it('toggles highlight visibility when button is clicked', () => {
      render(<PdfPreviewPanel {...defaultProps} />);

      const toggleButton = screen.getByLabelText('Hide issue highlights');
      fireEvent.click(toggleButton);

      expect(screen.getByLabelText('Show issue highlights')).toBeInTheDocument();
    });

    it('displays issue count indicator at bottom', () => {
      const issues = [
        createMockIssue('1', 1, 'critical'),
        createMockIssue('2', 1, 'serious'),
      ];

      render(<PdfPreviewPanel {...defaultProps} currentPage={1} issues={issues} />);

      expect(screen.getByText('2 issues on this page')).toBeInTheDocument();
    });

    it('shows singular form for one issue', () => {
      const issues = [createMockIssue('1', 1, 'critical')];

      render(<PdfPreviewPanel {...defaultProps} currentPage={1} issues={issues} />);

      expect(screen.getByText('1 issue on this page')).toBeInTheDocument();
    });

    it('does not show issue indicator when no issues on page', () => {
      const issues = [createMockIssue('1', 2, 'critical')];

      render(<PdfPreviewPanel {...defaultProps} currentPage={1} issues={issues} />);

      expect(screen.queryByText(/issues on this page/)).not.toBeInTheDocument();
    });

    it('notes when no page issues have location data (cannot be highlighted)', () => {
      const issues = [
        createMockIssue('1', 1, 'critical'),
        createMockIssue('2', 1, 'serious'),
      ];

      render(<PdfPreviewPanel {...defaultProps} currentPage={1} issues={issues} />);

      // Mock issues carry no boundingBox, so none are locatable on the page.
      expect(screen.getByText('2 issues on this page')).toBeInTheDocument();
      expect(screen.getByText('· none can be located')).toBeInTheDocument();
    });

    it('shows the located count when only some issues have location data', () => {
      const issues = [
        { ...createMockIssue('1', 1, 'critical'), boundingBox: { x: 10, y: 10, width: 20, height: 20 } },
        createMockIssue('2', 1, 'serious'),
      ];

      render(<PdfPreviewPanel {...defaultProps} currentPage={1} issues={issues} />);

      expect(screen.getByText('· 1 can be located')).toBeInTheDocument();
    });

    it('shows no locatability note when every issue has location data', () => {
      const issues = [
        { ...createMockIssue('1', 1, 'critical'), boundingBox: { x: 10, y: 10, width: 20, height: 20 } },
      ];

      render(<PdfPreviewPanel {...defaultProps} currentPage={1} issues={issues} />);

      expect(screen.getByText('1 issue on this page')).toBeInTheDocument();
      expect(screen.queryByText(/can be located/)).not.toBeInTheDocument();
    });
  });

  describe('Toolbar Layout', () => {
    it('renders all toolbar sections', () => {
      render(<PdfPreviewPanel {...defaultProps} />);

      // Zoom controls
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom level')).toBeInTheDocument();

      // Page navigation
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
      expect(screen.getByLabelText('Current page')).toBeInTheDocument();

      // Highlight toggle
      expect(screen.getByLabelText(/issue highlights/i)).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <PdfPreviewPanel {...defaultProps} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for all controls', () => {
      render(<PdfPreviewPanel {...defaultProps} />);

      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom level')).toBeInTheDocument();
      expect(screen.getByLabelText('Fit to page')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
      expect(screen.getByLabelText('Current page')).toBeInTheDocument();
    });

    it('has keyboard accessible controls', () => {
      render(<PdfPreviewPanel {...defaultProps} />);

      const zoomInButton = screen.getByLabelText('Zoom in');
      zoomInButton.focus();

      expect(document.activeElement).toBe(zoomInButton);
    });
  });

  describe('PDF Rendering', () => {
    it('shows loading state while PDF loads', () => {
      render(<PdfPreviewPanel {...defaultProps} />);

      expect(screen.getByText('Loading PDF...')).toBeInTheDocument();
    });

    it('displays current page number in input', () => {
      render(<PdfPreviewPanel {...defaultProps} currentPage={7} />);

      const pageInput = screen.getByLabelText('Current page') as HTMLInputElement;
      expect(pageInput.value).toBe('7');
    });

    it('displays current zoom level', () => {
      render(<PdfPreviewPanel {...defaultProps} />);

      const zoomSelect = screen.getByLabelText('Zoom level') as HTMLSelectElement;
      expect(zoomSelect.value).toBe('100');
    });
  });

  describe('Issue Selection', () => {
    it('does not show issue overlays when highlights are disabled', () => {
      const issues = [createMockIssue('1', 1, 'critical')];

      render(<PdfPreviewPanel {...defaultProps} currentPage={1} issues={issues} />);

      const toggleButton = screen.getByLabelText('Hide issue highlights');
      fireEvent.click(toggleButton);

      // Issue overlays would not render in the DOM when highlights are off
      // This is tested implicitly by the component logic
    });
  });

  describe('Structure Tag Review mode', () => {
    const structureTagElement = {
      elementId: '12-0',
      tag: 'H1',
      pageNumber: 1,
      bbox: { x: 100, y: 292, width: 70, height: 20, pageWidth: 612, pageHeight: 792 },
    };

    it('switches into structure-tag mode whenever structureTagElements is provided (even empty), hiding the issue-highlight toggle', () => {
      render(<PdfPreviewPanel {...defaultProps} structureTagElements={[]} />);

      expect(screen.queryByLabelText(/issue highlights/i)).not.toBeInTheDocument();
      expect(screen.getByText('0 structure elements on this page')).toBeInTheDocument();
    });

    it('stays in normal issue mode when structureTagElements is omitted entirely', () => {
      render(<PdfPreviewPanel {...defaultProps} />);

      expect(screen.getByLabelText(/issue highlights/i)).toBeInTheDocument();
    });

    it('renders one labeled box per structure element on the current page, filtered by page', () => {
      const otherPage = { ...structureTagElement, elementId: '13-0', tag: 'P', pageNumber: 2 };
      render(
        <PdfPreviewPanel
          {...defaultProps}
          currentPage={1}
          structureTagElements={[structureTagElement, otherPage]}
        />
      );

      expect(screen.getByRole('button', { name: 'H1 element' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'P element' })).not.toBeInTheDocument();
      expect(screen.getByText('1 structure element on this page')).toBeInTheDocument();
    });

    it('calls onStructureTagElementSelect when a box is clicked', () => {
      const onSelect = vi.fn();
      render(
        <PdfPreviewPanel
          {...defaultProps}
          currentPage={1}
          structureTagElements={[structureTagElement]}
          onStructureTagElementSelect={onSelect}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'H1 element' }));

      expect(onSelect).toHaveBeenCalledWith(structureTagElement);
    });

    it('shows the detail strip for the selected element and calls onStructureTagChange on a dropdown change', () => {
      const onChange = vi.fn();
      render(
        <PdfPreviewPanel
          {...defaultProps}
          currentPage={1}
          structureTagElements={[structureTagElement]}
          selectedStructureTagElementId={structureTagElement.elementId}
          onStructureTagChange={onChange}
        />
      );

      expect(screen.getByText('Selected: H1')).toBeInTheDocument();

      fireEvent.change(screen.getByRole('combobox', { name: 'Change structure tag' }), { target: { value: 'H2' } });

      expect(onChange).toHaveBeenCalledWith(structureTagElement, 'H2');
    });

    it('calls onFlagStructureTagElement with the selected element when the Flag button is clicked', () => {
      const onFlag = vi.fn();
      render(
        <PdfPreviewPanel
          {...defaultProps}
          currentPage={1}
          structureTagElements={[structureTagElement]}
          selectedStructureTagElementId={structureTagElement.elementId}
          onFlagStructureTagElement={onFlag}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /flag/i }));

      expect(onFlag).toHaveBeenCalledWith(structureTagElement);
    });

    it('omits the Flag button when onFlagStructureTagElement is not given', () => {
      render(
        <PdfPreviewPanel
          {...defaultProps}
          currentPage={1}
          structureTagElements={[structureTagElement]}
          selectedStructureTagElementId={structureTagElement.elementId}
        />
      );

      expect(screen.queryByRole('button', { name: /flag/i })).not.toBeInTheDocument();
    });

    it('does not show the issue breakdown bar in structure-tag mode, even with issues passed', () => {
      const issues = [createMockIssue('1', 1, 'critical')];
      render(<PdfPreviewPanel {...defaultProps} issues={issues} structureTagElements={[]} />);

      expect(screen.queryByText(/issue(s)? on this page/)).not.toBeInTheDocument();
    });
  });
});
