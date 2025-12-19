import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { 
  VersionEntry, 
  VersionDetails, 
  VersionComparison,
  VersionHistoryData 
} from '@/types/version.types';

async function fetchVersionHistory(acrId: string): Promise<VersionEntry[]> {
  const response = await api.get<VersionEntry[]>(`/acr/${acrId}/versions`);
  return response.data;
}

async function fetchVersionDetails(acrId: string, version: number): Promise<VersionDetails> {
  const response = await api.get<VersionDetails>(`/acr/${acrId}/versions/${version}`);
  return response.data;
}

async function fetchVersionComparison(acrId: string, v1: number, v2: number): Promise<VersionComparison> {
  const response = await api.get<VersionComparison>(`/acr/${acrId}/compare?v1=${v1}&v2=${v2}`);
  return response.data;
}

export function useVersionHistory(acrId: string): VersionHistoryData {
  const query = useQuery({
    queryKey: ['acr-versions', acrId],
    queryFn: () => fetchVersionHistory(acrId),
    enabled: !!acrId,
  });

  return {
    versions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}

export function useVersionDetails(acrId: string, version: number | null) {
  return useQuery({
    queryKey: ['acr-version-details', acrId, version],
    queryFn: () => fetchVersionDetails(acrId, version!),
    enabled: !!acrId && version !== null,
  });
}

export function useCompareVersions(acrId: string, v1: number | null, v2: number | null) {
  return useQuery({
    queryKey: ['acr-version-compare', acrId, v1, v2],
    queryFn: () => fetchVersionComparison(acrId, v1!, v2!),
    enabled: !!acrId && v1 !== null && v2 !== null,
  });
}

export const MOCK_VERSIONS: VersionEntry[] = [
  {
    version: 5,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    createdBy: 'John Smith',
    changeSummary: 'Updated remarks for 1.4.3 Contrast',
    changeCount: 1,
  },
  {
    version: 4,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    createdBy: 'Jane Doe',
    changeSummary: 'Verified 5 criteria, changed conformance levels',
    changeCount: 5,
  },
  {
    version: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    createdBy: 'John Smith',
    changeSummary: 'AI-generated initial assessment',
    changeCount: 47,
  },
  {
    version: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    createdBy: 'System',
    changeSummary: 'Edition selection: VPAT 2.5 Section 508',
    changeCount: 0,
  },
  {
    version: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    createdBy: 'System',
    changeSummary: 'Document created',
    changeCount: 0,
  },
];

const MOCK_VERSION_DETAILS: Record<number, VersionDetails> = {
  5: {
    ...MOCK_VERSIONS[0],
    changes: [
      {
        field: 'remarks',
        criterionId: '1.4.3',
        criterionName: 'Contrast (Minimum)',
        oldValue: 'Text has sufficient contrast ratio.',
        newValue: 'All text and images of text have a contrast ratio of at least 4.5:1, except for large text which has a ratio of at least 3:1.',
        reason: 'Added more specific detail about contrast ratios',
      },
    ],
  },
  4: {
    ...MOCK_VERSIONS[1],
    changes: [
      {
        field: 'conformanceLevel',
        criterionId: '1.1.1',
        criterionName: 'Non-text Content',
        oldValue: 'partially_supports',
        newValue: 'supports',
        reason: 'Verified all images have alt text',
      },
      {
        field: 'conformanceLevel',
        criterionId: '1.3.1',
        criterionName: 'Info and Relationships',
        oldValue: 'supports',
        newValue: 'partially_supports',
        reason: 'Found some tables missing proper headers',
      },
      {
        field: 'remarks',
        criterionId: '1.3.1',
        criterionName: 'Info and Relationships',
        oldValue: 'Structure is properly conveyed.',
        newValue: 'Most structure is properly conveyed. However, some data tables in Chapter 5 are missing proper header associations.',
      },
      {
        field: 'conformanceLevel',
        criterionId: '2.1.1',
        criterionName: 'Keyboard',
        oldValue: 'does_not_support',
        newValue: 'partially_supports',
        reason: 'Most interactive elements are keyboard accessible',
      },
      {
        field: 'attribution',
        criterionId: '2.1.1',
        criterionName: 'Keyboard',
        oldValue: 'AI-SUGGESTED',
        newValue: 'HUMAN-VERIFIED',
      },
    ],
  },
  3: {
    ...MOCK_VERSIONS[2],
    changes: [
      {
        field: 'conformanceLevel',
        criterionId: '1.1.1',
        criterionName: 'Non-text Content',
        oldValue: '',
        newValue: 'partially_supports',
        reason: 'AI initial assessment',
      },
    ],
  },
};

export function useMockVersionHistory(_acrId: string): VersionHistoryData {
  const [isLoading, setIsLoading] = useState(true);
  const [versions, setVersions] = useState<VersionEntry[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVersions(MOCK_VERSIONS);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [_acrId]);

  return { versions, isLoading, error: null };
}

export function useMockVersionDetails(_acrId: string, version: number | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<VersionDetails | null>(null);

  useEffect(() => {
    if (version === null) {
      setData(null);
      return;
    }
    setIsLoading(true);
    const timer = setTimeout(() => {
      const existingVersion = MOCK_VERSIONS.find(v => v.version === version);
      setData(MOCK_VERSION_DETAILS[version] || (existingVersion ? {
        ...existingVersion,
        changes: [],
      } : null));
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [_acrId, version]);

  return { data, isLoading, error: null };
}

export function useMockCompareVersions(_acrId: string, v1: number | null, v2: number | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<VersionComparison | null>(null);

  useEffect(() => {
    if (v1 === null || v2 === null) {
      setData(null);
      return;
    }
    setIsLoading(true);
    const timer = setTimeout(() => {
      const mockDifferences = [
        {
          criterionId: '1.1.1',
          criterionName: 'Non-text Content',
          field: 'conformanceLevel',
          v1Value: v1 < v2 ? 'partially_supports' : 'supports',
          v2Value: v1 < v2 ? 'supports' : 'partially_supports',
        },
        {
          criterionId: '1.3.1',
          criterionName: 'Info and Relationships',
          field: 'conformanceLevel',
          v1Value: v1 < v2 ? 'supports' : 'partially_supports',
          v2Value: v1 < v2 ? 'partially_supports' : 'supports',
        },
        {
          criterionId: '1.4.3',
          criterionName: 'Contrast (Minimum)',
          field: 'remarks',
          v1Value: 'Text has sufficient contrast ratio.',
          v2Value: 'All text and images of text have a contrast ratio of at least 4.5:1, except for large text which has a ratio of at least 3:1.',
        },
        {
          criterionId: '2.1.1',
          criterionName: 'Keyboard',
          field: 'conformanceLevel',
          v1Value: v1 < v2 ? 'does_not_support' : 'partially_supports',
          v2Value: v1 < v2 ? 'partially_supports' : 'does_not_support',
        },
      ];
      setData({
        version1: v1,
        version2: v2,
        differences: mockDifferences,
      });
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [_acrId, v1, v2]);

  return { data, isLoading, error: null };
}
