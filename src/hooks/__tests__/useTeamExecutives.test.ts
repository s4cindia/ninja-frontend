import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useTeamExecutives } from '../useTeamExecutives';
import { teamService } from '@/services/team.service';

vi.mock('@/services/team.service', () => ({
  teamService: { listTeamExecutives: vi.fn() },
}));

const mockListTeamExecutives = vi.mocked(teamService.listTeamExecutives);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useTeamExecutives', () => {
  beforeEach(() => {
    mockListTeamExecutives.mockReset();
  });

  it('does not fetch when disabled (not a Team Leader)', () => {
    const { result } = renderHook(() => useTeamExecutives(false), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListTeamExecutives).not.toHaveBeenCalled();
  });

  it('fetches the roster when enabled', async () => {
    mockListTeamExecutives.mockResolvedValue({
      executives: [
        { userId: 'exec-1', firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com', teamId: 'team-1', teamName: 'Cell A' },
      ],
    });

    const { result } = renderHook(() => useTeamExecutives(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.executives).toHaveLength(1);
    expect(mockListTeamExecutives).toHaveBeenCalledTimes(1);
  });

  it('does not retry on failure', async () => {
    mockListTeamExecutives.mockRejectedValue(new Error('NOT_TEAM_LEADER'));

    const { result } = renderHook(() => useTeamExecutives(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockListTeamExecutives).toHaveBeenCalledTimes(1);
  });
});
