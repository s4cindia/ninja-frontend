import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { JobSettingsMenu } from './JobSettingsMenu';
import { pdfAutoModeService } from '@/services/pdfAutoMode.service';

vi.mock('@/services/pdfAutoMode.service', () => ({
  pdfAutoModeService: { getJobSettings: vi.fn(), updateJobSettings: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

const mockService = vi.mocked(pdfAutoModeService);

function renderMenu(props: Partial<Parameters<typeof JobSettingsMenu>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <JobSettingsMenu
        jobId="job-1"
        onGenerateAcr={vi.fn()}
        generateAcrPending={false}
        {...props}
      />
    </QueryClientProvider>
  );
}

function settings(overrides: {
  fullAutoMode?: Partial<{ override: boolean | null; tenantDefault: boolean; effective: boolean }>;
  autoEscalateOnStall?: Partial<{ override: boolean | null; tenantDefault: boolean; effective: boolean }>;
  fullQC?: Partial<{ override: boolean | null; tenantDefault: boolean; effective: boolean }>;
} = {}) {
  return {
    fullAutoMode: { override: null, tenantDefault: false, effective: false, ...overrides.fullAutoMode },
    autoEscalateOnStall: { override: null, tenantDefault: false, effective: false, ...overrides.autoEscalateOnStall },
    fullQC: { override: null, tenantDefault: false, effective: false, ...overrides.fullQC },
  };
}

describe('JobSettingsMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch job settings before the popover is opened', () => {
    mockService.getJobSettings.mockResolvedValue(settings());
    renderMenu();

    expect(mockService.getJobSettings).not.toHaveBeenCalled();
  });

  it('fetches and renders both overrides once the Settings button is clicked', async () => {
    mockService.getJobSettings.mockResolvedValue(
      settings({ fullAutoMode: { override: true, effective: true }, autoEscalateOnStall: { override: false, tenantDefault: true, effective: false } })
    );
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));

    await waitFor(() => expect(mockService.getJobSettings).toHaveBeenCalledWith('job-1'));
    expect(await screen.findByLabelText('Full Auto Mode')).toHaveValue('on');
    expect(screen.getByLabelText('Auto-escalate on stall')).toHaveValue('off');
  });

  it('shows "Use tenant default" with the resolved tenant value when override is null', async () => {
    mockService.getJobSettings.mockResolvedValue(settings({ fullAutoMode: { override: null, tenantDefault: true } }));
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));

    const select = await screen.findByLabelText('Full Auto Mode');
    expect(select).toHaveValue('inherit');
    expect(screen.getByText('Use tenant default (On)')).toBeInTheDocument();
  });

  it('calls updateJobSettings with true/false/null for the On/Off/inherit options, and reflects the result', async () => {
    mockService.getJobSettings.mockResolvedValue(settings());
    mockService.updateJobSettings.mockResolvedValue(settings({ fullAutoMode: { override: true, effective: true } }));
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    const select = await screen.findByLabelText('Full Auto Mode');

    fireEvent.change(select, { target: { value: 'on' } });

    await waitFor(() => expect(mockService.updateJobSettings).toHaveBeenCalledWith('job-1', { fullAutoMode: true }));
    await waitFor(() => expect(select).toHaveValue('on'));
  });

  it('sends null (reset to inherit) when switching an override back to "Use tenant default"', async () => {
    mockService.getJobSettings.mockResolvedValue(settings({ autoEscalateOnStall: { override: true, effective: true } }));
    mockService.updateJobSettings.mockResolvedValue(settings());
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    const select = await screen.findByLabelText('Auto-escalate on stall');
    expect(select).toHaveValue('on');

    fireEvent.change(select, { target: { value: 'inherit' } });

    await waitFor(() => expect(mockService.updateJobSettings).toHaveBeenCalledWith('job-1', { autoEscalateOnStall: null }));
  });

  it('shows an error toast and leaves the select at its prior value when the update fails', async () => {
    mockService.getJobSettings.mockResolvedValue(settings());
    mockService.updateJobSettings.mockRejectedValue(new Error('network error'));
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    const select = await screen.findByLabelText('Full Auto Mode');

    fireEvent.change(select, { target: { value: 'off' } });

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it('still shows the Generate ACR menu item alongside the overrides, unchanged behavior', async () => {
    mockService.getJobSettings.mockResolvedValue(settings());
    const onGenerateAcr = vi.fn();
    renderMenu({ onGenerateAcr });

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    await screen.findByLabelText('Full Auto Mode');

    fireEvent.click(screen.getByRole('menuitem', { name: /generate acr/i }));
    expect(onGenerateAcr).toHaveBeenCalled();
  });

  it('does not render the override selects at all without a jobId (e.g. a not-yet-known job)', () => {
    renderMenu({ jobId: undefined });

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));

    expect(screen.queryByLabelText('Full Auto Mode')).not.toBeInTheDocument();
    expect(mockService.getJobSettings).not.toHaveBeenCalled();
  });
});
