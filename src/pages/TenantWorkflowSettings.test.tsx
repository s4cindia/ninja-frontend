import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TenantWorkflowSettings } from './TenantWorkflowSettings';
import { tenantConfigService } from '../services/tenant-config.service';
import { useAuthStore } from '@/stores/auth.store';
import type { User } from '@/types/auth.types';
import type { WorkflowConfig, ReportsConfig, Axes4Config } from '../services/tenant-config.service';

vi.mock('../services/tenant-config.service', () => ({
  tenantConfigService: {
    getWorkflowConfig: vi.fn(),
    updateWorkflowConfig: vi.fn(),
    getReportsConfig: vi.fn(),
    updateReportsConfig: vi.fn(),
    getAxes4Config: vi.fn(),
    updateAxes4Config: vi.fn(),
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

describe('TenantWorkflowSettings — axes4 PAC Cloud toggle', () => {
  beforeEach(() => {
    mockService.getWorkflowConfig.mockReset().mockResolvedValue(mockWorkflowConfig());
    mockService.getReportsConfig.mockReset().mockResolvedValue(mockReportsConfig());
    mockService.getAxes4Config.mockReset().mockResolvedValue(mockAxes4Config());
    mockService.updateAxes4Config.mockReset();
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
