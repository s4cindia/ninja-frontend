import { useQuery } from '@tanstack/react-query';
import { complianceService } from '@/services/compliance.service';

export function useSection508Mapping(fileId: string) {
  return useQuery({
    queryKey: ['section508', fileId],
    queryFn: () => complianceService.mapToSection508(fileId),
    enabled: !!fileId,
  });
}

export function useFpcValidation(fileId: string) {
  return useQuery({
    queryKey: ['fpc', fileId],
    queryFn: () => complianceService.validateFpc(fileId),
    enabled: !!fileId,
  });
}

export function useFpcDefinitions() {
  return useQuery({
    queryKey: ['fpcDefinitions'],
    queryFn: () => complianceService.getFpcDefinitions(),
  });
}
