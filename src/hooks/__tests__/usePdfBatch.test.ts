import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import {
  useCreatePdfBatch,
  useAddPdfBatchItems,
  useRemovePdfBatchItem,
  useStartPdfBatch,
  useCancelPdfBatch,
  usePdfBatch,
  usePdfBatches,
} from '../usePdfBatch';
import { pdfBatchService } from '@/services/pdfBatch.service';
import type { PdfBatchDetail } from '@/types/pdfBatch.types';

vi.mock('@/services/pdfBatch.service', () => ({
  pdfBatchService: {
    createBatch: vi.fn(),
    addItems: vi.fn(),
    removeItem: vi.fn(),
    startBatch: vi.fn(),
    cancelBatch: vi.fn(),
    getBatch: vi.fn(),
    listBatches: vi.fn(),
  },
}));

const mockService = vi.mocked(pdfBatchService);

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function detail(overrides?: Partial<PdfBatchDetail>): PdfBatchDetail {
  return {
    batchId: 'b1',
    name: 'Batch 1',
    status: 'DRAFT',
    totalFiles: 0,
    statusCounts: {},
    createdAt: '2026-10-15T00:00:00Z',
    items: [],
    ...overrides,
  };
}

describe('usePdfBatch mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useCreatePdfBatch calls the service with the given request', async () => {
    mockService.createBatch.mockResolvedValue({ batchId: 'b1', name: 'x', status: 'DRAFT', totalFiles: 0, createdAt: '2026-10-15T00:00:00Z' });
    const { result } = renderHook(() => useCreatePdfBatch(), { wrapper: createWrapper() });

    result.current.mutate({ name: 'x' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockService.createBatch).toHaveBeenCalledWith({ name: 'x' });
  });

  it('useAddPdfBatchItems rejects without a batchId instead of calling the service', async () => {
    const { result } = renderHook(() => useAddPdfBatchItems(undefined), { wrapper: createWrapper() });

    result.current.mutate([{ sourceFileId: 'f1' }]);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockService.addItems).not.toHaveBeenCalled();
  });

  it('useAddPdfBatchItems calls the service when a batchId is present', async () => {
    mockService.addItems.mockResolvedValue({ itemsAdded: 1, items: [] });
    const { result } = renderHook(() => useAddPdfBatchItems('b1'), { wrapper: createWrapper() });

    result.current.mutate([{ sourceFileId: 'f1' }]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockService.addItems).toHaveBeenCalledWith('b1', [{ sourceFileId: 'f1' }]);
  });

  it('useRemovePdfBatchItem calls the service with batchId + itemId', async () => {
    mockService.removeItem.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRemovePdfBatchItem('b1'), { wrapper: createWrapper() });

    result.current.mutate('item1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockService.removeItem).toHaveBeenCalledWith('b1', 'item1');
  });

  it('useStartPdfBatch calls the service with the batchId and no overrides', async () => {
    mockService.startBatch.mockResolvedValue({ batchId: 'b1', status: 'QUEUED', totalFiles: 1, startedAt: '2026-10-15T00:00:00Z' });
    const { result } = renderHook(() => useStartPdfBatch('b1'), { wrapper: createWrapper() });

    result.current.mutate(undefined);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockService.startBatch).toHaveBeenCalledWith('b1', undefined);
  });

  it('useStartPdfBatch forwards Auto Mode overrides to the service when provided', async () => {
    mockService.startBatch.mockResolvedValue({ batchId: 'b1', status: 'QUEUED', totalFiles: 1, startedAt: '2026-10-15T00:00:00Z' });
    const { result } = renderHook(() => useStartPdfBatch('b1'), { wrapper: createWrapper() });

    result.current.mutate({ autoMaxRounds: 3, autoCostLimitUsd: 0.5, autoColorContrastMode: 'disabled' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockService.startBatch).toHaveBeenCalledWith('b1', { autoMaxRounds: 3, autoCostLimitUsd: 0.5, autoColorContrastMode: 'disabled' });
  });

  it('useCancelPdfBatch calls the service with the batchId', async () => {
    mockService.cancelBatch.mockResolvedValue({ batchId: 'b1', status: 'CANCELLED' });
    const { result } = renderHook(() => useCancelPdfBatch('b1'), { wrapper: createWrapper() });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockService.cancelBatch).toHaveBeenCalledWith('b1');
  });
});

describe('usePdfBatch query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled without a batchId', () => {
    const { result } = renderHook(() => usePdfBatch(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockService.getBatch).not.toHaveBeenCalled();
  });

  it('fetches the batch once enabled', async () => {
    mockService.getBatch.mockResolvedValue(detail());
    const { result } = renderHook(() => usePdfBatch('b1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(detail());
  });
});

describe('usePdfBatches list query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes page and status through to the service', async () => {
    mockService.listBatches.mockResolvedValue({ batches: [], pagination: { page: 2, limit: 20, total: 0, totalPages: 0 } });
    const { result } = renderHook(() => usePdfBatches(2, 'FAILED'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockService.listBatches).toHaveBeenCalledWith(2, 20, 'FAILED');
  });
});
