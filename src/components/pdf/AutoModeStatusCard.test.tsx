import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AutoModeStatusCard } from './AutoModeStatusCard';
import { pdfAutoModeService } from '@/services/pdfAutoMode.service';
import type { AutoModeStatusResponse } from '@/types/pdfAutoMode.types';

vi.mock('@/services/pdfAutoMode.service', () => ({
  pdfAutoModeService: { getAutoModeStatus: vi.fn(), stopAutoMode: vi.fn() },
}));

const mockService = pdfAutoModeService as Mocked<typeof pdfAutoModeService>;

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AutoModeStatusCard jobId="job-123" />
    </QueryClientProvider>
  );
}

function status(overrides?: Partial<AutoModeStatusResponse>): AutoModeStatusResponse {
  return {
    mode: 'auto',
    autoStatus: 'running',
    autoStopReason: null,
    autoRoundsCompleted: 3,
    autoMaxRounds: 10,
    autoCostSpentUsd: 0.42,
    autoCostLimitUsd: 2,
    ...overrides,
  };
}

describe('AutoModeStatusCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing before a run has ever started (autoStatus null) — the header Start button is the entry point, not this card', async () => {
    mockService.getAutoModeStatus.mockResolvedValueOnce(status({ autoStatus: null }));
    const { container } = renderCard();

    await waitFor(() => expect(mockService.getAutoModeStatus).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('shows round progress, cost spent, and a Stop button while running', async () => {
    mockService.getAutoModeStatus.mockResolvedValueOnce(status({ autoRoundsCompleted: 3, autoMaxRounds: 10, autoCostSpentUsd: 0.42, autoCostLimitUsd: 2 }));
    renderCard();

    await waitFor(() => expect(screen.getByText(/round 3 of 10/i)).toBeInTheDocument());
    expect(screen.getByText('$0.42 of $2.00 spent')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  it('calls stopAutoMode when Stop is clicked', async () => {
    mockService.getAutoModeStatus.mockResolvedValue(status());
    mockService.stopAutoMode.mockResolvedValueOnce(undefined);
    renderCard();

    const stopButton = await screen.findByRole('button', { name: /stop/i });
    fireEvent.click(stopButton);

    await waitFor(() => expect(mockService.stopAutoMode).toHaveBeenCalledWith('job-123'));
  });

  it('shows a success-styled alert when stopped due to convergence', async () => {
    mockService.getAutoModeStatus.mockResolvedValueOnce(status({ autoStatus: 'stopped', autoStopReason: 'converged', autoRoundsCompleted: 4 }));
    renderCard();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/no more ai-actionable fixes remain/i);
    expect(alert.className).toMatch(/green/);
  });

  it('shows a warning-styled alert when stopped due to the round limit', async () => {
    mockService.getAutoModeStatus.mockResolvedValueOnce(status({ autoStatus: 'stopped', autoStopReason: 'round_limit' }));
    renderCard();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/reached the maximum number of rounds/i);
    expect(alert.className).toMatch(/yellow/);
  });

  it('shows an error-styled alert when stopped manually', async () => {
    mockService.getAutoModeStatus.mockResolvedValueOnce(status({ autoStatus: 'stopped', autoStopReason: 'manual_stop' }));
    renderCard();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/stopped by the operator/i);
    expect(alert.className).toMatch(/red/);
  });
});
