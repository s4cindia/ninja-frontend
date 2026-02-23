import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface BatchProgressEvent {
  batchId: string;
  completed: number;
  total: number;
  currentStages: Record<string, number>;
  failedCount: number;
}

/**
 * WebSocket hook for real-time batch progress updates.
 * Connects to the backend WebSocket server and subscribes to batch events.
 *
 * @param batchId - The batch ID to subscribe to (null to skip connection)
 * @returns Object containing connection status and latest progress event
 */
export function useBatchSocket(batchId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [progress, setProgress] = useState<BatchProgressEvent | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!batchId) return;

    // Strip /api/v1 suffix to get the WebSocket server root (same as useWorkflowSocket)
    const rawUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const BACKEND_URL = rawUrl.replace(/\/api\/v\d+$/, '');
    socketRef.current = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      setConnected(true);
      console.log('[useBatchSocket] Connected to WebSocket server');
      // Subscribe after connection established to avoid lost subscriptions
      socketRef.current?.emit('subscribe:batch', batchId);
      console.log('[useBatchSocket] Subscribed to batch:', batchId);
    });

    socketRef.current.on('disconnect', () => {
      setConnected(false);
      console.log('[useBatchSocket] Disconnected from WebSocket server');
    });

    // Listen for batch progress events
    socketRef.current.on('batch:progress', (event: BatchProgressEvent) => {
      console.log('[useBatchSocket] Batch progress update:', event);
      setProgress(event);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        console.log('[useBatchSocket] Disconnecting socket');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [batchId]);

  return { connected, progress };
}
