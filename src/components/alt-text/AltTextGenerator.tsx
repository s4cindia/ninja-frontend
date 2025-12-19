import React, { useState, useCallback } from 'react';
import { Upload, Sparkles, RefreshCw, Check, AlertTriangle, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { cn } from '@/utils/cn';
import { useAltTextGeneration, useImageClassification } from '@/hooks/useAltText';
import type { AltTextFlag, ImageType } from '@/types/alt-text.types';

interface AltTextGeneratorProps {
  jobId: string;
  imageId?: string;
  imageUrl?: string;
  onGenerated?: (result: unknown) => void;
  showUpload?: boolean;
}

const FLAG_LABELS: Record<AltTextFlag, { label: string; color: string }> = {
  FACE_DETECTED: { label: 'Face Detected', color: 'yellow' },
  TEXT_IN_IMAGE: { label: 'Contains Text', color: 'blue' },
  LOW_CONFIDENCE: { label: 'Low Confidence', color: 'red' },
  SENSITIVE_CONTENT: { label: 'Sensitive', color: 'red' },
  COMPLEX_SCENE: { label: 'Complex Scene', color: 'yellow' },
  NEEDS_MANUAL_REVIEW: { label: 'Needs Review', color: 'orange' },
  REGENERATED: { label: 'Regenerated', color: 'gray' },
  PARSE_ERROR: { label: 'Parse Error', color: 'red' },
  DATA_VISUALIZATION: { label: 'Data Viz', color: 'purple' },
  DATA_EXTRACTED: { label: 'Data Extracted', color: 'green' },
  COMPLEX_IMAGE: { label: 'Complex', color: 'yellow' },
};

const IMAGE_TYPE_LABELS: Record<ImageType, string> = {
  BAR_CHART: 'Bar Chart',
  LINE_CHART: 'Line Chart',
  PIE_CHART: 'Pie Chart',
  SCATTER_PLOT: 'Scatter Plot',
  FLOWCHART: 'Flowchart',
  ORG_CHART: 'Org Chart',
  DIAGRAM: 'Diagram',
  TABLE_IMAGE: 'Table Image',
  MAP: 'Map',
  INFOGRAPHIC: 'Infographic',
  PHOTO: 'Photo',
  UNKNOWN: 'Unknown',
};

export const AltTextGenerator: React.FC<AltTextGeneratorProps> = ({
  jobId,
  imageId,
  imageUrl,
  onGenerated,
  showUpload = true,
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(imageUrl || null);
  const [useContext, setUseContext] = useState(true);
  
  const { isGenerating, result, error, generate, generateContextual, generateFromFile, reset } = useAltTextGeneration();
  const { imageType, classify } = useImageClassification();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      reset();
    }
  }, [reset]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      reset();
    }
  }, [reset]);

  const handleGenerate = async () => {
    try {
      let data;
      if (uploadedFile) {
        data = await generateFromFile(uploadedFile, jobId);
      } else if (imageId) {
        if (useContext) {
          const contextResult = await generateContextual(imageId, jobId);
          data = contextResult.contextAware;
        } else {
          data = await generate(imageId, jobId);
        }
      }
      
      if (data) {
        onGenerated?.(data);
        if (imageId) {
          await classify(imageId, jobId);
        }
      }
    } catch (err) {
      console.error('Generation failed:', err);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    reset();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600 bg-green-100';
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-4">
      {showUpload && !imageUrl && (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            'hover:border-primary-400 hover:bg-primary-50',
            previewUrl && 'border-primary-300 bg-primary-50'
          )}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {previewUrl ? (
            <div className="space-y-3">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-48 mx-auto rounded-lg shadow-sm"
              />
              <p className="text-sm text-gray-600">{uploadedFile?.name}</p>
              <Button variant="ghost" size="sm" onClick={handleRemoveFile}>
                Remove
              </Button>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop an image, or click to browse
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
                <span className="text-primary-600 hover:text-primary-700 font-medium">
                  Select Image
                </span>
              </label>
            </>
          )}
        </div>
      )}

      {imageUrl && (
        <div className="flex justify-center">
          <img
            src={imageUrl}
            alt="Image to describe"
            className="max-h-64 rounded-lg shadow-sm"
          />
        </div>
      )}

      {imageId && (
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useContext}
              onChange={(e) => setUseContext(e.target.checked)}
              className="rounded border-gray-300"
            />
            Use document context
          </label>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Context improves accuracy for images within documents
          </div>
        </div>
      )}

      <Button
        onClick={handleGenerate}
        disabled={isGenerating || (!uploadedFile && !imageId)}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Alt Text
          </>
        )}
      </Button>

      {error && (
        <Alert variant="error">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </Alert>
      )}

      {result && (
        <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Generated Alt Text</h3>
            <div className="flex items-center gap-2">
              {imageType && (
                <Badge variant="info">{IMAGE_TYPE_LABELS[imageType]}</Badge>
              )}
              <span className={cn(
                'px-2 py-1 rounded-full text-xs font-medium',
                getConfidenceColor(result.confidence)
              )}>
                {result.confidence}% confidence
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Short Alt Text ({result.shortAlt.length}/125 chars)
            </label>
            <div className="bg-white border rounded-lg p-3">
              <p className="text-gray-900">{result.shortAlt}</p>
            </div>
          </div>

          {result.extendedAlt && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Extended Description ({result.extendedAlt.length}/250 chars)
              </label>
              <div className="bg-white border rounded-lg p-3">
                <p className="text-gray-700 text-sm">{result.extendedAlt}</p>
              </div>
            </div>
          )}

          {result.flags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {result.flags.map((flag) => {
                const config = FLAG_LABELS[flag];
                return (
                  <Badge key={flag} variant={config?.color as 'default' | 'success' | 'warning' | 'error' | 'info' || 'default'}>
                    {config?.label || flag}
                  </Badge>
                );
              })}
            </div>
          )}

          {result.needsReview && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              This image requires human review before approval.
            </Alert>
          )}

          <div className="flex gap-2 pt-2 border-t">
            <Button variant="primary" size="sm">
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button variant="outline" size="sm" onClick={handleGenerate}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Regenerate
            </Button>
          </div>

          <p className="text-xs text-gray-400">
            Generated by {result.aiModel} at {new Date(result.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};
