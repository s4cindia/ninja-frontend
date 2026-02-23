import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BatchProgressCard } from '../BatchProgressCard';
import { BrowserRouter } from 'react-router-dom';

/**
 * E2E-style integration tests for batch workflow monitoring
 * Tests real-time WebSocket updates for multi-file batch operations
 */

// Mock useBatchSocket hook
const mockUseBatchSocket = vi.fn();
vi.mock('@/hooks/useBatchSocket', () => ({
  useBatchSocket: (batchId: string | null) => mockUseBatchSocket(batchId),
}));

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  );
};

describe('BatchProgressCard E2E Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Batch Workflow Journey', () => {
    it('should show real-time progress updates as files complete', async () => {
      const batchId = '12345678-1234-1234-1234-123456789012';
      let socketProgress: { connected: boolean; progress: Record<string, unknown> | null } = {
        connected: true,
        progress: null,
      };

      const batch = {
        filesUploaded: 10,
        filesAudited: 10,
        filesPlanned: 10,
        batchId,
        name: 'Weekly EPUB Batch',
        totalFiles: 10,
        filesRemediated: 0,
        filesFailed: 0,
        totalIssuesFound: 0,
        autoFixedIssues: 0,
        quickFixIssues: 0,
        manualIssues: 0,
        createdAt: new Date().toISOString(),
        status: 'PROCESSING' as const,
        files: [],
      };

      mockUseBatchSocket.mockReturnValue(socketProgress);

      const { rerender } = render(<BatchProgressCard batch={batch} />, {
        wrapper: createWrapper(),
      });

      // Initial state: 0/10 files
      expect(screen.getByText(/0.*of.*10/i)).toBeInTheDocument();

      // Simulate WebSocket update: 2 files completed
      socketProgress = {
        connected: true,
        progress: {
          batchId,
          completed: 2,
          total: 10,
          currentStages: {},
          failedCount: 0,
        },
      };
      mockUseBatchSocket.mockReturnValue(socketProgress);
      rerender(<BatchProgressCard batch={batch} />);

      // Should update to 2/10
      await waitFor(() => {
        expect(screen.getByText(/2.*of.*10/i)).toBeInTheDocument();
      });

      // Simulate WebSocket update: 5 files completed
      socketProgress = {
        connected: true,
        progress: {
          batchId,
          completed: 5,
          total: 10,
          currentStages: {},
          failedCount: 0,
        },
      };
      mockUseBatchSocket.mockReturnValue(socketProgress);
      rerender(<BatchProgressCard batch={batch} />);

      // Should update to 5/10
      await waitFor(() => {
        expect(screen.getByText(/5.*of.*10/i)).toBeInTheDocument();
      });

      // Simulate WebSocket update: All 10 files completed
      socketProgress = {
        connected: true,
        progress: {
          batchId,
          completed: 10,
          total: 10,
          currentStages: {},
          failedCount: 0,
        },
      };
      mockUseBatchSocket.mockReturnValue(socketProgress);
      rerender(<BatchProgressCard batch={batch} />);

      // Should show 100% completion
      await waitFor(() => {
        expect(screen.getAllByText(/100%/)).toHaveLength(2); // Shown twice in UI
      });
    });

    it('should handle batch with failures', async () => {
      const batchId = '12345678-1234-1234-1234-123456789012';

      const batch = {
        filesUploaded: 10,
        filesAudited: 10,
        filesPlanned: 10,
        batchId,
        name: 'Mixed Results Batch',
        totalFiles: 15,
        filesRemediated: 10,
        filesFailed: 3,
        totalIssuesFound: 50,
        autoFixedIssues: 30,
        quickFixIssues: 10,
        manualIssues: 10,
        createdAt: new Date().toISOString(),
        status: 'PROCESSING' as const,
        files: [],
      };

      mockUseBatchSocket.mockReturnValue({
        connected: true,
        progress: {
          batchId,
          completed: 13,
          total: 15,
          currentStages: {},
          failedCount: 3,
        },
      });

      render(<BatchProgressCard batch={batch} />, {
        wrapper: createWrapper(),
      });

      // Should show total completed
      await waitFor(() => {
        expect(screen.getByText(/13.*of.*15/i)).toBeInTheDocument();
      });

      // Should show failed count in Failed section
      const failedSection = screen.getByText(/Failed/i).closest('div');
      expect(failedSection).toHaveTextContent('3');

      // Should show percentage (13/15 = 87%)
      expect(screen.getAllByText(/87%/)).toHaveLength(2);
    });
  });

  describe('WebSocket Connection States', () => {
    it('should use WebSocket data when connected', async () => {
      const batchId = '12345678-1234-1234-1234-123456789012';

      const batch = {
        filesUploaded: 10,
        filesAudited: 10,
        filesPlanned: 10,
        batchId,
        name: 'Test Batch',
        totalFiles: 10,
        filesRemediated: 3,
        filesFailed: 1,
        totalIssuesFound: 20,
        autoFixedIssues: 10,
        quickFixIssues: 5,
        manualIssues: 5,
        createdAt: new Date().toISOString(),
        status: 'PROCESSING' as const,
        files: [],
      };

      // WebSocket provides different data than props
      mockUseBatchSocket.mockReturnValue({
        connected: true,
        progress: {
          batchId,
          completed: 7, // Different from props (3 + 1 = 4)
          total: 10,
          currentStages: {},
          failedCount: 1,
        },
      });

      render(<BatchProgressCard batch={batch} />, {
        wrapper: createWrapper(),
      });

      // Should use WebSocket data (7) not props data (4)
      await waitFor(() => {
        expect(screen.getByText(/7.*of.*10/i)).toBeInTheDocument();
      });
    });

    it('should fall back to props when WebSocket disconnected', async () => {
      const batchId = '12345678-1234-1234-1234-123456789012';

      const batch = {
        filesUploaded: 10,
        filesAudited: 10,
        filesPlanned: 10,
        batchId,
        name: 'Test Batch',
        totalFiles: 10,
        filesRemediated: 3,
        filesFailed: 1,
        totalIssuesFound: 20,
        autoFixedIssues: 10,
        quickFixIssues: 5,
        manualIssues: 5,
        createdAt: new Date().toISOString(),
        status: 'PROCESSING' as const,
        files: [],
      };

      // WebSocket not connected, no progress data
      mockUseBatchSocket.mockReturnValue({
        connected: false,
        progress: null,
      });

      render(<BatchProgressCard batch={batch} />, {
        wrapper: createWrapper(),
      });

      // Should use props data (3 + 1 = 4)
      await waitFor(() => {
        expect(screen.getByText(/4.*of.*10/i)).toBeInTheDocument();
      });
    });

    it('should handle WebSocket reconnection gracefully', async () => {
      const batchId = '12345678-1234-1234-1234-123456789012';

      const batch = {
        filesUploaded: 10,
        filesAudited: 10,
        filesPlanned: 10,
        batchId,
        name: 'Test Batch',
        totalFiles: 10,
        filesRemediated: 2,
        filesFailed: 0,
        totalIssuesFound: 10,
        autoFixedIssues: 5,
        quickFixIssues: 3,
        manualIssues: 2,
        createdAt: new Date().toISOString(),
        status: 'PROCESSING' as const,
        files: [],
      };

      // Start disconnected
      let socketState: { connected: boolean; progress: Record<string, unknown> | null } = {
        connected: false,
        progress: null,
      };

      mockUseBatchSocket.mockReturnValue(socketState);

      const { rerender } = render(<BatchProgressCard batch={batch} />, {
        wrapper: createWrapper(),
      });

      // Should show props data
      expect(screen.getByText(/2.*of.*10/i)).toBeInTheDocument();

      // Simulate reconnection with updated data
      socketState = {
        connected: true,
        progress: {
          batchId,
          completed: 5,
          total: 10,
          currentStages: {},
          failedCount: 0,
        },
      };
      mockUseBatchSocket.mockReturnValue(socketState);
      rerender(<BatchProgressCard batch={batch} />);

      // Should switch to WebSocket data
      await waitFor(() => {
        expect(screen.getByText(/5.*of.*10/i)).toBeInTheDocument();
      });
    });
  });

  describe('Progress Percentage Display', () => {
    it('should calculate and display correct percentage', async () => {
      const batchId = '12345678-1234-1234-1234-123456789012';

      const batch = {
        filesUploaded: 10,
        filesAudited: 10,
        filesPlanned: 10,
        batchId,
        name: 'Test Batch',
        totalFiles: 20,
        filesRemediated: 0,
        filesFailed: 0,
        totalIssuesFound: 0,
        autoFixedIssues: 0,
        quickFixIssues: 0,
        manualIssues: 0,
        createdAt: new Date().toISOString(),
        status: 'PROCESSING' as const,
        files: [],
      };

      mockUseBatchSocket.mockReturnValue({
        connected: true,
        progress: {
          batchId,
          completed: 10, // 10/20 = 50%
          total: 20,
          currentStages: {},
          failedCount: 2,
        },
      });

      render(<BatchProgressCard batch={batch} />, {
        wrapper: createWrapper(),
      });

      // Should show 50%
      await waitFor(() => {
        expect(screen.getAllByText(/50%/)).toHaveLength(2);
      });

      // Should show remediated count (completed - failed = 8)
      expect(screen.getByText(/Remediated Files/i)).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('should handle 0 total files gracefully', async () => {
      const batchId = '12345678-1234-1234-1234-123456789012';

      const batch = {
        filesUploaded: 10,
        filesAudited: 10,
        filesPlanned: 10,
        batchId,
        name: 'Empty Batch',
        totalFiles: 0,
        filesRemediated: 0,
        filesFailed: 0,
        totalIssuesFound: 0,
        autoFixedIssues: 0,
        quickFixIssues: 0,
        manualIssues: 0,
        createdAt: new Date().toISOString(),
        status: 'DRAFT' as const,
        files: [],
      };

      mockUseBatchSocket.mockReturnValue({
        connected: true,
        progress: {
          batchId,
          completed: 0,
          total: 0,
          currentStages: {},
          failedCount: 0,
        },
      });

      render(<BatchProgressCard batch={batch} />, {
        wrapper: createWrapper(),
      });

      // Should show 0% not NaN or error
      expect(screen.getAllByText(/0%/)).toHaveLength(2);
      expect(screen.getByText(/0.*of.*0/i)).toBeInTheDocument();
    });
  });

  describe('Rapid Updates', () => {
    it('should handle rapid progress updates without flickering', async () => {
      const batchId = '12345678-1234-1234-1234-123456789012';

      const batch = {
        filesUploaded: 10,
        filesAudited: 10,
        filesPlanned: 10,
        batchId,
        name: 'Fast Batch',
        totalFiles: 20,
        filesRemediated: 0,
        filesFailed: 0,
        totalIssuesFound: 0,
        autoFixedIssues: 0,
        quickFixIssues: 0,
        manualIssues: 0,
        createdAt: new Date().toISOString(),
        status: 'PROCESSING' as const,
        files: [],
      };

      let socketProgress: { connected: boolean; progress: Record<string, unknown> | null } = {
        connected: true,
        progress: {
          batchId,
          completed: 0,
          total: 20,
          currentStages: {},
          failedCount: 0,
        },
      };

      mockUseBatchSocket.mockReturnValue(socketProgress);

      const { rerender } = render(<BatchProgressCard batch={batch} />, {
        wrapper: createWrapper(),
      });

      // Simulate rapid updates (every 10ms)
      for (let i = 1; i <= 20; i++) {
        socketProgress = {
          connected: true,
          progress: {
            batchId,
            completed: i,
            total: 20,
            currentStages: {},
            failedCount: 0,
          },
        };
        mockUseBatchSocket.mockReturnValue(socketProgress);
        rerender(<BatchProgressCard batch={batch} />);

        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Should reach final state
      await waitFor(() => {
        expect(screen.getByText(/20.*of.*20/i)).toBeInTheDocument();
        expect(screen.getAllByText(/100%/)).toHaveLength(2);
      });
    });
  });

  describe('Failed Counts', () => {
    it('should correctly calculate remediated vs failed', async () => {
      const batchId = '12345678-1234-1234-1234-123456789012';

      const batch = {
        filesUploaded: 10,
        filesAudited: 10,
        filesPlanned: 10,
        batchId,
        name: 'Test Batch',
        totalFiles: 10,
        filesRemediated: 0,
        filesFailed: 0,
        totalIssuesFound: 0,
        autoFixedIssues: 0,
        quickFixIssues: 0,
        manualIssues: 0,
        createdAt: new Date().toISOString(),
        status: 'PROCESSING' as const,
        files: [],
      };

      mockUseBatchSocket.mockReturnValue({
        connected: true,
        progress: {
          batchId,
          completed: 10, // All files processed
          total: 10,
          currentStages: {},
          failedCount: 3, // 3 failed
        },
      });

      render(<BatchProgressCard batch={batch} />, {
        wrapper: createWrapper(),
      });

      // Should show remediated = completed - failed = 7
      await waitFor(() => {
        expect(screen.getByText(/Remediated Files/i)).toBeInTheDocument();
      });

      const remediatedSection = screen.getByText(/Remediated Files/i).closest('div');
      expect(remediatedSection).toHaveTextContent('7');

      // Should show failed count = 3
      const failedSection = screen.getByText(/Failed/i).closest('div');
      expect(failedSection).toHaveTextContent('3');
    });
  });
});
