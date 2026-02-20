import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tenantConfigService, WorkflowConfig } from '../tenant-config.service';
import { api } from '../api';

// Mock the api service
vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('TenantConfigService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWorkflowConfig', () => {
    it('should fetch and return workflow configuration', async () => {
      const mockConfig: WorkflowConfig = {
        enabled: true,
        hitlGates: {
          AWAITING_AI_REVIEW: 30000,
          AWAITING_REMEDIATION_REVIEW: 60000,
          AWAITING_CONFORMANCE_REVIEW: 60000,
          AWAITING_ACR_SIGNOFF: null,
        },
        autoRetry: {
          enabled: false,
          maxRetries: 3,
          backoffMs: 5000,
          retryableStates: ['FAILED'],
        },
      };

      vi.mocked(api.get).mockResolvedValue({
        data: {
          success: true,
          data: mockConfig,
        },
      } as any);

      const config = await tenantConfigService.getWorkflowConfig();

      expect(api.get).toHaveBeenCalledWith('/tenant/config/workflow');
      expect(config).toEqual(mockConfig);
      expect(config.enabled).toBe(true);
      expect(config.hitlGates?.AWAITING_AI_REVIEW).toBe(30000);
    });

    it('should return default config on API error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const config = await tenantConfigService.getWorkflowConfig();

      expect(config.enabled).toBe(false); // Default
      expect(config.hitlGates?.AWAITING_AI_REVIEW).toBe(3600000); // Default 1 hour
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[TenantConfig] Failed to fetch workflow config:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle disabled workflow configuration', async () => {
      const mockConfig: WorkflowConfig = {
        enabled: false,
        hitlGates: {
          AWAITING_AI_REVIEW: 3600000,
          AWAITING_REMEDIATION_REVIEW: 3600000,
          AWAITING_CONFORMANCE_REVIEW: 3600000,
          AWAITING_ACR_SIGNOFF: null,
        },
        autoRetry: {
          enabled: false,
          maxRetries: 3,
          backoffMs: 5000,
          retryableStates: ['FAILED'],
        },
      };

      vi.mocked(api.get).mockResolvedValue({
        data: {
          success: true,
          data: mockConfig,
        },
      } as any);

      const config = await tenantConfigService.getWorkflowConfig();

      expect(config.enabled).toBe(false);
    });

    it('should handle null timeout values correctly', async () => {
      const mockConfig: WorkflowConfig = {
        enabled: true,
        hitlGates: {
          AWAITING_AI_REVIEW: null, // Manual approval
          AWAITING_REMEDIATION_REVIEW: 60000,
          AWAITING_CONFORMANCE_REVIEW: 60000,
          AWAITING_ACR_SIGNOFF: null,
        },
        autoRetry: {
          enabled: false,
          maxRetries: 3,
          backoffMs: 5000,
          retryableStates: ['FAILED'],
        },
      };

      vi.mocked(api.get).mockResolvedValue({
        data: {
          success: true,
          data: mockConfig,
        },
      } as any);

      const config = await tenantConfigService.getWorkflowConfig();

      expect(config.hitlGates?.AWAITING_AI_REVIEW).toBe(null);
    });
  });

  describe('updateWorkflowConfig', () => {
    it('should update workflow configuration', async () => {
      const updates = {
        enabled: true,
        hitlGates: {
          AWAITING_AI_REVIEW: 30000,
        },
      };

      const expectedConfig: WorkflowConfig = {
        enabled: true,
        hitlGates: {
          AWAITING_AI_REVIEW: 30000,
          AWAITING_REMEDIATION_REVIEW: 3600000,
          AWAITING_CONFORMANCE_REVIEW: 3600000,
          AWAITING_ACR_SIGNOFF: null,
        },
        autoRetry: {
          enabled: false,
          maxRetries: 3,
          backoffMs: 5000,
          retryableStates: ['FAILED'],
        },
      };

      vi.mocked(api.patch).mockResolvedValue({
        data: {
          success: true,
          data: expectedConfig,
          message: 'Workflow configuration updated successfully',
        },
      } as any);

      const config = await tenantConfigService.updateWorkflowConfig(updates);

      expect(api.patch).toHaveBeenCalledWith('/tenant/config/workflow', updates);
      expect(config).toEqual(expectedConfig);
      expect(config.enabled).toBe(true);
      expect(config.hitlGates?.AWAITING_AI_REVIEW).toBe(30000);
    });

    it('should enable workflow', async () => {
      const updates = { enabled: true };

      const expectedConfig: WorkflowConfig = {
        enabled: true,
        hitlGates: {
          AWAITING_AI_REVIEW: 3600000,
          AWAITING_REMEDIATION_REVIEW: 3600000,
          AWAITING_CONFORMANCE_REVIEW: 3600000,
          AWAITING_ACR_SIGNOFF: null,
        },
        autoRetry: {
          enabled: false,
          maxRetries: 3,
          backoffMs: 5000,
          retryableStates: ['FAILED'],
        },
      };

      vi.mocked(api.patch).mockResolvedValue({
        data: {
          success: true,
          data: expectedConfig,
          message: 'Workflow configuration updated successfully',
        },
      } as any);

      const config = await tenantConfigService.updateWorkflowConfig(updates);

      expect(config.enabled).toBe(true);
    });

    it('should disable workflow', async () => {
      const updates = { enabled: false };

      const expectedConfig: WorkflowConfig = {
        enabled: false,
        hitlGates: {
          AWAITING_AI_REVIEW: 3600000,
          AWAITING_REMEDIATION_REVIEW: 3600000,
          AWAITING_CONFORMANCE_REVIEW: 3600000,
          AWAITING_ACR_SIGNOFF: null,
        },
        autoRetry: {
          enabled: false,
          maxRetries: 3,
          backoffMs: 5000,
          retryableStates: ['FAILED'],
        },
      };

      vi.mocked(api.patch).mockResolvedValue({
        data: {
          success: true,
          data: expectedConfig,
          message: 'Workflow configuration updated successfully',
        },
      } as any);

      const config = await tenantConfigService.updateWorkflowConfig(updates);

      expect(config.enabled).toBe(false);
    });

    it('should update multiple HITL gate timeouts', async () => {
      const updates = {
        hitlGates: {
          AWAITING_AI_REVIEW: 30000,
          AWAITING_REMEDIATION_REVIEW: 60000,
          AWAITING_ACR_SIGNOFF: null,
        },
      };

      const expectedConfig: WorkflowConfig = {
        enabled: true,
        hitlGates: {
          AWAITING_AI_REVIEW: 30000,
          AWAITING_REMEDIATION_REVIEW: 60000,
          AWAITING_CONFORMANCE_REVIEW: 3600000,
          AWAITING_ACR_SIGNOFF: null,
        },
        autoRetry: {
          enabled: false,
          maxRetries: 3,
          backoffMs: 5000,
          retryableStates: ['FAILED'],
        },
      };

      vi.mocked(api.patch).mockResolvedValue({
        data: {
          success: true,
          data: expectedConfig,
          message: 'Workflow configuration updated successfully',
        },
      } as any);

      const config = await tenantConfigService.updateWorkflowConfig(updates);

      expect(config.hitlGates?.AWAITING_AI_REVIEW).toBe(30000);
      expect(config.hitlGates?.AWAITING_REMEDIATION_REVIEW).toBe(60000);
      expect(config.hitlGates?.AWAITING_ACR_SIGNOFF).toBe(null);
    });

    it('should propagate API errors', async () => {
      const updates = { enabled: true };

      vi.mocked(api.patch).mockRejectedValue(new Error('Validation error'));

      await expect(tenantConfigService.updateWorkflowConfig(updates)).rejects.toThrow(
        'Validation error'
      );
    });

    it('should handle partial updates', async () => {
      const updates = {
        hitlGates: {
          AWAITING_AI_REVIEW: 15000, // Only update one gate
        },
      };

      const expectedConfig: WorkflowConfig = {
        enabled: false,
        hitlGates: {
          AWAITING_AI_REVIEW: 15000,
          AWAITING_REMEDIATION_REVIEW: 3600000,
          AWAITING_CONFORMANCE_REVIEW: 3600000,
          AWAITING_ACR_SIGNOFF: null,
        },
        autoRetry: {
          enabled: false,
          maxRetries: 3,
          backoffMs: 5000,
          retryableStates: ['FAILED'],
        },
      };

      vi.mocked(api.patch).mockResolvedValue({
        data: {
          success: true,
          data: expectedConfig,
          message: 'Workflow configuration updated successfully',
        },
      } as any);

      const config = await tenantConfigService.updateWorkflowConfig(updates);

      expect(config.hitlGates?.AWAITING_AI_REVIEW).toBe(15000);
      expect(config.hitlGates?.AWAITING_REMEDIATION_REVIEW).toBe(3600000);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully in getWorkflowConfig', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(api.get).mockRejectedValue(new Error('Network timeout'));

      const config = await tenantConfigService.getWorkflowConfig();

      expect(config.enabled).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle 401 unauthorized errors', async () => {
      const error = new Error('Unauthorized');
      (error as any).response = { status: 401 };

      vi.mocked(api.get).mockRejectedValue(error);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const config = await tenantConfigService.getWorkflowConfig();

      expect(config.enabled).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should handle 500 server errors', async () => {
      const error = new Error('Internal server error');
      (error as any).response = { status: 500 };

      vi.mocked(api.get).mockRejectedValue(error);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const config = await tenantConfigService.getWorkflowConfig();

      expect(config.enabled).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });
});
