import { api } from './api';

/**
 * Configuration for HITL (Human-in-the-Loop) gate timeouts.
 * Values are in milliseconds. null means no timeout (manual approval required).
 */
export interface HitlGateConfig {
  AWAITING_AI_REVIEW?: number | null;
  AWAITING_REMEDIATION_REVIEW?: number | null;
  AWAITING_CONFORMANCE_REVIEW?: number | null;
  AWAITING_ACR_SIGNOFF?: number | null;
}

/**
 * Configuration for automatic retry behavior when workflows fail.
 */
export interface AutoRetryConfig {
  enabled: boolean;
  maxRetries: number;
  backoffMs: number;
  retryableStates: string[];
}

/**
 * Tenant-level batch policy configuration.
 * Controls whether fully headless (no human review) batches are permitted.
 */
export interface BatchPolicyTenantConfig {
  /** When true, batches may set all gates to 'auto-accept' with no human review. */
  allowFullyHeadless: boolean;
}

export type ExplanationSource = 'hardcoded' | 'gemini' | 'hybrid';

/**
 * Tenant-level reports configuration.
 * Controls how AI explanations are sourced for issue explainability.
 */
export interface ReportsConfig {
  explanationSource: ExplanationSource;
}

/**
 * Complete workflow configuration.
 */
export interface WorkflowConfig {
  enabled: boolean;
  hitlGates?: HitlGateConfig;
  autoRetry?: AutoRetryConfig;
  batchPolicy?: BatchPolicyTenantConfig;
}

/**
 * Request body for updating workflow configuration.
 */
export interface WorkflowConfigUpdate {
  enabled?: boolean;
  hitlGates?: Partial<HitlGateConfig>;
  autoRetry?: Partial<AutoRetryConfig>;
  batchPolicy?: Partial<BatchPolicyTenantConfig>;
}

/**
 * Service for managing tenant-level workflow configuration.
 * Provides methods to fetch and update workflow settings.
 */
class TenantConfigService {
  /**
   * Get current workflow configuration for the authenticated tenant.
   * Returns merged configuration (tenant settings + defaults).
   *
   * @returns Promise resolving to workflow configuration
   * @throws Error if request fails
   */
  async getWorkflowConfig(): Promise<WorkflowConfig> {
    try {
      const response = await api.get<{ success: boolean; data: WorkflowConfig }>(
        '/tenant/config/workflow'
      );
      return response.data.data;
    } catch (error) {
      console.error('[TenantConfig] Failed to fetch workflow config:', error);
      // Return default config on error (disabled)
      return {
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
        batchPolicy: {
          allowFullyHeadless: false,
        },
      };
    }
  }

  /**
   * Update workflow configuration for the authenticated tenant.
   * Validates input, merges with existing settings, and returns new config.
   *
   * @param updates - Partial workflow configuration to update
   * @returns Promise resolving to updated workflow configuration
   * @throws Error if request fails or validation error occurs
   */
  async updateWorkflowConfig(updates: WorkflowConfigUpdate): Promise<WorkflowConfig> {
    const response = await api.patch<{
      success: boolean;
      data: WorkflowConfig;
      message: string;
    }>('/tenant/config/workflow', updates);
    return response.data.data;
  }

  /**
   * Get current reports configuration (explanation source setting).
   */
  async getReportsConfig(): Promise<ReportsConfig> {
    try {
      const response = await api.get<{ success: boolean; data: ReportsConfig }>(
        '/tenant/config/reports'
      );
      return response.data.data;
    } catch {
      return { explanationSource: 'hardcoded' };
    }
  }

  /**
   * Update reports configuration for the authenticated tenant.
   */
  async updateReportsConfig(updates: Partial<ReportsConfig>): Promise<ReportsConfig> {
    const response = await api.patch<{
      success: boolean;
      data: ReportsConfig;
      message: string;
    }>('/tenant/config/reports', updates);
    return response.data.data;
  }
}

// Export singleton instance
export const tenantConfigService = new TenantConfigService();
