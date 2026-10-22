import { api, ApiResponse } from './api';
import type {
  PdfBatchListResponse,
  CreatePdfBatchRequest,
  CreatePdfBatchResponse,
  AddPdfBatchItemsRequestItem,
  AddPdfBatchItemsResponse,
  StartPdfBatchRequest,
  StartPdfBatchResponse,
  CancelPdfBatchResponse,
  PdfBatchDetail,
} from '@/types/pdfBatch.types';
import type { BudgetEstimate } from '@/types/pdfAutoMode.types';

const BASE_URL = '/pdf-batches';

export const pdfBatchService = {
  async createBatch(data: CreatePdfBatchRequest): Promise<CreatePdfBatchResponse> {
    const response = await api.post<ApiResponse<CreatePdfBatchResponse>>(BASE_URL, data);
    return response.data.data;
  },

  async addItems(batchId: string, items: AddPdfBatchItemsRequestItem[]): Promise<AddPdfBatchItemsResponse> {
    const response = await api.post<ApiResponse<AddPdfBatchItemsResponse>>(
      `${BASE_URL}/${batchId}/items`,
      { items }
    );
    return response.data.data;
  },

  async removeItem(batchId: string, itemId: string): Promise<void> {
    await api.delete(`${BASE_URL}/${batchId}/items/${itemId}`);
  },

  async startBatch(batchId: string, overrides?: StartPdfBatchRequest): Promise<StartPdfBatchResponse> {
    // Conditional call (not just passing `overrides` through unconditionally)
    // so a start with no overrides still posts with no body at all, exactly
    // as before -- not a call with an explicit `undefined` body.
    const response = overrides
      ? await api.post<ApiResponse<StartPdfBatchResponse>>(`${BASE_URL}/${batchId}/start`, overrides)
      : await api.post<ApiResponse<StartPdfBatchResponse>>(`${BASE_URL}/${batchId}/start`);
    return response.data.data;
  },

  async cancelBatch(batchId: string): Promise<CancelPdfBatchResponse> {
    const response = await api.post<ApiResponse<CancelPdfBatchResponse>>(`${BASE_URL}/${batchId}/cancel`);
    return response.data.data;
  },

  async getBatch(batchId: string): Promise<PdfBatchDetail> {
    const response = await api.get<ApiResponse<PdfBatchDetail>>(`${BASE_URL}/${batchId}`);
    return response.data.data;
  },

  async listBatches(page: number = 1, limit: number = 20, status?: string): Promise<PdfBatchListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) {
      params.append('status', status);
    }
    const response = await api.get<ApiResponse<PdfBatchListResponse>>(`${BASE_URL}?${params}`);
    return response.data.data;
  },

  /** Tenant-wide, not per-item -- no item in a DRAFT batch has been audited yet. */
  async getBudgetEstimate(batchId: string): Promise<BudgetEstimate> {
    const response = await api.get<ApiResponse<BudgetEstimate>>(`${BASE_URL}/${batchId}/budget-estimate`);
    return response.data.data;
  },
};
