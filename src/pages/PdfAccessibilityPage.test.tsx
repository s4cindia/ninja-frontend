import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { PdfAccessibilityPage } from './PdfAccessibilityPage';
import * as validation from '@/utils/validation';

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/components/epub/EPUBUploader', () => ({
  DocumentUploader: ({ onUploadComplete, onError, acceptedFileTypes, endpoints }: {
    onUploadComplete: (summary: { jobId: string }) => void;
    onError: (error: string) => void;
    acceptedFileTypes?: string[];
    endpoints?: Record<string, unknown>;
  }) => (
    <div data-testid="document-uploader">
      <div>Accepted Types: {acceptedFileTypes?.join(', ')}</div>
      <div>Endpoints: {JSON.stringify(endpoints)}</div>
      <button onClick={() => onUploadComplete({ jobId: 'test-job-123' })}>
        Upload Success
      </button>
      <button onClick={() => onUploadComplete({ jobId: '../malicious' })}>
        Upload Malicious
      </button>
      <button onClick={() => onError('Upload failed')}>Upload Error</button>
    </div>
  ),
}));

describe('PdfAccessibilityPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('rendering', () => {
    it('should render the page title and description', () => {
      render(
        <MemoryRouter>
          <PdfAccessibilityPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /PDF Accessibility/i })).toBeInTheDocument();
      expect(
        screen.getByText('Upload and audit PDF files for accessibility compliance')
      ).toBeInTheDocument();
    });

    it('should render breadcrumbs', () => {
      render(
        <MemoryRouter>
          <PdfAccessibilityPage />
        </MemoryRouter>
      );

      // Breadcrumbs component renders the label text
      // We check for the presence of the breadcrumb navigation structure
      const breadcrumbText = screen.getAllByText('PDF Accessibility');
      expect(breadcrumbText.length).toBeGreaterThan(0);
    });

    it('should render upload card with title and description', () => {
      render(
        <MemoryRouter>
          <PdfAccessibilityPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Upload PDF')).toBeInTheDocument();
      expect(
        screen.getByText('Upload a PDF file to analyze its accessibility features and identify issues')
      ).toBeInTheDocument();
    });

    it('should render DocumentUploader component', () => {
      render(
        <MemoryRouter>
          <PdfAccessibilityPage />
        </MemoryRouter>
      );

      expect(screen.getByTestId('document-uploader')).toBeInTheDocument();
    });
  });

  describe('DocumentUploader configuration', () => {
    it('should configure DocumentUploader to accept only PDF files', () => {
      render(
        <MemoryRouter>
          <PdfAccessibilityPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Accepted Types: pdf')).toBeInTheDocument();
    });

    it('should configure DocumentUploader with correct endpoints', () => {
      render(
        <MemoryRouter>
          <PdfAccessibilityPage />
        </MemoryRouter>
      );

      const endpointsText = screen.getByText(/Endpoints:/);
      expect(endpointsText.textContent).toContain('directUpload');
      expect(endpointsText.textContent).toContain('auditFile');
      expect(endpointsText.textContent).toContain('/pdf/audit-upload');
      expect(endpointsText.textContent).toContain('/pdf/audit-file');
    });
  });

  describe('upload completion', () => {
    it('should navigate to audit results page on successful upload with valid jobId', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <PdfAccessibilityPage />
        </MemoryRouter>
      );

      const uploadButton = screen.getByText('Upload Success');
      await user.click(uploadButton);

      expect(mockNavigate).toHaveBeenCalledWith('/pdf/audit/test-job-123');
    });

    it('should validate jobId before navigation', async () => {
      const user = userEvent.setup();
      const validateSpy = vi.spyOn(validation, 'validateJobId');

      render(
        <MemoryRouter>
          <PdfAccessibilityPage />
        </MemoryRouter>
      );

      const uploadButton = screen.getByText('Upload Success');
      await user.click(uploadButton);

      expect(validateSpy).toHaveBeenCalledWith('test-job-123');
    });

    it('should not navigate if jobId is invalid', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <PdfAccessibilityPage />
        </MemoryRouter>
      );

      const maliciousButton = screen.getByText('Upload Malicious');
      await user.click(maliciousButton);

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should show user-friendly error message for invalid jobId', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <PdfAccessibilityPage />
        </MemoryRouter>
      );

      const maliciousButton = screen.getByText('Upload Malicious');
      await user.click(maliciousButton);

      await waitFor(() => {
        expect(
          screen.getByText('Unable to process upload. Please try again or contact support.')
        ).toBeInTheDocument();
      });
    });

    it('should not expose internal details in error message', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <PdfAccessibilityPage />
        </MemoryRouter>
      );

      const maliciousButton = screen.getByText('Upload Malicious');
      await user.click(maliciousButton);

      await waitFor(() => {
        // Should NOT contain technical terms like "job ID"
        expect(screen.queryByText(/job ID/i)).not.toBeInTheDocument();
        // Instead should have user-friendly message
        expect(screen.getByText(/try again or contact support/i)).toBeInTheDocument();
      });
    });
  });

  describe('upload error handling', () => {
    it('should display error message when upload fails', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <PdfAccessibilityPage />
        </MemoryRouter>
      );

      const errorButton = screen.getByText('Upload Error');
      await user.click(errorButton);

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });
    });

    it('should allow dismissing error alerts', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <PdfAccessibilityPage />
        </MemoryRouter>
      );

      const errorButton = screen.getByText('Upload Error');
      await user.click(errorButton);

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });

      // Close the alert using the close button
      const closeButton = screen.getByLabelText('Close alert');
      await user.click(closeButton);

      // Alert should be dismissed
      await waitFor(() => {
        expect(screen.queryByText('Upload failed')).not.toBeInTheDocument();
      });
    });
  });

  describe('security', () => {
    it('should prevent path traversal attacks via jobId validation', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <PdfAccessibilityPage />
        </MemoryRouter>
      );

      const maliciousButton = screen.getByText('Upload Malicious');
      await user.click(maliciousButton);

      // Should not navigate with malicious jobId
      expect(mockNavigate).not.toHaveBeenCalledWith('/pdf/audit/../malicious');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should only accept alphanumeric, hyphen, and underscore in jobId', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <PdfAccessibilityPage />
        </MemoryRouter>
      );

      const successButton = screen.getByText('Upload Success');
      await user.click(successButton);

      // Valid jobId with allowed characters should work
      expect(mockNavigate).toHaveBeenCalledWith('/pdf/audit/test-job-123');
    });
  });

  describe('accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(
        <MemoryRouter>
          <PdfAccessibilityPage />
        </MemoryRouter>
      );

      const heading = screen.getByRole('heading', { name: /PDF Accessibility/i });
      expect(heading).toBeInTheDocument();
    });

    it('should have descriptive text for the upload section', () => {
      render(
        <MemoryRouter>
          <PdfAccessibilityPage />
        </MemoryRouter>
      );

      expect(
        screen.getByText(/analyze its accessibility features and identify issues/i)
      ).toBeInTheDocument();
    });
  });
});
