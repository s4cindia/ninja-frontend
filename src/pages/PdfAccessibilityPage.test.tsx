import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { PdfAccessibilityPage } from './PdfAccessibilityPage';
import * as validation from '@/utils/validation';
import { useAuthStore } from '@/stores/auth.store';
import { teamService } from '@/services/team.service';
import type { User } from '@/types/auth.types';

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/services/team.service', () => ({
  teamService: { listTeamExecutives: vi.fn() },
}));
const mockListTeamExecutives = vi.mocked(teamService.listTeamExecutives);

vi.mock('@/components/epub/EPUBUploader', () => ({
  DocumentUploader: ({ onUploadComplete, onJobCreated, onError, acceptedFileTypes, endpoints, assigneeUserId, fullAutoMode }: {
    onUploadComplete: (summary: { jobId: string }) => void;
    onJobCreated?: (jobId: string) => void;
    onError: (error: string) => void;
    acceptedFileTypes?: string[];
    endpoints?: Record<string, unknown>;
    assigneeUserId?: string;
    fullAutoMode?: boolean;
  }) => (
    <div data-testid="document-uploader">
      <div>Accepted Types: {acceptedFileTypes?.join(', ')}</div>
      <div>Endpoints: {JSON.stringify(endpoints)}</div>
      <div>Assignee: {assigneeUserId ?? '(none)'}</div>
      <div>Full Auto Mode: {fullAutoMode === undefined ? '(unset)' : String(fullAutoMode)}</div>
      <button onClick={() => onUploadComplete({ jobId: 'test-job-123' })}>
        Upload Success
      </button>
      <button onClick={() => onUploadComplete({ jobId: '../malicious' })}>
        Upload Malicious
      </button>
      <button onClick={() => onJobCreated?.('job-just-created-456')}>
        Job Created
      </button>
      <button onClick={() => onJobCreated?.('../malicious')}>
        Job Created Malicious
      </button>
      <button onClick={() => onError('Upload failed')}>Upload Error</button>
    </div>
  ),
}));

const baseUser: User = {
  id: 'user-1',
  email: 'operator@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  role: 'OPERATOR',
  tenantId: 'tenant-1',
};

function setCurrentUser(overrides?: Partial<User>) {
  useAuthStore.setState({
    user: { ...baseUser, ...overrides },
    isAuthenticated: true,
    isLoading: false,
    accessToken: 'token',
    refreshToken: 'refresh',
  });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PdfAccessibilityPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PdfAccessibilityPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockListTeamExecutives.mockReset();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      refreshToken: null,
    });
  });

  describe('rendering', () => {
    it('should render the page title and description', () => {
      renderPage();

      expect(screen.getByRole('heading', { name: /PDF Accessibility/i })).toBeInTheDocument();
      expect(
        screen.getByText('Upload and audit PDF files for accessibility compliance')
      ).toBeInTheDocument();
    });

    it('should render breadcrumbs', () => {
      renderPage();

      // Breadcrumbs component renders the label text
      // We check for the presence of the breadcrumb navigation structure
      const breadcrumbText = screen.getAllByText('PDF Accessibility');
      expect(breadcrumbText.length).toBeGreaterThan(0);
    });

    it('should render upload card with title and description', () => {
      renderPage();

      expect(screen.getByText('Upload PDF')).toBeInTheDocument();
      expect(
        screen.getByText('Upload a PDF file to analyze its accessibility features and identify issues')
      ).toBeInTheDocument();
    });

    it('should render DocumentUploader component', () => {
      renderPage();

      expect(screen.getByTestId('document-uploader')).toBeInTheDocument();
    });
  });

  describe('DocumentUploader configuration', () => {
    it('should configure DocumentUploader to accept only PDF files', () => {
      renderPage();

      expect(screen.getByText('Accepted Types: pdf')).toBeInTheDocument();
    });

    it('should configure DocumentUploader with correct endpoints', () => {
      renderPage();

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

      renderPage();

      const uploadButton = screen.getByText('Upload Success');
      await user.click(uploadButton);

      expect(mockNavigate).toHaveBeenCalledWith('/pdf/audit/test-job-123');
    });

    it('should validate jobId before navigation', async () => {
      const user = userEvent.setup();
      const validateSpy = vi.spyOn(validation, 'validateJobId');

      renderPage();

      const uploadButton = screen.getByText('Upload Success');
      await user.click(uploadButton);

      expect(validateSpy).toHaveBeenCalledWith('test-job-123');
    });

    it('should not navigate if jobId is invalid', async () => {
      const user = userEvent.setup();

      renderPage();

      const maliciousButton = screen.getByText('Upload Malicious');
      await user.click(maliciousButton);

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should show user-friendly error message for invalid jobId', async () => {
      const user = userEvent.setup();

      renderPage();

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

      renderPage();

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

  describe('auto-navigate on job creation', () => {
    // Fixes a real reported bug: the "Audit Complete" panel this page's
    // DocumentUploader shows is pure component state with no job ID in
    // the URL, so a browser refresh while still on it loses the
    // completed-audit view entirely. Navigating as soon as the job
    // exists -- instead of waiting for the full audit+AI-analysis
    // sequence and a manual "View Full Results" click -- removes that
    // window: /pdf/audit/:jobId is fully URL/API-driven and shows its
    // own live progress for a still-running job.
    it('navigates to the audit results page as soon as the job is created, not waiting for upload completion', async () => {
      const user = userEvent.setup();

      renderPage();

      await user.click(screen.getByText('Job Created'));

      expect(mockNavigate).toHaveBeenCalledWith('/pdf/audit/job-just-created-456');
    });

    it('validates the jobId from onJobCreated the same way as onUploadComplete', async () => {
      const user = userEvent.setup();
      const validateSpy = vi.spyOn(validation, 'validateJobId');

      renderPage();

      await user.click(screen.getByText('Job Created'));

      expect(validateSpy).toHaveBeenCalledWith('job-just-created-456');
    });

    it('does not navigate if onJobCreated fires with an invalid jobId', async () => {
      const user = userEvent.setup();

      renderPage();

      await user.click(screen.getByText('Job Created Malicious'));

      expect(mockNavigate).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(
          screen.getByText('Unable to process upload. Please try again or contact support.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('upload error handling', () => {
    it('should display error message when upload fails', async () => {
      const user = userEvent.setup();

      renderPage();

      const errorButton = screen.getByText('Upload Error');
      await user.click(errorButton);

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });
    });

    it('should allow dismissing error alerts', async () => {
      const user = userEvent.setup();

      renderPage();

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

      renderPage();

      const maliciousButton = screen.getByText('Upload Malicious');
      await user.click(maliciousButton);

      // Should not navigate with malicious jobId
      expect(mockNavigate).not.toHaveBeenCalledWith('/pdf/audit/../malicious');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should only accept alphanumeric, hyphen, and underscore in jobId', async () => {
      const user = userEvent.setup();

      renderPage();

      const successButton = screen.getByText('Upload Success');
      await user.click(successButton);

      // Valid jobId with allowed characters should work
      expect(mockNavigate).toHaveBeenCalledWith('/pdf/audit/test-job-123');
    });
  });

  describe('accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderPage();

      const heading = screen.getByRole('heading', { name: /PDF Accessibility/i });
      expect(heading).toBeInTheDocument();
    });

    it('should have descriptive text for the upload section', () => {
      renderPage();

      expect(
        screen.getByText(/analyze its accessibility features and identify issues/i)
      ).toBeInTheDocument();
    });
  });

  describe('Assign to Executive dropdown', () => {
    it('does not show the dropdown for a user with no team membership at all', () => {
      renderPage();

      expect(screen.queryByLabelText('Assign to')).not.toBeInTheDocument();
      expect(mockListTeamExecutives).not.toHaveBeenCalled();
    });

    it('does not show the dropdown for a team membership that is EXECUTIVE, not TEAM_LEADER', () => {
      setCurrentUser({
        teamMemberships: [{ teamRole: 'EXECUTIVE', team: { id: 'team-1', name: 'Cell A' } }],
      });
      renderPage();

      expect(screen.queryByLabelText('Assign to')).not.toBeInTheDocument();
    });

    it('shows the dropdown, grouped by team, for a Team Leader', async () => {
      setCurrentUser({
        teamMemberships: [{ teamRole: 'TEAM_LEADER', team: { id: 'team-1', name: 'Cell A' } }],
      });
      mockListTeamExecutives.mockResolvedValue({
        executives: [
          { userId: 'exec-1', firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com', teamId: 'team-1', teamName: 'Cell A' },
          { userId: 'exec-2', firstName: 'Margaret', lastName: 'Hamilton', email: 'margaret@example.com', teamId: 'team-2', teamName: 'Cell B' },
        ],
      });

      renderPage();

      const select = await screen.findByLabelText('Assign to');
      expect(screen.getByRole('option', { name: 'Myself' })).toBeInTheDocument();
      expect(await screen.findByRole('group', { name: 'Cell A' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Cell B' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Grace Hopper' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Margaret Hamilton' })).toBeInTheDocument();
      expect(select).toHaveValue('');
    });

    it('passes the selected executive as assigneeUserId to the uploader, and omits it again when reset to Myself', async () => {
      const user = userEvent.setup();
      setCurrentUser({
        teamMemberships: [{ teamRole: 'TEAM_LEADER', team: { id: 'team-1', name: 'Cell A' } }],
      });
      mockListTeamExecutives.mockResolvedValue({
        executives: [
          { userId: 'exec-1', firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com', teamId: 'team-1', teamName: 'Cell A' },
        ],
      });

      renderPage();

      expect(await screen.findByText('Assignee: (none)')).toBeInTheDocument();
      await screen.findByRole('option', { name: 'Grace Hopper' });

      await user.selectOptions(screen.getByLabelText('Assign to'), 'exec-1');
      expect(screen.getByText('Assignee: exec-1')).toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText('Assign to'), '');
      expect(screen.getByText('Assignee: (none)')).toBeInTheDocument();
    });
  });

  describe('Full Auto Mode checkbox', () => {
    it('is unchecked by default, and omits fullAutoMode entirely (not false) from the uploader', () => {
      renderPage();

      const checkbox = screen.getByRole('checkbox', { name: 'Full Auto Mode' });
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByText('Full Auto Mode: (unset)')).toBeInTheDocument();
    });

    it('passes fullAutoMode={true} to the uploader once checked, and back to unset when unchecked again', async () => {
      const user = userEvent.setup();
      renderPage();

      const checkbox = screen.getByRole('checkbox', { name: 'Full Auto Mode' });
      await user.click(checkbox);
      expect(screen.getByText('Full Auto Mode: true')).toBeInTheDocument();

      await user.click(checkbox);
      expect(screen.getByText('Full Auto Mode: (unset)')).toBeInTheDocument();
    });
  });
});
