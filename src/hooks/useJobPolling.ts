import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/services/api";

export type JobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface JobData {
  id: string;
  status: JobStatus;
  type: string;
  progress?: number;
  output?: Record<string, unknown>;
  error?: string;
  createdAt?: string;
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
        const errorMsg =
          err instanceof Error ? err.message : "Failed to fetch job status";
        setError(errorMsg);
        stopPolling();
        setIsLoading(false);
        onErrorRef.current?.(errorMsg);
      }
    },
    [stopPolling],
  );

  const startPolling = useCallback(
    (id: string) => {
      stopPolling();

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
