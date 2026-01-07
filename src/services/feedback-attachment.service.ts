import { api } from './api';
import type { FeedbackAttachment } from '@/types/feedback.types';

export const feedbackAttachmentService = {
  async list(feedbackId: string): Promise<FeedbackAttachment[]> {
    const response = await api.get(`/feedback/${feedbackId}/attachments`);
    return response.data.data;
  },

  async upload(feedbackId: string, files: File[]): Promise<FeedbackAttachment[]> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await api.post(`/feedback/${feedbackId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  async getDownloadUrl(attachmentId: string): Promise<{ url: string }> {
    const response = await api.get(`/feedback/attachments/${attachmentId}/download`);
    return response.data.data;
  },

  async delete(attachmentId: string): Promise<void> {
    await api.delete(`/feedback/attachments/${attachmentId}`);
  },
};
