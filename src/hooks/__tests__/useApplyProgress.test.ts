import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApplyProgress } from '../useApplyProgress';
import { useAuthStore } from '@/stores/auth.store';

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  emitError() {
    this.onerror?.(new Event('error'));
  }

  static latest(): MockEventSource {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }
}

describe('useApplyProgress', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
    useAuthStore.setState({ accessToken: 'test-token' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not connect when disabled', () => {
    renderHook(() => useApplyProgress('job-1', { enabled: false }));

    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('does not connect when jobId is undefined, even if enabled', () => {
    renderHook(() => useApplyProgress(undefined, { enabled: true }));

    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('does not connect without an access token', () => {
    useAuthStore.setState({ accessToken: null });
    renderHook(() => useApplyProgress('job-1', { enabled: true }));

    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('connects to the job-scoped apply-progress endpoint with the token as a query param', () => {
    renderHook(() => useApplyProgress('job-1', { enabled: true }));

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.latest().url).toBe('/api/v1/sse/pdf/job-1/apply-progress?token=test-token');
  });

  it('marks connected on the initial "subscribed" handshake, before any progress message arrives', () => {
    const { result } = renderHook(() => useApplyProgress('job-1', { enabled: true }));

    act(() => {
      MockEventSource.latest().emit({ type: 'subscribed', jobId: 'job-1', channel: 'apply-progress:job-1' });
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.total).toBeNull();
  });

  it('updates applied/failed/processed/total/source from an apply_progress message', () => {
    const { result } = renderHook(() => useApplyProgress('job-1', { enabled: true }));

    act(() => {
      MockEventSource.latest().emit({
        type: 'apply_progress', jobId: 'job-1', source: 'apply_all',
        applied: 12, failed: 1, processed: 13, total: 910,
      });
    });

    expect(result.current).toEqual({
      applied: 12, failed: 1, processed: 13, total: 910, source: 'apply_all', connected: true,
    });
  });

  it('reflects the latest message, including a later auto_loop message overwriting an earlier apply_all one on the same shared channel', () => {
    const { result } = renderHook(() => useApplyProgress('job-1', { enabled: true }));

    act(() => {
      MockEventSource.latest().emit({ type: 'apply_progress', source: 'apply_all', applied: 1, failed: 0, processed: 1, total: 5 });
    });
    expect(result.current.source).toBe('apply_all');

    act(() => {
      MockEventSource.latest().emit({ type: 'apply_progress', source: 'auto_loop', applied: 3, failed: 0, processed: 3, total: 20 });
    });
    expect(result.current).toMatchObject({ source: 'auto_loop', applied: 3, processed: 3, total: 20 });
  });

  it('sets connected to false on an error, without throwing', () => {
    const { result } = renderHook(() => useApplyProgress('job-1', { enabled: true }));
    act(() => { MockEventSource.latest().emit({ type: 'subscribed' }); });
    expect(result.current.connected).toBe(true);

    act(() => { MockEventSource.latest().emitError(); });

    expect(result.current.connected).toBe(false);
  });

  it('ignores a malformed (non-JSON) message instead of throwing', () => {
    const { result } = renderHook(() => useApplyProgress('job-1', { enabled: true }));

    expect(() => {
      act(() => {
        MockEventSource.latest().onmessage?.({ data: 'not json' } as MessageEvent);
      });
    }).not.toThrow();
    expect(result.current.connected).toBe(false);
  });

  it('closes the connection when enabled flips back to false', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useApplyProgress('job-1', { enabled }),
      { initialProps: { enabled: true } }
    );
    const es = MockEventSource.latest();
    expect(es.closed).toBe(false);

    rerender({ enabled: false });

    expect(es.closed).toBe(true);
  });

  it('closes the connection on unmount', () => {
    const { unmount } = renderHook(() => useApplyProgress('job-1', { enabled: true }));
    const es = MockEventSource.latest();

    unmount();

    expect(es.closed).toBe(true);
  });

  it('resets to a fresh state (no stale counts) when a new step starts after a prior one ended', () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useApplyProgress('job-1', { enabled }),
      { initialProps: { enabled: true } }
    );
    act(() => {
      MockEventSource.latest().emit({ type: 'apply_progress', source: 'apply_all', applied: 5, failed: 0, processed: 5, total: 5 });
    });
    expect(result.current.total).toBe(5);

    rerender({ enabled: false });
    expect(result.current.total).toBeNull();

    rerender({ enabled: true });
    expect(result.current.total).toBeNull();
    expect(result.current.connected).toBe(false);
  });
});
