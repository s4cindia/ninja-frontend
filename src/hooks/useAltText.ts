import { useState } from 'react';
import { altTextService } from '@/services/alt-text.service';
import type { AltTextGenerationResult, ImageType } from '@/types/alt-text.types';

export function useAltTextGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<AltTextGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async (imageId: string, jobId: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await altTextService.generate(imageId, jobId);
      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setError(message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateContextual = async (imageId: string, jobId: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await altTextService.generateContextual(imageId, jobId);
      setResult(data.contextAware);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setError(message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFromFile = async (file: File, jobId: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await altTextService.generateFromFile(file, jobId);
      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setError(message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return {
    isGenerating,
    result,
    error,
    generate,
    generateContextual,
    generateFromFile,
    reset,
  };
}

export function useImageClassification() {
  const [isClassifying, setIsClassifying] = useState(false);
  const [imageType, setImageType] = useState<ImageType | null>(null);
  const [needsSpecialized, setNeedsSpecialized] = useState(false);

  const classify = async (imageId: string, jobId: string) => {
    setIsClassifying(true);
    try {
      const data = await altTextService.classifyImage(imageId, jobId);
      setImageType(data.imageType);
      setNeedsSpecialized(data.needsSpecializedDescription);
      return data;
    } catch (err) {
      console.error('Image classification failed:', err);
      throw err;
    } finally {
      setIsClassifying(false);
    }
  };

  return { isClassifying, imageType, needsSpecialized, classify };
}
