import { useState, useCallback } from 'react';
import { altTextService } from '@/services/alt-text.service';
import type { AltTextGenerationResult } from '@/types/alt-text.types';

interface UseQuickFixAltTextOptions {
  jobId: string;
  imageId?: string;
  imagePath?: string;
  onSuccess?: (result: AltTextGenerationResult) => void;
}

export function useQuickFixAltText({ jobId, imageId, imagePath: _imagePath, onSuccess }: UseQuickFixAltTextOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<AltTextGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateAltText = useCallback(async (imageFile?: File) => {
    setIsGenerating(true);
    setError(null);

    try {
      let data: AltTextGenerationResult;

      if (imageFile) {
        data = await altTextService.generateFromFile(imageFile, jobId, imageId);
      } else if (imageId) {
        const contextResult = await altTextService.generateContextual(imageId, jobId);
        data = contextResult.contextAware;
      } else {
        throw new Error('No image source provided');
      }

      setResult(data);
      onSuccess?.(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Alt text generation failed';
      setError(message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [jobId, imageId, onSuccess]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isGenerating,
    result,
    error,
    generateAltText,
    reset,
  };
}
