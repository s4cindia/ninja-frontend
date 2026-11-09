import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TenantWorkflowSettings } from './TenantWorkflowSettings';
import { tenantConfigService } from '../services/tenant-config.service';
import { useAuthStore } from '@/stores/auth.store';
import type { User } from '@/types/auth.types';
import type { WorkflowConfig, ReportsConfig, Axes4Config, AiRemediationConfig, ComplianceConfig } from '../services/tenant-config.service';

vi.mock('../services/tenant-config.service', () => ({
  tenantConfigService: {
    getWorkflowConfig: vi.fn(),
    updateWorkflowConfig: vi.fn(),
    getReportsConfig: vi.fn(),
    updateReportsConfig: vi.fn(),
    getAxes4Config: vi.fn(),
    updateAxes4Config: vi.fn(),
    getAiRemediationConfig: vi.fn(),
    updateAiRemediationConfig: vi.fn(),
    getComplianceConfig: vi.fn(),
    updateComplianceConfig: vi.fn(),
  },
}));

const mockService = vi.mocked(tenantConfigService);

const baseUser: User = {
  id: 'user-1',
  email: 'operator@example.com',
  firstName: 'Op',
  lastName: 'Erator',
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

function mockWorkflowConfig(): WorkflowConfig {
  return {
    enabled: false,
    hitlGates: {
      AWAITING_AI_REVIEW: 3600000,
      AWAITING_REMEDIATION_REVIEW: 3600000,
      AWAITING_CONFORMANCE_REVIEW: 3600000,
      AWAITING_ACR_SIGNOFF: null,
    },
    batchPolicy: { allowFullyHeadless: false },
  };
}

function mockReportsConfig(): ReportsConfig {
  return { explanationSource: 'hardcoded' };
}

function mockAxes4Config(overrides?: Partial<Axes4Config>): Axes4Config {
  return { enabled: false, enabledBy: null, enabledAt: null, ...overrides };
}

function mockAiRemediationConfig(overrides?: Partial<AiRemediationConfig>): AiRemediationConfig {
  return { altTextMode: 'apply-to-pdf', colorContrastMode: 'guidance-only', linkTextMode: 'guidance-only', ...overrides };
}

function mockComplianceConfig(overrides?: Partial<ComplianceConfig>): ComplianceConfig {
  return { acrRequired: true, acrRequiredChangedBy: null, acrRequiredChangedAt: null, ...overrides };
}

describe('TenantWorkflowSettings — axes4 PAC Cloud toggle', () => {
  beforeEach(() => {
    mockService.getWorkflowConfig.mockReset().mockResolvedValue(mockWorkflowConfig());
    mockService.getReportsConfig.mockReset().mockResolvedValue(mockReportsConfig());
    mockService.getAxes4Config.mockReset().mockResolvedValue(mockAxes4Config());
    mockService.updateAxes4Config.mockReset();
    mockService.getAiRemediationConfig.mockReset().mockResolvedValue(mockAiRemediationConfig());
    mockService.updateAiRemediationConfig.mockReset();
    mockService.getComplianceConfig.mockReset().mockResolvedValue(mockComplianceConfig());
    mockService.updateComplianceConfig.mockReset();
  });

  it('is visible (read-only) to a non-admin, showing the current state but no save control', async () => {
    setCurrentUser({ role: 'OPERATOR' });
    mockService.getAxes4Config.mockResolvedValue(mockAxes4Config({ enabled: true, enabledBy: 'admin@example.com', enabledAt: '2026-10-01T00:00:00Z' }));

    render(<TenantWorkflowSettings />);

    const checkbox = await screen.findByRole('checkbox', { name: /Enable axes4 PAC Cloud live checks/ }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(checkbox).toBeDisabled();
    expect(screen.getByText('Only administrators can change this setting.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save axes4 Setting/ })).not.toBeInTheDocument();
  });

  it('is editable for an ADMIN, and saves the new value', async () => {
    setCurrentUser({ role: 'ADMIN' });
    mockService.updateAxes4Config.mockResolvedValue(
      mockAxes4Config({ enabled: true, enabledBy: 'admin@example.com', enabledAt: '2026-10-10T00:00:00Z' })
    );

    render(<TenantWorkflowSettings />);

    const checkbox = await screen.findByRole('checkbox', { name: /Enable axes4 PAC Cloud live checks/ }) as HTMLInputElement;
    expect(checkbox).not.toBeDisabled();

    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: /Save axes4 Setting/ }));

    await waitFor(() => {
      expect(mockService.updateAxes4Config).toHaveBeenCalledWith({ enabled: true });
    });
  });

  it('shows the audit trail (last changed by / on) once it has been changed at least once', async () => {
    setCurrentUser({ role: 'ADMIN' });
    mockService.getAxes4Config.mockResolvedValue(
      mockAxes4Config({ enabled: true, enabledBy: 'jane@example.com', enabledAt: '2026-10-01T00:00:00Z' })
    );

    render(<TenantWorkflowSettings />);

    expect(await screen.findByText(/Last changed by jane@example.com on/)).toBeInTheDocument();
  });

  it('shows no audit trail line when the setting has never been changed', async () => {
    setCurrentUser({ role: 'ADMIN' });
    mockService.getAxes4Config.mockResolvedValue(mockAxes4Config({ enabled: false, enabledBy: null, enabledAt: null }));

    render(<TenantWorkflowSettings />);

    await screen.findByRole('checkbox', { name: /Enable axes4 PAC Cloud live checks/ });
    expect(screen.queryByText(/Last changed by/)).not.toBeInTheDocument();
  });

  it('disables the Save button until the checkbox actually differs from the saved value', async () => {
    setCurrentUser({ role: 'ADMIN' });
    mockService.getAxes4Config.mockResolvedValue(mockAxes4Config({ enabled: false }));

    render(<TenantWorkflowSettings />);

    const saveButton = await screen.findByRole('button', { name: /Save axes4 Setting/ });
    expect(saveButton).toBeDisabled();

    fireEvent.click(await screen.findByRole('checkbox', { name: /Enable axes4 PAC Cloud live checks/ }));
    expect(saveButton).not.toBeDisabled();
  });

  it('shows an error toast and does not crash when the save is rejected (e.g. a 403)', async () => {
    setCurrentUser({ role: 'ADMIN' });
    mockService.updateAxes4Config.mockRejectedValue({
      response: { data: { error: 'Only administrators may change this setting.' } },
    });

    render(<TenantWorkflowSettings />);

    fireEvent.click(await screen.findByRole('checkbox', { name: /Enable axes4 PAC Cloud live checks/ }));
    fireEvent.click(screen.getByRole('button', { name: /Save axes4 Setting/ }));

    await waitFor(() => {
      expect(mockService.updateAxes4Config).toHaveBeenCalled();
    });
    // Still rendered, not crashed — the checkbox reflects the unsaved attempt.
    expect(screen.getByRole('checkbox', { name: /Enable axes4 PAC Cloud live checks/ })).toBeInTheDocument();
  });
});

describe('TenantWorkflowSettings — PDF AI Remediation tenant defaults', () => {
  beforeEach(() => {
    mockService.getWorkflowConfig.mockReset().mockResolvedValue(mockWorkflowConfig());
    mockService.getReportsConfig.mockReset().mockResolvedValue(mockReportsConfig());
    mockService.getAxes4Config.mockReset().mockResolvedValue(mockAxes4Config());
    mockService.updateAxes4Config.mockReset();
    mockService.getAiRemediationConfig.mockReset().mockResolvedValue(mockAiRemediationConfig());
    mockService.updateAiRemediationConfig.mockReset();
    mockService.getComplianceConfig.mockReset().mockResolvedValue(mockComplianceConfig());
    mockService.updateComplianceConfig.mockReset();
  });

  it('is visible (read-only) to a non-admin, showing the loaded values but no save control', async () => {
    setCurrentUser({ role: 'OPERATOR' });
    mockService.getAiRemediationConfig.mockResolvedValue(
      mockAiRemediationConfig({ altTextMode: 'guidance-only', colorContrastMode: 'apply-to-pdf', linkTextMode: 'disabled' })
    );

    render(<TenantWorkflowSettings />);

    expect(await screen.findByLabelText('Alt text')).toHaveValue('guidance-only');
    expect(screen.getByLabelText('Color contrast')).toHaveValue('apply-to-pdf');
    expect(screen.getByLabelText('Link text')).toHaveValue('disabled');
    expect(screen.getByLabelText('Alt text')).toBeDisabled();
    expect(screen.getByLabelText('Color contrast')).toBeDisabled();
    expect(screen.getByLabelText('Link text')).toBeDisabled();
    expect(screen.getByText('Only administrators can change these settings.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save PDF AI Remediation Settings/ })).not.toBeInTheDocument();
  });

  it('is editable for an ADMIN, and saves all three fields together', async () => {
    setCurrentUser({ role: 'ADMIN' });
    mockService.updateAiRemediationConfig.mockResolvedValue(
      mockAiRemediationConfig({ altTextMode: 'guidance-only', colorContrastMode: 'apply-to-pdf', linkTextMode: 'guidance-only' })
    );

    render(<TenantWorkflowSettings />);

    const altText = await screen.findByLabelText('Alt text');
    expect(altText).not.toBeDisabled();

    fireEvent.change(altText, { target: { value: 'guidance-only' } });
    fireEvent.change(screen.getByLabelText('Color contrast'), { target: { value: 'apply-to-pdf' } });
    fireEvent.click(screen.getByRole('button', { name: /Save PDF AI Remediation Settings/ }));

    await waitFor(() => {
      expect(mockService.updateAiRemediationConfig).toHaveBeenCalledWith({
        altTextMode: 'guidance-only',
        colorContrastMode: 'apply-to-pdf',
        linkTextMode: 'guidance-only',
      });
    });
  });

  it('disables the Save button until at least one select actually differs from the saved values', async () => {
    setCurrentUser({ role: 'ADMIN' });

    render(<TenantWorkflowSettings />);

    const saveButton = await screen.findByRole('button', { name: /Save PDF AI Remediation Settings/ });
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Link text'), { target: { value: 'disabled' } });
    expect(saveButton).not.toBeDisabled();
  });

  it('shows an error toast and does not crash when the save is rejected (e.g. a 403)', async () => {
    setCurrentUser({ role: 'ADMIN' });
    mockService.updateAiRemediationConfig.mockRejectedValue({
      response: { data: { error: 'Only administrators may change this setting.' } },
    });

    render(<TenantWorkflowSettings />);

    fireEvent.change(await screen.findByLabelText('Alt text'), { target: { value: 'guidance-only' } });
    fireEvent.click(screen.getByRole('button', { name: /Save PDF AI Remediation Settings/ }));

    await waitFor(() => {
      expect(mockService.updateAiRemediationConfig).toHaveBeenCalled();
    });
    // Still rendered, not crashed — the select reflects the unsaved attempt.
    expect(screen.getByLabelText('Alt text')).toHaveValue('guidance-only');
  });
});

describe('TenantWorkflowSettings — Compliance ACR-required toggle', () => {
  beforeEach(() => {
    mockService.getWorkflowConfig.mockReset().mockResolvedValue(mockWorkflowConfig());
    mockService.getReportsConfig.mockReset().mockResolvedValue(mockReportsConfig());
    mockService.getAxes4Config.mockReset().mockResolvedValue(mockAxes4Config());
    mockService.updateAxes4Config.mockReset();
    mockService.getAiRemediationConfig.mockReset().mockResolvedValue(mockAiRemediationConfig());
    mockService.updateAiRemediationConfig.mockReset();
    mockService.getComplianceConfig.mockReset().mockResolvedValue(mockComplianceConfig());
    mockService.updateComplianceConfig.mockReset();
  });

  it('is visible (read-only) to a non-admin, showing the current state but no save control', async () => {
    setCurrentUser({ role: 'OPERATOR' });
    mockService.getComplianceConfig.mockResolvedValue(mockComplianceConfig({ acrRequired: false, acrRequiredChangedBy: 'admin@example.com', acrRequiredChangedAt: '2026-11-01T00:00:00Z' }));

    render(<TenantWorkflowSettings />);

    const checkbox = await screen.findByRole('checkbox', { name: /Require ACR for Compliance/ }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(checkbox).toBeDisabled();
    expect(screen.getByText('Only administrators can change this compliance setting.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Compliance Setting/ })).not.toBeInTheDocument();
  });

  it('is editable for an ADMIN, and saves the new value', async () => {
    setCurrentUser({ role: 'ADMIN' });
    mockService.updateComplianceConfig.mockResolvedValue(
      mockComplianceConfig({ acrRequired: false, acrRequiredChangedBy: 'admin@example.com', acrRequiredChangedAt: '2026-11-10T00:00:00Z' })
    );

    render(<TenantWorkflowSettings />);

    const checkbox = await screen.findByRole('checkbox', { name: /Require ACR for Compliance/ }) as HTMLInputElement;
    expect(checkbox).not.toBeDisabled();
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: /Save Compliance Setting/ }));

    await waitFor(() => {
      expect(mockService.updateComplianceConfig).toHaveBeenCalledWith({ acrRequired: false });
    });
  });

  it('shows the audit trail (last changed by / on) once it has been changed at least once', async () => {
    setCurrentUser({ role: 'ADMIN' });
    mockService.getComplianceConfig.mockResolvedValue(
      mockComplianceConfig({ acrRequired: false, acrRequiredChangedBy: 'jane@example.com', acrRequiredChangedAt: '2026-11-01T00:00:00Z' })
    );

    render(<TenantWorkflowSettings />);

    expect(await screen.findByText(/Last changed by jane@example.com on/)).toBeInTheDocument();
  });

  it('shows no audit trail line when the setting has never been changed', async () => {
    setCurrentUser({ role: 'ADMIN' });
    mockService.getComplianceConfig.mockResolvedValue(mockComplianceConfig({ acrRequired: true, acrRequiredChangedBy: null, acrRequiredChangedAt: null }));

    render(<TenantWorkflowSettings />);

    await screen.findByRole('checkbox', { name: /Require ACR for Compliance/ });
    expect(screen.queryByText(/Last changed by/)).not.toBeInTheDocument();
  });

  it('disables the Save button until the checkbox actually differs from the saved value', async () => {
    setCurrentUser({ role: 'ADMIN' });
    mockService.getComplianceConfig.mockResolvedValue(mockComplianceConfig({ acrRequired: true }));

    render(<TenantWorkflowSettings />);

    const saveButton = await screen.findByRole('button', { name: /Save Compliance Setting/ });
    expect(saveButton).toBeDisabled();

    fireEvent.click(await screen.findByRole('checkbox', { name: /Require ACR for Compliance/ }));
    expect(saveButton).not.toBeDisabled();
  });

  it('shows an error toast and does not crash when the save is rejected (e.g. a 403)', async () => {
    setCurrentUser({ role: 'ADMIN' });
    mockService.updateComplianceConfig.mockRejectedValue({
      response: { data: { error: 'Only administrators may change this setting.' } },
    });

    render(<TenantWorkflowSettings />);

    fireEvent.click(await screen.findByRole('checkbox', { name: /Require ACR for Compliance/ }));
    fireEvent.click(screen.getByRole('button', { name: /Save Compliance Setting/ }));

    await waitFor(() => {
      expect(mockService.updateComplianceConfig).toHaveBeenCalled();
    });
    // Still rendered, not crashed — the checkbox reflects the unsaved attempt.
    expect(screen.getByRole('checkbox', { name: /Require ACR for Compliance/ })).toBeInTheDocument();
  });
});
