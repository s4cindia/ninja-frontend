import { useState, useCallback } from 'react';
import { uploadService } from '../services/upload.service';

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  fileId: string | null;
  fileKey: string | null;
}

export function useS3Upload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    fileId: null,
    fileKey: null,
  });

  const upload = useCallback(async (file: File) => {
    setState({
      isUploading: true,
      progress: 0,
      error: null,
      fileId: null,
      fileKey: null,
    });

    try {
      const result = await uploadService.uploadFile(file, (progress) => {
        setState((prev) => ({
          ...prev,
          progress: progress.percentage,
        }));
      });

      setState((prev) => ({
        ...prev,
        isUploading: false,
        progress: 100,
        fileId: result.fileId,
        fileKey: result.fileKey,
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setState((prev) => ({
        ...prev,
        isUploading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      fileId: null,
      fileKey: null,
    });
  }, []);

  return {
    ...state,
    upload,
    reset,
  };
}
