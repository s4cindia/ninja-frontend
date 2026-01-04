import { api } from './api';

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
    onProgress?: ProgressCallback
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
      xhr.setRequestHeader('Content-Type', file.type || 'application/epub+zip');
      xhr.send(file);
    });
  }

  async confirmUpload(fileId: string): Promise<void> {
    await api.post(`/uploads/${fileId}/confirm`);
  }

  async uploadDirect(
    file: File,
    onProgress?: ProgressCallback
  ): Promise<DirectUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/epub/audit-buffer', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
    onProgress?: ProgressCallback
  ): Promise<{ fileId: string; fileKey: string }> {
    try {
      const presigned = await this.getPresignedUrl(
        file.name,
        file.size,
        file.type || 'application/epub+zip'
      );

      await this.uploadToS3(presigned.uploadUrl, file, onProgress);
      await this.confirmUpload(presigned.fileId);

      return {
        fileId: presigned.fileId,
        fileKey: presigned.fileKey,
      };
    } catch (error) {
      console.warn('S3 upload failed, falling back to direct upload:', error);

      const result = await this.uploadDirect(file, onProgress);
      return {
        fileId: result.fileId || result.jobId,
        fileKey: result.jobId,
      };
    }
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    const response = await api.get(`/uploads/${fileId}/download`);
    return response.data.data.downloadUrl;
  }
}

export const uploadService = new UploadService();
