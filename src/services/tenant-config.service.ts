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
 * Per-tenant admin toggle for the axes4 live PAC Cloud check (PR #337) —
 * the paid, per-page-billed external check isn't economically justified as
 * a routine default, so it requires an explicit admin opt-in per tenant on
 * top of the existing env-credential gate. enabledBy/enabledAt form a
 * lightweight audit trail of the last change, same shape both ways.
 */
export interface Axes4Config {
  enabled: boolean;
  enabledBy: string | null;
  enabledAt: string | null;
}

/**
 * Per-tenant admin toggle controlling whether the single-job PDF Audit
 * Results page's Compliance phase requires a generated ACR, in addition
 * to the PAC Report, to show done. Scoped to that page's own progress
 * stepper only -- the separate Workflow Agent's ACR sign-off gate (Gate 4)
 * never reads this and stays non-skippable regardless of this setting.
 * acrRequiredChangedBy/acrRequiredChangedAt form a lightweight audit
 * trail of the last change, same shape as Axes4Config above.
 */
export interface ComplianceConfig {
  acrRequired: boolean;
  acrRequiredChangedBy: string | null;
  acrRequiredChangedAt: string | null;
}

/**
 * Tenant-level reports configuration.
 * Controls how AI explanations are sourced for issue explainability.
 */
export interface ReportsConfig {
  explanationSource: ExplanationSource;
}

/**
 * Tenant-wide defaults for the PDF AI remediation pipeline — the backend
 * bucket (`Tenant.settings.aiRemediation`) also holds tableFixMode,
 * listMode, languageMode, formFieldMode, bookmarkMode,
 * confidenceThreshold, and autoApplyHighConfidence, but this UI only
 * exposes the four fields operators actually need a saved default for:
 * what to do with a client's own alt text, whether color-contrast /
 * link-text fixes get written into the PDF automatically, and whether a
 * newly uploaded PDF auto-starts Auto Remediation on its own (see
 * fullAutoModeDefault below). A per-job override (the Re-run AI Analysis
 * checkboxes, Auto Remediation's own color-contrast dropdown, or
 * DocumentUploader's own Full Auto Mode checkbox at upload time) always
 * wins over this default when one is explicitly sent for that run.
 */
export interface AiRemediationConfig {
  altTextMode: 'apply-to-pdf' | 'guidance-only';
  colorContrastMode: 'guidance-only' | 'disabled' | 'apply-to-pdf';
  linkTextMode: 'guidance-only' | 'disabled' | 'apply-to-pdf';
  /**
   * Tenant-wide default for "Full Auto Mode" (ninja-backend#823) -- when
   * true, a newly uploaded PDF job with no upload-time override
   * auto-starts the existing Auto Mode loop itself once its initial audit
   * + AI analysis complete, instead of waiting for an operator to click
   * "Start Auto Remediation". Off (false) by default.
   */
  fullAutoModeDefault: boolean;
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

  /**
   * Get time metrics configuration (idleThresholdMinutes, gateBaselines).
   */
  async getTimeMetricsConfig(): Promise<TimeMetricsConfig> {
    try {
      const response = await api.get<{ success: boolean; data: TimeMetricsConfig }>(
        '/tenant/config/time-metrics'
      );
      return response.data.data;
    } catch {
      return DEFAULT_TIME_METRICS_CONFIG;
    }
  }

  /**
   * Update time metrics configuration.
   */
  async updateTimeMetricsConfig(updates: Partial<TimeMetricsConfig>): Promise<TimeMetricsConfig> {
    const response = await api.patch<{
      success: boolean;
      data: TimeMetricsConfig;
      message: string;
    }>('/tenant/config/time-metrics', updates);
    return response.data.data;
  }

  /**
   * Get the tenant-wide PDF AI remediation defaults (alt text, color
   * contrast, link text). Readable by any authenticated user — only the
   * PATCH below is admin-restricted.
   */
  async getAiRemediationConfig(): Promise<AiRemediationConfig> {
    try {
      const response = await api.get<{ success: boolean; data: AiRemediationConfig }>(
        '/tenant/config/ai-remediation'
      );
      return response.data.data;
    } catch (error) {
      console.error('[TenantConfig] Failed to fetch AI remediation config:', error);
      // Matches the backend's own DEFAULT_AI_REMEDIATION_CONFIG for these
      // four fields, so a 403 (non-admin) or network failure still renders
      // something sensible rather than leaving the section blank.
      return { altTextMode: 'apply-to-pdf', colorContrastMode: 'guidance-only', linkTextMode: 'guidance-only', fullAutoModeDefault: false };
    }
  }

  /**
   * Update the tenant-wide PDF AI remediation defaults. Admin-only
   * server-side — a non-admin PATCH gets a 403, which this does not
   * swallow (same as updateAxes4Config above). Sending only the fields this
   * UI manages is safe: the backend shallow-merges onto the existing
   * aiRemediation bucket, so tableFixMode/listMode/etc. are left untouched.
   */
  async updateAiRemediationConfig(updates: Partial<AiRemediationConfig>): Promise<AiRemediationConfig> {
    const response = await api.patch<{
      success: boolean;
      data: AiRemediationConfig;
      message: string;
    }>('/tenant/config/ai-remediation', updates);
    return response.data.data;
  }

  /**
   * Get the axes4 live PAC Cloud check tenant toggle. Readable by any
   * authenticated user (not just admins) — only the PATCH below is
   * admin-restricted.
   */
  async getAxes4Config(): Promise<Axes4Config> {
    try {
      const response = await api.get<{ success: boolean; data: Axes4Config }>(
        '/tenant/config/axes4'
      );
      return response.data.data;
    } catch (error) {
      console.error('[TenantConfig] Failed to fetch axes4 config:', error);
      // Off by default on error, matching the backend's own default.
      return { enabled: false, enabledBy: null, enabledAt: null };
    }
  }

  /**
   * Update the axes4 tenant toggle. Admin-only server-side — a non-admin
   * PATCH gets a 403, which this does not swallow (same as
   * updateWorkflowConfig/updateReportsConfig above).
   */
  async updateAxes4Config(updates: { enabled: boolean }): Promise<Axes4Config> {
    const response = await api.patch<{
      success: boolean;
      data: Axes4Config;
      message: string;
    }>('/tenant/config/axes4', updates);
    return response.data.data;
  }

  /**
   * Get the compliance "ACR required" tenant toggle. Readable by any
   * authenticated user (not just admins) — only the PATCH below is
   * admin-restricted.
   */
  async getComplianceConfig(): Promise<ComplianceConfig> {
    try {
      const response = await api.get<{ success: boolean; data: ComplianceConfig }>(
        '/tenant/config/compliance'
      );
      return response.data.data;
    } catch (error) {
      console.error('[TenantConfig] Failed to fetch compliance config:', error);
      // Required by default on error, matching the backend's own default
      // and the page's pre-existing behavior.
      return { acrRequired: true, acrRequiredChangedBy: null, acrRequiredChangedAt: null };
    }
  }

  /**
   * Update the compliance tenant toggle. Admin-only server-side — a
   * non-admin PATCH gets a 403, which this does not swallow (same as
   * updateAxes4Config above).
   */
  async updateComplianceConfig(updates: { acrRequired: boolean }): Promise<ComplianceConfig> {
    const response = await api.patch<{
      success: boolean;
      data: ComplianceConfig;
      message: string;
    }>('/tenant/config/compliance', updates);
    return response.data.data;
  }
}

export interface TimeMetricsConfig {
  idleThresholdMinutes: number;
  gateBaselines: {
    AI_REVIEW: number;
    REMEDIATION_REVIEW: number;
    CONFORMANCE_REVIEW: number;
    ACR_SIGNOFF: number;
  };
}

const DEFAULT_TIME_METRICS_CONFIG: TimeMetricsConfig = {
  idleThresholdMinutes: 2,
  gateBaselines: {
    AI_REVIEW: 15,
    REMEDIATION_REVIEW: 20,
    CONFORMANCE_REVIEW: 25,
    ACR_SIGNOFF: 10,
  },
};

// Export singleton instance
export const tenantConfigService = new TenantConfigService();
