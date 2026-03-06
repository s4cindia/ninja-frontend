import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/services/api";

export type JobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface JobData {
  id: string;
  status: JobStatus;
  type: string;
  progress?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt?: string;
}

interface UseJobPollingOptions {
  interval?: number;
  onComplete?: (data: JobData) => void;
  onError?: (error: string) => void;
}

interface UseJobPollingResult {
  status: JobStatus | null;
  data: JobData | null;
  error: string | null;
  isLoading: boolean;
  isPolling: boolean;
  startPolling: (jobId: string) => void;
  stopPolling: () => void;
}

export function useJobPolling(
  options: UseJobPollingOptions = {},
): UseJobPollingResult {
  const { interval = 2000, onComplete, onError } = options;

  const [status, setStatus] = useState<JobStatus | null>(null);
  const [data, setData] = useState<JobData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  // Track consecutive poll failures — only stop after 5 to tolerate transient 401s / network blips
  const consecutiveErrorsRef = useRef(0);
  const MAX_CONSECUTIVE_ERRORS = 5;

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const pollJob = useCallback(
    async (id: string) => {
      try {
        const response = await api.get(`/jobs/${id}`);
        const jobData: JobData = response.data.data || response.data;

        // Successful poll — reset error counter
        consecutiveErrorsRef.current = 0;
        setData(jobData);

        // FIX: Normalize status to uppercase for case-insensitive comparison
        // The API may return lowercase (e.g., 'completed') or uppercase (e.g., 'COMPLETED')
        const normalizedStatus = (jobData.status?.toUpperCase() ||
          jobData.status) as JobStatus;
        setStatus(normalizedStatus);

        if (normalizedStatus === "COMPLETED") {
          stopPolling();
          setIsLoading(false);
          onCompleteRef.current?.(jobData);
        } else if (normalizedStatus === "FAILED") {
          stopPolling();
          setIsLoading(false);
          const errorMsg = jobData.error || "Job failed";
          setError(errorMsg);
          onErrorRef.current?.(errorMsg);
        }
      } catch (err) {
        consecutiveErrorsRef.current += 1;
        // Tolerate transient failures (auth refresh, network blip, brief 401).
        // Only give up after MAX_CONSECUTIVE_ERRORS failures in a row.
        if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
          const errorMsg =
            err instanceof Error ? err.message : "Failed to fetch job status";
          setError(errorMsg);
          stopPolling();
          setIsLoading(false);
          onErrorRef.current?.(errorMsg);
        }
        // Otherwise: silently skip this poll interval and retry next tick
      }
    },
    [stopPolling],
  );

  const startPolling = useCallback(
    (id: string) => {
      stopPolling();
      consecutiveErrorsRef.current = 0;

      setStatus("QUEUED");
      setData(null);
      setError(null);
      setIsLoading(true);
      setIsPolling(true);

      pollJob(id);

      intervalRef.current = setInterval(() => {
        pollJob(id);
      }, interval);
    },
    [interval, pollJob, stopPolling],
  );

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    status,
    data,
    error,
    isLoading,
    isPolling,
    startPolling,
    stopPolling,
  };
}
