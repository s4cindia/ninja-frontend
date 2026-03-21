import { api } from './api';

// ── Corpus ────────────────────────────────────────────

export interface PresignedUploadResult {
  uploadUrl: string;
  s3Key: string;
  s3Path: string;
  expiresAt: string;
}

export interface CorpusDocument {
  id: string;
  filename: string;
  s3Path: string;
  publisher?: string;
  contentType?: string;
  pageCount?: number;
  language: string;
  createdAt: string;
  bootstrapJobs?: Array<{ id: string; status: string }>;
  taggedPdfPath?: string;
  calibrationRuns?: Array<{
    id: string;
    completedAt: string | null;
    summary: Record<string, unknown> | null;
  }>;
}

export async function getUploadUrl(
  filename: string
): Promise<PresignedUploadResult> {
  const res = await api.post('/admin/corpus/upload-url', { filename });
  return res.data.data;
}

export async function registerCorpusDocument(input: {
  filename: string;
  s3Path: string;
  publisher?: string;
  contentType?: string;
  pageCount?: number;
}): Promise<CorpusDocument> {
  const res = await api.post('/admin/corpus/register', input);
  return res.data.data;
}

export async function listCorpusDocuments(params?: {
  publisher?: string;
  contentType?: string;
  limit?: number;
}): Promise<{ documents: CorpusDocument[]; nextCursor: string | null }> {
  const res = await api.get('/admin/corpus/documents', { params });
  return res.data.data;
}

export async function triggerCalibrationRun(
  documentId: string
): Promise<{ runId: string; status: string }> {
  const res = await api.post(
    `/admin/corpus/documents/${encodeURIComponent(documentId)}/run`
  );
  return res.data.data;
}

export const resetCorpus = async (): Promise<{
  deletedDocuments: number;
  deletedCalibrationRuns: number;
  deletedBootstrapJobs: number;
  deletedZones: number;
}> =>
  (await api.post('/admin/corpus/reset')).data.data;

// ── Users ────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'OPERATOR' | 'ADMIN' | 'VIEWER';
  createdAt: string;
  tenantId: string;
}

export async function listAdminUsers(params?: {
  role?: string;
  limit?: number;
}): Promise<{ users: AdminUser[] }> {
  const res = await api.get('/admin/users', { params });
  return res.data.data;
}

export async function createAdminUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  password: string;
}): Promise<AdminUser> {
  const res = await api.post('/admin/users', input);
  return res.data.data;
}

export async function updateUserRole(
  userId: string,
  role: string
): Promise<{ id: string; role: string }> {
  const res = await api.patch(
    `/admin/users/${encodeURIComponent(userId)}/role`,
    { role }
  );
  return res.data.data;
}
