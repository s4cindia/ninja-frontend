import { api } from './api';
import { isAxiosError } from 'axios';

interface PresignedUploadResponse {
  uploadUrl: string;
  fileKey: string;
  fileId: string;
  expiresIn: number;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface DirectUploadResponse {
  jobId: string;
  fileId?: string;
}

interface UploadResult {
  fileId: string;
  fileKey: string;
  jobId?: string;
  uploadMethod: 's3' | 'direct';
}

type ProgressCallback = (progress: UploadProgress) => void;

class UploadService {
  async getPresignedUrl(
    fileName: string,
    fileSize: number,
    contentType: string = 'application/epub+zip'
  ): Promise<PresignedUploadResponse> {
    const response = await api.post('/uploads/presign', {
      fileName,
      fileSize,
      contentType,
    });
    return response.data.data;
  }

  async uploadToS3(
    presignedUrl: string,
    file: File,
    onProgress?: ProgressCallback,
    contentType?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });

      xhr.open('PUT', presignedUrl);
      // Use provided contentType, fallback to file.type, then to default
      xhr.setRequestHeader('Content-Type', contentType || file.type || 'application/epub+zip');
      xhr.send(file);
    });
  }

  async confirmUpload(fileId: string): Promise<void> {
    await api.post(`/uploads/${fileId}/confirm`);
  }

  async uploadDirect(
    file: File,
    endpoint: string = '/epub/audit-upload',
    onProgress?: ProgressCallback
  ): Promise<DirectUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(endpoint, formData, {
      headers: { 'Content-Type': undefined },
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      },
    });

    return {
      jobId: response.data.data?.jobId || response.data.jobId,
      fileId: response.data.data?.fileId,
    };
  }

  async uploadFile(
    file: File,
    onProgress?: ProgressCallback,
    directUploadEndpoint: string = '/epub/audit-upload'
  ): Promise<UploadResult> {
    let presigned: PresignedUploadResponse | null = null;

    // Determine content type based on file extension if browser doesn't provide it
    const contentType = file.type ||
      (file.name.toLowerCase().endsWith('.pdf')
        ? 'application/pdf'
        : 'application/epub+zip');

    try {
      presigned = await this.getPresignedUrl(
        file.name,
        file.size,
        contentType
      );
    } catch (error) {
      // Presign 500 = S3 not configured, 400 = validation error
      // Fallback to direct upload for both cases
      if (isAxiosError(error) && (error.response?.status === 500 || error.response?.status === 400)) {
        console.warn(`Presign failed (${error.response?.status}), using direct upload`);
        const result = await this.uploadDirect(file, directUploadEndpoint, onProgress);
        return {
          fileId: result.fileId || result.jobId,
          fileKey: result.jobId,
          jobId: result.jobId,
          uploadMethod: 'direct' as const,
        };
      }

      throw error;
    }

    await this.uploadToS3(presigned.uploadUrl, file, onProgress, contentType);
    await this.confirmUpload(presigned.fileId);

    return {
      fileId: presigned.fileId,
      fileKey: presigned.fileKey,
      uploadMethod: 's3' as const,
    };
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    const response = await api.get(`/uploads/${fileId}/download`);
    return response.data.data.downloadUrl;
  }
}

export const uploadService = new UploadService();
