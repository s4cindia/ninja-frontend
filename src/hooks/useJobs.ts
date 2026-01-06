import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsService, JobFilters, JobsListResponse } from '@/services/jobs.service';

export function useJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => jobsService.getJobs(filters),
    refetchInterval: (query) => {
      const data = query.state.data as JobsListResponse | undefined;
      const hasProcessing = data?.jobs?.some(
        (job) => job.status === 'QUEUED' || job.status === 'PROCESSING'
      ) ?? false;
      return hasProcessing ? 5000 : 30000;
    },
  });
}

export function useJob(jobId: string | null) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobsService.getJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'QUEUED' || status === 'PROCESSING') {
        return 5000;
      }
      return false;
    },
  });
}

export function useJobStats() {
  return useQuery({
    queryKey: ['jobStats'],
    queryFn: () => jobsService.getJobStats(),
    refetchInterval: 30000,
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => jobsService.cancelJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobStats'] });
    },
  });
}
