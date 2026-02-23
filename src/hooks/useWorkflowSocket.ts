import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface WorkflowStateChangeEvent {
  workflowId: string;
  from: string;
  to: string;
  timestamp: string;
  phase: string;
}

interface HITLRequiredEvent {
  workflowId: string;
  gate: string;
  itemCount: number;
  deepLink: string;
  timeoutAt?: string;
}

interface WorkflowErrorEvent {
  workflowId: string;
  error: string;
  state: string;
  retryable: boolean;
  retryCount: number;
}

export function useWorkflowSocket(workflowId: string | null) {
  console.log('[useWorkflowSocket] Called with workflowId:', workflowId);
  const socketRef = useRef<Socket | null>(null);
  const [stateChange, setStateChange] = useState<WorkflowStateChangeEvent | null>(null);
  const [hitlRequired, setHitlRequired] = useState<HITLRequiredEvent | null>(null);
  const [workflowError, setWorkflowError] = useState<WorkflowErrorEvent | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!workflowId) return;

    // Extract base URL from API base URL (remove /api/v1 suffix if present)
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const BACKEND_URL = apiBaseUrl.replace(/\/api\/v\d+$/, '');

    console.log('[useWorkflowSocket] Connecting to WebSocket:', BACKEND_URL);
    socketRef.current = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      console.log('[useWorkflowSocket] Connected to WebSocket');
      setConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('[useWorkflowSocket] Disconnected from WebSocket');
      setConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('[useWorkflowSocket] Connection error:', error);
    });

    console.log('[useWorkflowSocket] Subscribing to workflow:', workflowId);
    socketRef.current.emit('subscribe:workflow', workflowId);

    socketRef.current.on('workflow:state-change', (event) => {
      console.log('[useWorkflowSocket] Received state-change:', event);
      setStateChange(event);
    });

    socketRef.current.on('workflow:hitl-required', (event) => {
      console.log('[useWorkflowSocket] Received HITL required:', event);
      setHitlRequired(event);
    });

    socketRef.current.on('workflow:error', (event) => {
      console.log('[useWorkflowSocket] Received error:', event);
      setWorkflowError(event);
    });

    return () => {
      console.log('[useWorkflowSocket] Disconnecting WebSocket');
      socketRef.current?.disconnect();
    };
  }, [workflowId]);

  return { connected, stateChange, hitlRequired, workflowError };
}
