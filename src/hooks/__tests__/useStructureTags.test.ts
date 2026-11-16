import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useStructureTags, useRetagStructureElement } from '../useStructureTags';
import { pdfStructureTagsService } from '@/services/pdfStructureTags.service';
import type { StructureTagElement } from '@/types/pdfStructureTags.types';

vi.mock('@/services/pdfStructureTags.service', () => ({
  pdfStructureTagsService: {
    getStructureTagsForPage: vi.fn(),
    retagStructureElement: vi.fn(),
  },
}));

const mockService = vi.mocked(pdfStructureTagsService);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const ELEMENT: StructureTagElement = {
  elementId: '12-0',
  tag: 'H1',
  pageNumber: 1,
  bbox: { x: 100, y: 292, width: 70, height: 0, pageWidth: 612, pageHeight: 792 },
};

describe('useStructureTags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled without a jobId', () => {
    const { result } = renderHook(() => useStructureTags(undefined, 1), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockService.getStructureTagsForPage).not.toHaveBeenCalled();
  });

  it('is disabled when opts.enabled is false, even with a jobId -- lets the caller defer the fetch until structure-tag review mode is actually active', () => {
    const { result } = renderHook(() => useStructureTags('job-1', 1, { enabled: false }), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockService.getStructureTagsForPage).not.toHaveBeenCalled();
  });

  it('is disabled for a non-positive page number', () => {
    const { result } = renderHook(() => useStructureTags('job-1', 0), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockService.getStructureTagsForPage).not.toHaveBeenCalled();
  });

  it('fetches once enabled and returns the page\'s elements', async () => {
    mockService.getStructureTagsForPage.mockResolvedValue([ELEMENT]);
    const { result } = renderHook(() => useStructureTags('job-1', 3, { enabled: true }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockService.getStructureTagsForPage).toHaveBeenCalledWith('job-1', 3);
    expect(result.current.data).toEqual([ELEMENT]);
  });

  it('refetches when the page number changes', async () => {
    mockService.getStructureTagsForPage.mockResolvedValue([ELEMENT]);
    const { rerender } = renderHook(
      ({ page }: { page: number }) => useStructureTags('job-1', page, { enabled: true }),
      { wrapper: createWrapper(), initialProps: { page: 1 } }
    );
    await waitFor(() => expect(mockService.getStructureTagsForPage).toHaveBeenCalledWith('job-1', 1));

    rerender({ page: 2 });

    await waitFor(() => expect(mockService.getStructureTagsForPage).toHaveBeenCalledWith('job-1', 2));
  });
});

describe('useRetagStructureElement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the service with the elementId and newTag', async () => {
    mockService.retagStructureElement.mockResolvedValue({ ...ELEMENT, tag: 'H2' });
    const { result } = renderHook(() => useRetagStructureElement('job-1', 1), { wrapper: createWrapper() });

    act(() => { result.current.mutate({ elementId: '12-0', newTag: 'H2' }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockService.retagStructureElement).toHaveBeenCalledWith('job-1', '12-0', 'H2');
  });

  it('patches useStructureTags\' own cache with the mutation result, so the overlay updates without a second fetch', async () => {
    mockService.getStructureTagsForPage.mockResolvedValue([ELEMENT]);
    mockService.retagStructureElement.mockResolvedValue({ ...ELEMENT, tag: 'H2' });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const tagsHook = renderHook(() => useStructureTags('job-1', 1), { wrapper });
    await waitFor(() => expect(tagsHook.result.current.isSuccess).toBe(true));
    expect(tagsHook.result.current.data).toEqual([ELEMENT]);

    const retagHook = renderHook(() => useRetagStructureElement('job-1', 1), { wrapper });
    act(() => { retagHook.result.current.mutate({ elementId: '12-0', newTag: 'H2' }); });
    await waitFor(() => expect(retagHook.result.current.isSuccess).toBe(true));

    expect(tagsHook.result.current.data).toEqual([{ ...ELEMENT, tag: 'H2' }]);
  });

  it('leaves an unrelated element in the cached list untouched', async () => {
    const other: StructureTagElement = { ...ELEMENT, elementId: '13-0', tag: 'P' };
    mockService.getStructureTagsForPage.mockResolvedValue([ELEMENT, other]);
    mockService.retagStructureElement.mockResolvedValue({ ...ELEMENT, tag: 'H2' });

    // Reads the queryClient's own cache directly (not through a second
    // query observer's re-render) to avoid depending on this query's
    // unrelated refetch-on-mount/focus timing -- this test only cares what
    // the mutation's onSuccess actually wrote into the cache.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const tagsHook = renderHook(() => useStructureTags('job-1', 1), { wrapper });
    await waitFor(() => expect(tagsHook.result.current.isSuccess).toBe(true));

    const retagHook = renderHook(() => useRetagStructureElement('job-1', 1), { wrapper });
    act(() => { retagHook.result.current.mutate({ elementId: '12-0', newTag: 'H2' }); });
    await waitFor(() => expect(retagHook.result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(['pdf-structure-tags', 'job-1', 1])).toEqual([{ ...ELEMENT, tag: 'H2' }, other]);
  });
});
