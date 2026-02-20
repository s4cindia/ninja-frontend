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
  const socketRef = useRef<Socket | null>(null);
  const [stateChange, setStateChange] = useState<WorkflowStateChangeEvent | null>(null);
  const [hitlRequired, setHitlRequired] = useState<HITLRequiredEvent | null>(null);
  const [workflowError, setWorkflowError] = useState<WorkflowErrorEvent | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!workflowId) return;

    const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    socketRef.current = io(BACKEND_URL);

    socketRef.current.on('connect', () => setConnected(true));
    socketRef.current.on('disconnect', () => setConnected(false));
    socketRef.current.emit('subscribe:workflow', workflowId);

    socketRef.current.on('workflow:state-change', setStateChange);
    socketRef.current.on('workflow:hitl-required', setHitlRequired);
    socketRef.current.on('workflow:error', setWorkflowError);

    return () => {
      socketRef.current?.disconnect();
    };
  }, [workflowId]);

  return { connected, stateChange, hitlRequired, workflowError };
}
