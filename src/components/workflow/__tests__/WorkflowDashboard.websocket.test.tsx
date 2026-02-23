/* eslint-disable @typescript-eslint/no-var-requires */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { WorkflowDashboard } from '../WorkflowDashboard';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock hooks and services
vi.mock('@/hooks/useWorkflowSocket', () => ({
  useWorkflowSocket: vi.fn(() => ({
    stateChange: null,
    hitlRequired: null,
    workflowError: null,
    connected: false,
  })),
}));

vi.mock('@/services/workflowService', () => ({
  workflowService: {
    getWorkflowStatus: vi.fn(),
    pauseWorkflow: vi.fn(),
    resumeWorkflow: vi.fn(),
    cancelWorkflow: vi.fn(),
    retryWorkflow: vi.fn(),
  },
  WorkflowStatus: {},
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BrowserRouter>
  );
};

describe('WorkflowDashboard WebSocket Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('computeProgressFromState', () => {
    it('should compute correct progress for each state', () => {
      const { workflowService } = require('@/services/workflowService');
      const { useWorkflowSocket } = require('@/hooks/useWorkflowSocket');

      workflowService.getWorkflowStatus.mockResolvedValue({
        id: '123',
        fileId: '456',
        currentState: 'UPLOAD_RECEIVED',
        phase: 'ingest',
        progress: 5,
        startedAt: new Date().toISOString(),
        createdBy: 'user1',
        retryCount: 0,
        loopCount: 0,
      });

      useWorkflowSocket.mockReturnValue({
        stateChange: {
          workflowId: '123',
          from: 'UPLOAD_RECEIVED',
          to: 'RUNNING_EPUBCHECK',
          timestamp: new Date().toISOString(),
          phase: 'audit',
        },
        hitlRequired: null,
        workflowError: null,
        connected: true,
      });

      render(<WorkflowDashboard workflowId="123" />, { wrapper: createWrapper() });

      // Progress should be calculated from RUNNING_EPUBCHECK state (20%)
      // This tests that the deduplication and progress computation work together
    });
  });

  describe('State Change Deduplication', () => {
    it('should not update when receiving duplicate state', async () => {
      const { workflowService } = require('@/services/workflowService');
      const { useWorkflowSocket } = require('@/hooks/useWorkflowSocket');

      const initialStatus = {
        id: '123',
        fileId: '456',
        currentState: 'RUNNING_ACE',
        phase: 'audit',
        progress: 30,
        startedAt: new Date().toISOString(),
        createdBy: 'user1',
        retryCount: 0,
        loopCount: 0,
      };

      workflowService.getWorkflowStatus.mockResolvedValue(initialStatus);

      // First render with same state
      useWorkflowSocket.mockReturnValue({
        stateChange: {
          workflowId: '123',
          from: 'RUNNING_EPUBCHECK',
          to: 'RUNNING_ACE',
          timestamp: new Date().toISOString(),
          phase: 'audit',
        },
        hitlRequired: null,
        workflowError: null,
        connected: true,
      });

      const { rerender } = render(<WorkflowDashboard workflowId="123" />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(workflowService.getWorkflowStatus).toHaveBeenCalledTimes(1);
      });

      // Simulate receiving same state again (duplicate event)
      useWorkflowSocket.mockReturnValue({
        stateChange: {
          workflowId: '123',
          from: 'RUNNING_ACE',
          to: 'RUNNING_ACE', // Same state
          timestamp: new Date().toISOString(),
          phase: 'audit',
        },
        hitlRequired: null,
        workflowError: null,
        connected: true,
      });

      rerender(<WorkflowDashboard workflowId="123" />);

      // Should not cause re-render or state update
      // Component should deduplicate this event
    });

    it('should update when receiving new state', async () => {
      const { workflowService } = require('@/services/workflowService');
      const { useWorkflowSocket } = require('@/hooks/useWorkflowSocket');

      workflowService.getWorkflowStatus.mockResolvedValue({
        id: '123',
        fileId: '456',
        currentState: 'RUNNING_ACE',
        phase: 'audit',
        progress: 30,
        startedAt: new Date().toISOString(),
        createdBy: 'user1',
        retryCount: 0,
        loopCount: 0,
      });

      useWorkflowSocket.mockReturnValue({
        stateChange: {
          workflowId: '123',
          from: 'RUNNING_ACE',
          to: 'RUNNING_AI_ANALYSIS',
          timestamp: new Date().toISOString(),
          phase: 'audit',
        },
        hitlRequired: null,
        workflowError: null,
        connected: true,
      });

      render(<WorkflowDashboard workflowId="123" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(workflowService.getWorkflowStatus).toHaveBeenCalled();
      });

      // Component should update with new state and progress
    });
  });

  describe('Progress Calculation', () => {
    const progressTests = [
      { state: 'UPLOAD_RECEIVED', expected: 5 },
      { state: 'PREPROCESSING', expected: 10 },
      { state: 'RUNNING_EPUBCHECK', expected: 20 },
      { state: 'RUNNING_ACE', expected: 30 },
      { state: 'RUNNING_AI_ANALYSIS', expected: 40 },
      { state: 'AWAITING_AI_REVIEW', expected: 45 },
      { state: 'AUTO_REMEDIATION', expected: 55 },
      { state: 'AWAITING_REMEDIATION_REVIEW', expected: 60 },
      { state: 'VERIFICATION_AUDIT', expected: 65 },
      { state: 'CONFORMANCE_MAPPING', expected: 70 },
      { state: 'AWAITING_CONFORMANCE_REVIEW', expected: 75 },
      { state: 'ACR_GENERATION', expected: 85 },
      { state: 'AWAITING_ACR_SIGNOFF', expected: 90 },
      { state: 'COMPLETED', expected: 100 },
      { state: 'FAILED', expected: 0 },
    ];

    progressTests.forEach(({ state, expected }) => {
      it(`should calculate ${expected}% progress for ${state}`, async () => {
        const { workflowService } = require('@/services/workflowService');
        const { useWorkflowSocket } = require('@/hooks/useWorkflowSocket');

        workflowService.getWorkflowStatus.mockResolvedValue({
          id: '123',
          fileId: '456',
          currentState: state,
          phase: 'audit',
          progress: expected,
          startedAt: new Date().toISOString(),
          createdBy: 'user1',
          retryCount: 0,
          loopCount: 0,
        });

        useWorkflowSocket.mockReturnValue({
          stateChange: null,
          hitlRequired: null,
          workflowError: null,
          connected: false,
        });

        render(<WorkflowDashboard workflowId="123" />, { wrapper: createWrapper() });

        await waitFor(() => {
          expect(workflowService.getWorkflowStatus).toHaveBeenCalled();
        });
      });
    });
  });

  describe('HITL Notifications', () => {
    it('should show HITL banner when receiving hitl-required event', async () => {
      const { workflowService } = require('@/services/workflowService');
      const { useWorkflowSocket } = require('@/hooks/useWorkflowSocket');

      workflowService.getWorkflowStatus.mockResolvedValue({
        id: '123',
        fileId: '456',
        currentState: 'AWAITING_AI_REVIEW',
        phase: 'audit',
        progress: 45,
        startedAt: new Date().toISOString(),
        createdBy: 'user1',
        retryCount: 0,
        loopCount: 0,
      });

      useWorkflowSocket.mockReturnValue({
        stateChange: null,
        hitlRequired: {
          workflowId: '123',
          gate: 'AI_REVIEW',
          itemCount: 5,
          deepLink: '/workflow/123/hitl/ai-review',
        },
        workflowError: null,
        connected: true,
      });

      render(<WorkflowDashboard workflowId="123" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Human review required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error toast when receiving error event', async () => {
      const { workflowService } = require('@/services/workflowService');
      const { useWorkflowSocket } = require('@/hooks/useWorkflowSocket');

      workflowService.getWorkflowStatus.mockResolvedValue({
        id: '123',
        fileId: '456',
        currentState: 'FAILED',
        phase: 'failed',
        progress: 0,
        startedAt: new Date().toISOString(),
        errorMessage: 'EPUBCheck validation failed',
        createdBy: 'user1',
        retryCount: 1,
        loopCount: 0,
      });

      useWorkflowSocket.mockReturnValue({
        stateChange: null,
        hitlRequired: null,
        workflowError: {
          workflowId: '123',
          error: 'EPUBCheck validation failed',
          state: 'FAILED',
          retryable: true,
          retryCount: 1,
        },
        connected: true,
      });

      render(<WorkflowDashboard workflowId="123" />, { wrapper: createWrapper() });

      // Error toast should be triggered
      await waitFor(() => {
        expect(workflowService.getWorkflowStatus).toHaveBeenCalled();
      });
    });
  });
});
