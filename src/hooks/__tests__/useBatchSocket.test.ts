import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBatchSocket } from '../useBatchSocket';
import { io } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client');

describe('useBatchSocket', () => {
  let mockSocket: any;

  beforeEach(() => {
    // Create mock socket with event emitter functionality
    const eventHandlers = new Map();

    mockSocket = {
      on: vi.fn((event: string, handler: Function) => {
        eventHandlers.set(event, handler);
      }),
      emit: vi.fn((event: string, ...args: any[]) => {
        const handler = eventHandlers.get(event);
        if (handler) handler(...args);
      }),
      disconnect: vi.fn(),
      connected: true,
    };

    // Mock io() to return our mock socket
    (io as any).mockReturnValue(mockSocket);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not connect when batchId is null', () => {
    const { result } = renderHook(() => useBatchSocket(null));

    expect(io).not.toHaveBeenCalled();
    expect(result.current.connected).toBe(false);
    expect(result.current.progress).toBeNull();
  });

  it('should connect and subscribe when batchId is provided', () => {
    const batchId = '12345678-1234-1234-1234-123456789012';

    renderHook(() => useBatchSocket(batchId));

    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        transports: ['websocket', 'polling'],
      })
    );
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('batch:progress', expect.any(Function));
  });

  it('should update connection status on connect', async () => {
    const batchId = '12345678-1234-1234-1234-123456789012';
    const { result } = renderHook(() => useBatchSocket(batchId));

    // Initially not connected
    expect(result.current.connected).toBe(false);

    // Trigger connect event
    const connectHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'connect')?.[1];
    if (connectHandler) {
      connectHandler();
    }

    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });
  });

  it('should update connection status on disconnect', async () => {
    const batchId = '12345678-1234-1234-1234-123456789012';
    const { result } = renderHook(() => useBatchSocket(batchId));

    // Connect first
    const connectHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'connect')?.[1];
    if (connectHandler) {
      connectHandler();
    }

    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });

    // Trigger disconnect event
    const disconnectHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'disconnect')?.[1];
    if (disconnectHandler) {
      disconnectHandler();
    }

    await waitFor(() => {
      expect(result.current.connected).toBe(false);
    });
  });

  it('should emit subscribe:batch event with batchId', () => {
    const batchId = '12345678-1234-1234-1234-123456789012';

    renderHook(() => useBatchSocket(batchId));

    // Trigger connect to cause subscription
    const connectHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'connect')?.[1];
    if (connectHandler) {
      connectHandler();
    }

    expect(mockSocket.emit).toHaveBeenCalledWith('subscribe:batch', batchId);
  });

  it('should update progress when batch:progress event received', async () => {
    const batchId = '12345678-1234-1234-1234-123456789012';
    const { result } = renderHook(() => useBatchSocket(batchId));

    const progressEvent = {
      batchId,
      completed: 5,
      total: 10,
      currentStages: { RUNNING_ACE: 3, AUTO_REMEDIATION: 2 },
      failedCount: 1,
    };

    // Trigger batch:progress event
    const progressHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'batch:progress')?.[1];
    if (progressHandler) {
      progressHandler(progressEvent);
    }

    await waitFor(() => {
      expect(result.current.progress).toEqual(progressEvent);
    });
  });

  it('should disconnect socket on unmount', () => {
    const batchId = '12345678-1234-1234-1234-123456789012';
    const { unmount } = renderHook(() => useBatchSocket(batchId));

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('should reconnect when batchId changes', () => {
    const batchId1 = '12345678-1234-1234-1234-123456789001';
    const batchId2 = '12345678-1234-1234-1234-123456789002';

    const { rerender } = renderHook(
      ({ batchId }) => useBatchSocket(batchId),
      { initialProps: { batchId: batchId1 } }
    );

    expect(io).toHaveBeenCalledTimes(1);

    rerender({ batchId: batchId2 });

    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(io).toHaveBeenCalledTimes(2);
  });

  it('should handle null to batchId transition', () => {
    const batchId = '12345678-1234-1234-1234-123456789012';

    const { rerender } = renderHook(
      ({ batchId }) => useBatchSocket(batchId),
      { initialProps: { batchId: null } }
    );

    expect(io).not.toHaveBeenCalled();

    rerender({ batchId });

    expect(io).toHaveBeenCalledTimes(1);
  });

  it('should handle batchId to null transition', () => {
    const batchId = '12345678-1234-1234-1234-123456789012';

    const { rerender } = renderHook(
      ({ batchId }) => useBatchSocket(batchId),
      { initialProps: { batchId } }
    );

    expect(io).toHaveBeenCalledTimes(1);

    rerender({ batchId: null });

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
