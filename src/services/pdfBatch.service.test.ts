import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { pdfBatchService } from './pdfBatch.service';
import { api } from './api';

vi.mock('./api', () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const mockApi = api as Mocked<typeof api>;

describe('pdfBatchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createBatch posts the name and returns the batch envelope', async () => {
    mockApi.post.mockResolvedValue({ data: { success: true, data: { batchId: 'b1', name: 'My Batch', status: 'DRAFT', totalFiles: 0, createdAt: '2026-10-15T00:00:00Z' } } });

    const result = await pdfBatchService.createBatch({ name: 'My Batch' });

    expect(mockApi.post).toHaveBeenCalledWith('/pdf-batches', { name: 'My Batch' });
    expect(result).toEqual({ batchId: 'b1', name: 'My Batch', status: 'DRAFT', totalFiles: 0, createdAt: '2026-10-15T00:00:00Z' });
  });

  it('addItems posts the items array to the batch-scoped endpoint', async () => {
    mockApi.post.mockResolvedValue({ data: { success: true, data: { itemsAdded: 2, items: [] } } });

    await pdfBatchService.addItems('b1', [{ sourceFileId: 'f1' }, { sourceFileId: 'f2' }]);

    expect(mockApi.post).toHaveBeenCalledWith('/pdf-batches/b1/items', { items: [{ sourceFileId: 'f1' }, { sourceFileId: 'f2' }] });
  });

  it('removeItem deletes the item at its nested path', async () => {
    mockApi.delete.mockResolvedValue({ data: { success: true, data: null } });

    await pdfBatchService.removeItem('b1', 'item1');

    expect(mockApi.delete).toHaveBeenCalledWith('/pdf-batches/b1/items/item1');
  });

  it('startBatch posts with no body when no overrides are given', async () => {
    mockApi.post.mockResolvedValue({ data: { success: true, data: { batchId: 'b1', status: 'QUEUED', totalFiles: 2, startedAt: '2026-10-15T00:00:00Z' } } });

    await pdfBatchService.startBatch('b1');

    expect(mockApi.post).toHaveBeenCalledWith('/pdf-batches/b1/start');
  });

  it('startBatch posts the Auto Mode overrides as the body when given -- each item still gets its own independent budget/round count, not a shared pool', async () => {
    mockApi.post.mockResolvedValue({ data: { success: true, data: { batchId: 'b1', status: 'QUEUED', totalFiles: 2, startedAt: '2026-10-15T00:00:00Z' } } });

    await pdfBatchService.startBatch('b1', { autoMaxRounds: 3, autoCostLimitUsd: 0.5, autoColorContrastMode: 'disabled' });

    expect(mockApi.post).toHaveBeenCalledWith('/pdf-batches/b1/start', { autoMaxRounds: 3, autoCostLimitUsd: 0.5, autoColorContrastMode: 'disabled' });
  });

  it('cancelBatch posts with no body', async () => {
    mockApi.post.mockResolvedValue({ data: { success: true, data: { batchId: 'b1', status: 'CANCELLED' } } });

    await pdfBatchService.cancelBatch('b1');

    expect(mockApi.post).toHaveBeenCalledWith('/pdf-batches/b1/cancel');
  });

  it('getBatch fetches the batch by id', async () => {
    const batch = { batchId: 'b1', name: null, status: 'DRAFT', totalFiles: 0, statusCounts: {}, createdAt: '2026-10-15T00:00:00Z', items: [] };
    mockApi.get.mockResolvedValue({ data: { success: true, data: batch } });

    const result = await pdfBatchService.getBatch('b1');

    expect(mockApi.get).toHaveBeenCalledWith('/pdf-batches/b1');
    expect(result).toEqual(batch);
  });

  it('listBatches sends page/limit, and status only when provided', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true, data: { batches: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } } });

    await pdfBatchService.listBatches(2, 10);
    expect(mockApi.get).toHaveBeenCalledWith('/pdf-batches?page=2&limit=10');

    await pdfBatchService.listBatches(1, 20, 'COMPLETED');
    expect(mockApi.get).toHaveBeenCalledWith('/pdf-batches?page=1&limit=20&status=COMPLETED');
  });
});
