import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle, Info, Image as ImageIcon } from 'lucide-react';
import { altTextService } from '@/services/alt-text.service';
import type { AltTextFlag, QuickFixImageType, QuickFixAltTextResponse } from '@/types/alt-text.types';

interface QuickFixIssue {
  id: string;
  code: string;
  message: string;
  location?: string;
  html?: string;
  element?: string;
  context?: string;
  severity: string;
  imagePath?: string;
  snippet?: string;
}

interface ImageAltTemplateProps {
  issue: QuickFixIssue;
  jobId: string;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  onValidate: (isValid: boolean) => void;
}

const FLAG_LABELS: Record<AltTextFlag, { label: string; variant: string }> = {
  FACE_DETECTED: { label: 'Face Detected', variant: 'warning' },
  TEXT_IN_IMAGE: { label: 'Contains Text', variant: 'info' },
  LOW_CONFIDENCE: { label: 'Low Confidence', variant: 'error' },
  SENSITIVE_CONTENT: { label: 'Sensitive', variant: 'error' },
  COMPLEX_SCENE: { label: 'Complex Scene', variant: 'warning' },
  NEEDS_MANUAL_REVIEW: { label: 'Needs Review', variant: 'warning' },
  REGENERATED: { label: 'Regenerated', variant: 'default' },
  PARSE_ERROR: { label: 'Parse Error', variant: 'error' },
  DATA_VISUALIZATION: { label: 'Data Viz', variant: 'info' },
  DATA_EXTRACTED: { label: 'Data Extracted', variant: 'success' },
  COMPLEX_IMAGE: { label: 'Complex', variant: 'warning' },
};

const VARIANT_CLASSES: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

interface ImageData {
  src: string;
  fullPath: string;
  html: string;
}

function extractImagePath(issue: QuickFixIssue): string {
  // Check if imagePath is provided directly
  if (issue.imagePath) {
    return issue.imagePath;
  }
  
  // Try parsing context JSON first (recommended by backend)
  if (issue.context) {
    try {
      const ctx = JSON.parse(issue.context) as { images?: ImageData[] };
      if (ctx.images && ctx.images.length > 0) {
        return ctx.images[0].fullPath;
      }
    } catch {
      // Context is not JSON, continue to fallback
    }
  }
  
  // Fallback: extract from element or html
  const elementSource = issue.html || issue.element || issue.snippet || issue.message || '';
  
  // Try to extract src from img tag
  const srcMatch = elementSource.match(/src=["']([^"']+)["']/);
  let src = srcMatch?.[1] || '';
  
  // If no src found, try to find image filename patterns anywhere in the text
  if (!src) {
    const imgFileMatch = elementSource.match(/([\w\-./]+\.(png|jpg|jpeg|gif|svg|webp))/i);
    src = imgFileMatch?.[1] || '';
  }
  
  if (!src) {
    return '';
  }
  
  // If already absolute path, return as-is
  if (src.startsWith('OEBPS/') || src.startsWith('/') || src.startsWith('http')) {
    return src;
  }
  
  // Combine with location directory
  const fileDir = issue.location?.replace(/[^/]+$/, '') || '';
  return fileDir + src;
}

export const ImageAltTemplate: React.FC<ImageAltTemplateProps> = ({
  issue,
  jobId,
  values,
  onChange,
  onValidate,
}) => {
  const [imageType, setImageType] = useState<QuickFixImageType>(
    (values.imageType as QuickFixImageType) || 'informative'
  );
  const [altText, setAltText] = useState<string>((values.altText as string) || '');
  const [longDesc, setLongDesc] = useState<string>((values.longDescription as string) || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<QuickFixAltTextResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);

  const imagePath = extractImagePath(issue);
  
  // Build image URL for preview - backend serves EPUB images at this endpoint
  const imagePreviewUrl = imagePath 
    ? `/api/v1/epub/job/${jobId}/image/${imagePath}`
    : '';
  const prevValidRef = useRef<boolean | null>(null);

  useEffect(() => {
    let isValid = false;
    if (imageType === 'decorative') {
      isValid = true;
    } else if (imageType === 'complex') {
      isValid = altText.trim().length > 0 && altText.length <= 125 && longDesc.trim().length > 0;
    } else {
      isValid = altText.trim().length > 0 && altText.length <= 125;
    }
    
    if (prevValidRef.current !== isValid) {
      prevValidRef.current = isValid;
      onValidate(isValid);
    }
  }, [imageType, altText, longDesc, onValidate]);

  const handleImageTypeChange = useCallback((type: QuickFixImageType) => {
    setImageType(type);
    if (type === 'decorative') {
      setAltText('');
      setLongDesc('');
      setAiResult(null);
      setError(null);
    }
    onChange({ 
      imageType: type, 
      altText: type === 'decorative' ? '' : altText,
      longDescription: type === 'complex' ? longDesc : undefined,
    });
  }, [altText, longDesc, onChange]);

  const handleAltTextChange = useCallback((value: string) => {
    setAltText(value);
    onChange({
      altText: value,
      imageType,
      longDescription: imageType === 'complex' ? longDesc : undefined,
      aiGenerated: !!aiResult,
      aiConfidence: aiResult?.confidence,
    });
  }, [imageType, longDesc, aiResult, onChange]);

  const handleLongDescChange = useCallback((value: string) => {
    setLongDesc(value);
    onChange({
      altText,
      imageType,
      longDescription: value,
      aiGenerated: !!aiResult,
      aiConfidence: aiResult?.confidence,
    });
  }, [altText, imageType, aiResult, onChange]);

  const handleGenerateClick = async () => {
    if (imageType === 'decorative') {
      setAltText('');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await altTextService.generateForQuickFix(jobId, imagePath, imageType);
      setAiResult(result);
      setAltText(result.shortAlt);
      
      if (imageType === 'complex' && result.longDescription) {
        setLongDesc(result.longDescription);
      }

      onChange({
        altText: result.shortAlt,
        imageType,
        longDescription: imageType === 'complex' ? result.longDescription : undefined,
        aiGenerated: true,
        aiConfidence: result.confidence,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate alt text';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 85) return { text: `${confidence}%`, variant: 'success' };
    if (confidence >= 70) return { text: `${confidence}%`, variant: 'warning' };
    return { text: `${confidence}%`, variant: 'error' };
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-gray-50">
        <p className="text-sm font-medium text-gray-600 mb-2">
          Image: {imagePath || issue.location || 'Location unknown'}
        </p>
        <div className="flex items-center justify-center min-h-[8rem] bg-gray-200 rounded overflow-hidden">
          {imagePreviewUrl && !imageLoadError ? (
            <img
              src={imagePreviewUrl}
              alt="Preview of the image needing alt text"
              className="max-h-48 max-w-full object-contain"
              onError={() => setImageLoadError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm">
              <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
              <span>{imagePath ? 'Image preview not available' : 'Image path could not be detected'}</span>
              <span className="text-xs text-gray-400 mt-1">Use "Generate with AI" to analyze the image</span>
            </div>
          )}
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-700">
          What type of image is this?
        </legend>
        <div className="space-y-2">
          <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="imageType"
              value="decorative"
              checked={imageType === 'decorative'}
              onChange={() => handleImageTypeChange('decorative')}
              className="mt-0.5"
            />
            <div>
              <span className="font-medium text-gray-900">Decorative Image</span>
              <p className="text-sm text-gray-500">No informational content - will use alt="" (empty)</p>
            </div>
          </label>
          <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="imageType"
              value="informative"
              checked={imageType === 'informative'}
              onChange={() => handleImageTypeChange('informative')}
              className="mt-0.5"
            />
            <div>
              <span className="font-medium text-gray-900">Informative Image</span>
              <p className="text-sm text-gray-500">Conveys information - requires short alt text</p>
            </div>
          </label>
          <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="imageType"
              value="complex"
              checked={imageType === 'complex'}
              onChange={() => handleImageTypeChange('complex')}
              className="mt-0.5"
            />
            <div>
              <span className="font-medium text-gray-900">Complex Image</span>
              <p className="text-sm text-gray-500">Charts, diagrams, infographics - needs both alt text and long description</p>
            </div>
          </label>
        </div>
      </fieldset>

      {imageType !== 'decorative' && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="altText" className="block text-sm font-medium text-gray-700">
                Alternative Text
              </label>
              <button
                type="button"
                onClick={handleGenerateClick}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate with AI
                  </>
                )}
              </button>
            </div>
            <textarea
              id="altText"
              value={altText}
              onChange={(e) => handleAltTextChange(e.target.value)}
              placeholder="Describe the image content and purpose..."
              maxLength={125}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500">
                Keep it concise (125 chars max). Describe what the image shows.
              </p>
              <span className={`text-xs ${altText.length > 125 ? 'text-red-500' : 'text-gray-400'}`}>
                {altText.length}/125
              </span>
            </div>
          </div>

          {aiResult && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${VARIANT_CLASSES[getConfidenceBadge(aiResult.confidence).variant]}`}>
                AI Confidence: {getConfidenceBadge(aiResult.confidence).text}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                AI suggestion applied
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {aiResult && aiResult.flags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {aiResult.flags.map((flag) => {
                const config = FLAG_LABELS[flag];
                return (
                  <span
                    key={flag}
                    className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${VARIANT_CLASSES[config?.variant || 'default']}`}
                  >
                    {config?.label || flag}
                  </span>
                );
              })}
            </div>
          )}

          {aiResult?.needsReview && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              AI suggests this image needs human review. Please verify the description is accurate.
            </div>
          )}

          {imageType === 'complex' && (
            <div>
              <label htmlFor="longDesc" className="block text-sm font-medium text-gray-700 mb-1">
                Long Description
              </label>
              <textarea
                id="longDesc"
                value={longDesc}
                onChange={(e) => handleLongDescChange(e.target.value)}
                placeholder="Provide a detailed description of the complex image content, data points, trends, or key information..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                For charts and diagrams, describe the data, relationships, and key takeaways.
              </p>
            </div>
          )}
        </div>
      )}

      {imageType === 'decorative' && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <Info className="h-4 w-4 flex-shrink-0" />
          <span>
            Decorative images will have <code className="bg-blue-100 px-1 rounded">alt=""</code> applied.
            This tells screen readers to skip the image.
          </span>
        </div>
      )}
    </div>
  );
};

export default ImageAltTemplate;
