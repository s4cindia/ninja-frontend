import { api } from './api';
import type { FeedbackAttachment } from '@/types/feedback.types';

export const feedbackAttachmentService = {
  async list(feedbackId: string): Promise<FeedbackAttachment[]> {
    const response = await api.get(`/feedback/${feedbackId}/attachments`);
    return response.data.data;
  },

  async upload(feedbackId: string, files: File[]): Promise<FeedbackAttachment[]> {
    const results: FeedbackAttachment[] = [];

    for (const file of files) {
      try {
        const presignResponse = await api.post(`/feedback/${feedbackId}/attachments/presign`, {
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
        });

        const { presignedUrl, s3Key, useDirectUpload } = presignResponse.data.data;

        if (useDirectUpload) {
          const formData = new FormData();
          formData.append('files', file);
          const response = await api.post(`/feedback/${feedbackId}/attachments`, formData);
          if (response.data.data) {
            results.push(...(Array.isArray(response.data.data) ? response.data.data : [response.data.data]));
          }
        } else {
          const uploadResponse = await fetch(presignedUrl, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
          });

          if (!uploadResponse.ok) {
            throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
          }

          const confirmResponse = await api.post(`/feedback/${feedbackId}/attachments/confirm`, {
            s3Key,
            originalName: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
          });

          if (confirmResponse.data.data) {
            results.push(confirmResponse.data.data);
          }
        }
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        throw error;
      }
    }

    return results;
  },

  async getDownloadUrl(attachmentId: string): Promise<{ url: string }> {
    const response = await api.get(`/feedback/attachments/${attachmentId}/download`);
    return response.data.data;
  },

  async delete(attachmentId: string): Promise<void> {
    await api.delete(`/feedback/attachments/${attachmentId}`);
  },
};
