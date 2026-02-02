import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle, Info, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { altTextService } from '@/services/alt-text.service';
import { AuthenticatedImage } from '@/components/ui/AuthenticatedImage';
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

const MAX_ALT_TEXT_LENGTH = 125;

// Pattern to match image filenames - no global flag to avoid stateful matching issues
const IMAGE_FILE_PATTERN = /(?:^|\/|OEBPS\/)([\w-]+\.(png|jpg|jpeg|gif|svg|webp))$/i;

interface ImageData {
  src: string;
  fullPath: string;
  html: string;
}

// Helper to normalize image paths relative to the issue location
function normalizeImagePath(src: string, issueLocation?: string): string {
  if (src.startsWith('OEBPS/') || src.startsWith('/') || src.startsWith('http')) {
    return src;
  }
  const fileDir = issueLocation?.replace(/[^/]+$/, '') || '';
  return fileDir + src;
}

function extractAllImagePaths(issue: QuickFixIssue): string[] {
  const images: string[] = [];
  
  // Check if imagePath is provided directly
  if (issue.imagePath) {
    images.push(issue.imagePath);
  }
  
  // Try parsing context JSON first (recommended by backend)
  if (issue.context) {
    try {
      const ctx = JSON.parse(issue.context) as { images?: ImageData[] };
      if (ctx.images && ctx.images.length > 0) {
        ctx.images.forEach(img => {
          if (img.fullPath && !images.includes(img.fullPath)) {
            images.push(img.fullPath);
          }
        });
      }
    } catch {
      // Context is not JSON, continue to fallback
    }
  }
  
  // Fallback: extract from element or html if no images found
  if (images.length === 0) {
    const elementSource = issue.html || issue.element || issue.snippet || issue.message || '';
    
    // Try to extract all src attributes from img tags
    const srcMatches = elementSource.matchAll(/src=["']([^"']+)["']/g);
    for (const match of srcMatches) {
      const src = match[1];
      if (src && !images.includes(src)) {
        images.push(normalizeImagePath(src, issue.location));
      }
    }
    
    // If still no images, try to find image filename patterns (stricter pattern)
    if (images.length === 0) {
      const match = elementSource.match(IMAGE_FILE_PATTERN);
      if (match && match[0] && !images.includes(match[0])) {
        images.push(normalizeImagePath(match[0], issue.location));
      }
    }
  }
  
  return images;
}


export const ImageAltTemplate: React.FC<ImageAltTemplateProps> = ({
  issue,
  jobId,
  values,
  onChange,
  onValidate,
}) => {
  // Extract all images from the issue
  const allImagePaths = useMemo(() => extractAllImagePaths(issue), [issue]);
  const totalImages = allImagePaths.length;
  
  // Multi-image state - store alt text for each image
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageData, setImageData] = useState<Record<number, {
    imageType: QuickFixImageType;
    altText: string;
    longDescription: string;
    aiResult: QuickFixAltTextResponse | null;
  }>>(() => {
    // Initialize from values if available
    const initial: Record<number, { imageType: QuickFixImageType; altText: string; longDescription: string; aiResult: QuickFixAltTextResponse | null }> = {};
    
    // Runtime validation: ensure values.images is an array
    const savedImages = Array.isArray(values.images) 
      ? values.images as Array<{ imageType: QuickFixImageType; altText: string; longDescription?: string }>
      : undefined;
    
    for (let i = 0; i < Math.max(totalImages, 1); i++) {
      if (savedImages && savedImages[i]) {
        initial[i] = {
          imageType: savedImages[i].imageType || 'informative',
          altText: savedImages[i].altText || '',
          longDescription: savedImages[i].longDescription || '',
          aiResult: null,
        };
      } else if (i === 0 && !savedImages) {
        // Fallback to legacy single-image values
        initial[i] = {
          imageType: (values.imageType as QuickFixImageType) || 'informative',
          altText: (values.altText as string) || '',
          longDescription: (values.longDescription as string) || '',
          aiResult: null,
        };
      } else {
        initial[i] = {
          imageType: 'informative',
          altText: '',
          longDescription: '',
          aiResult: null,
        };
      }
    }
    return initial;
  });
  
  const [generatingImages, setGeneratingImages] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<number, boolean>>({});
  
  const isGenerating = generatingImages[currentImageIndex] || false;

  // Current image data
  const currentData = imageData[currentImageIndex] || { imageType: 'informative' as QuickFixImageType, altText: '', longDescription: '', aiResult: null };
  const imageType = currentData.imageType;
  const altText = currentData.altText;
  const longDesc = currentData.longDescription;
  const aiResult = currentData.aiResult;
  
  const imagePath = allImagePaths[currentImageIndex] || '';
  
  // Build image URL for preview - backend serves EPUB images at this endpoint
  // Note: Don't include /api/v1 prefix since AuthenticatedImage uses the api client which has baseURL set
  // Strip leading slashes to avoid double slashes in URL
  const normalizedPath = imagePath.replace(/^\/+/, '');
  const imagePreviewUrl = normalizedPath 
    ? `/epub/job/${jobId}/image/${normalizedPath}`
    : '';
  const imageLoadError = imageLoadErrors[currentImageIndex] || false;
  
  const prevValidRef = useRef<boolean | null>(null);

  // Helper to update current image data
  const updateCurrentImageData = useCallback((updates: Partial<typeof currentData>) => {
    setImageData(prev => ({
      ...prev,
      [currentImageIndex]: {
        ...prev[currentImageIndex],
        ...updates,
      },
    }));
  }, [currentImageIndex]);

  // Sync image data to parent when it changes
  const isMounted = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  
  // Reset state when issue changes
  const prevIssueId = useRef(issue.id);
  const issueIdRef = useRef(issue.id);
  issueIdRef.current = issue.id;
  
  useEffect(() => {
    if (prevIssueId.current !== issue.id) {
      prevIssueId.current = issue.id;
      setCurrentImageIndex(0);
      setGeneratingImages({});
      setError(null);
      setImageLoadErrors({});
      
      // Runtime validation: ensure values.images is an array
      const savedImages = Array.isArray(values.images)
        ? values.images as Array<{ imageType: QuickFixImageType; altText: string; longDescription?: string }>
        : undefined;
      const newImageData: Record<number, { imageType: QuickFixImageType; altText: string; longDescription: string; aiResult: QuickFixAltTextResponse | null }> = {};
      
      for (let i = 0; i < Math.max(allImagePaths.length, 1); i++) {
        if (savedImages && savedImages[i]) {
          newImageData[i] = {
            imageType: savedImages[i].imageType || 'informative',
            altText: savedImages[i].altText || '',
            longDescription: savedImages[i].longDescription || '',
            aiResult: null,
          };
        } else if (i === 0 && !savedImages) {
          // Preserve legacy single-image fields when values.images is undefined
          newImageData[i] = {
            imageType: (values.imageType as QuickFixImageType) || 'informative',
            altText: (values.altText as string) || '',
            longDescription: (values.longDescription as string) || '',
            aiResult: null,
          };
        } else {
          newImageData[i] = {
            imageType: 'informative',
            altText: '',
            longDescription: '',
            aiResult: null,
          };
        }
      }
      setImageData(newImageData);
    }
  }, [issue.id, allImagePaths.length, values.images, values.imageType, values.altText, values.longDescription]);
  
  // Debounce timer ref for onChange
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    // Skip first render to avoid setState during mount
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    
    // Debounce onChange calls to reduce parent re-renders during typing
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      let images;
      if (allImagePaths.length === 0) {
        // Emit a placeholder entry to preserve edits when no image paths detected
        const data = imageData[0] || { imageType: 'informative', altText: '', longDescription: '' };
        images = [{
          imagePath: '',
          imageType: data.imageType,
          altText: data.altText,
          longDescription: data.longDescription,
        }];
      } else {
        images = allImagePaths.map((path, idx) => {
          const data = imageData[idx] || { imageType: 'informative', altText: '', longDescription: '' };
          return {
            imagePath: path,
            imageType: data.imageType,
            altText: data.altText,
            longDescription: data.longDescription,
          };
        });
      }
      onChangeRef.current({ images });
    }, 300);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [imageData, allImagePaths]);

  // Validate all images have required data
  useEffect(() => {
    let allValid = true;
    
    for (let i = 0; i < Math.max(totalImages, 1); i++) {
      const data = imageData[i];
      if (!data) {
        allValid = false;
        break;
      }
      
      if (data.imageType === 'decorative') {
        continue; // Decorative images are always valid
      } else if (data.imageType === 'complex') {
        if (!data.altText.trim() || data.altText.length > MAX_ALT_TEXT_LENGTH || !data.longDescription.trim()) {
          allValid = false;
          break;
        }
      } else {
        if (!data.altText.trim() || data.altText.length > MAX_ALT_TEXT_LENGTH) {
          allValid = false;
          break;
        }
      }
    }
    
    if (prevValidRef.current !== allValid) {
      prevValidRef.current = allValid;
      onValidate(allValid);
    }
  }, [imageData, totalImages, onValidate]);

  const handleImageTypeChange = useCallback((type: QuickFixImageType) => {
    if (type === 'decorative') {
      setError(null);
    }
    
    setImageData(prev => {
      const current = prev[currentImageIndex];
      return {
        ...prev,
        [currentImageIndex]: {
          ...current,
          imageType: type,
          altText: type === 'decorative' ? '' : current.altText,
          longDescription: type === 'decorative' ? '' : current.longDescription,
          aiResult: type === 'decorative' ? null : current.aiResult,
        },
      };
    });
  }, [currentImageIndex]);

  const handleAltTextChange = useCallback((value: string) => {
    setImageData(prev => ({
      ...prev,
      [currentImageIndex]: { ...prev[currentImageIndex], altText: value },
    }));
  }, [currentImageIndex]);

  const handleLongDescChange = useCallback((value: string) => {
    setImageData(prev => ({
      ...prev,
      [currentImageIndex]: { ...prev[currentImageIndex], longDescription: value },
    }));
  }, [currentImageIndex]);

  // Track component mount state for async cleanup
  const isComponentMountedRef = useRef(true);
  useEffect(() => {
    isComponentMountedRef.current = true;
    return () => {
      isComponentMountedRef.current = false;
    };
  }, []);

  const handleGenerateClick = async () => {
    if (imageType === 'decorative') {
      updateCurrentImageData({ altText: '' });
      return;
    }

    const imageIdx = currentImageIndex;
    const currentIssueId = issue.id;
    setGeneratingImages(prev => ({ ...prev, [imageIdx]: true }));
    setError(null);

    try {
      const result = await altTextService.generateForQuickFix(jobId, imagePath, imageType);
      
      // Guard against unmounted component and stale responses
      if (!isComponentMountedRef.current || currentIssueId !== issueIdRef.current) {
        return;
      }
      
      setImageData(prev => {
        const current = prev[imageIdx];
        if (!current) return prev;
        
        const updated = {
          ...prev,
          [imageIdx]: {
            ...current,
            aiResult: result,
            altText: result.shortAlt,
            longDescription: imageType === 'complex' && result.longDescription 
              ? result.longDescription 
              : current.longDescription,
          },
        };
        
        // Immediate sync to parent (don't wait for debounce)
        const images = allImagePaths.length === 0
          ? [{
              imagePath: '',
              imageType: updated[0]?.imageType || 'informative',
              altText: updated[0]?.altText || '',
              longDescription: updated[0]?.longDescription || '',
            }]
          : allImagePaths.map((path, idx) => {
              const data = updated[idx] || { imageType: 'informative', altText: '', longDescription: '' };
              return {
                imagePath: path,
                imageType: data.imageType,
                altText: data.altText,
                longDescription: data.longDescription,
              };
            });
        onChangeRef.current({ images });
        
        return updated;
      });
    } catch (err) {
      // Guard against unmounted component and stale errors
      if (!isComponentMountedRef.current || currentIssueId !== issueIdRef.current) {
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to generate alt text';
      setError(message);
    } finally {
      // Guard against unmounted component and stale state updates
      if (isComponentMountedRef.current && currentIssueId === issueIdRef.current) {
        setGeneratingImages(prev => ({ ...prev, [imageIdx]: false }));
      }
    }
  };

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      setError(null);
    }
  };

  const handleNextImage = () => {
    if (currentImageIndex < totalImages - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setError(null);
    }
  };

  // Returns a closure pinned to the given image index to prevent stale closures during navigation
  const createImageLoadErrorHandler = useCallback((index: number) => {
    return () => {
      setImageLoadErrors(prev => ({ ...prev, [index]: true }));
    };
  }, []);

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 85) return { text: `${confidence}%`, variant: 'success' };
    if (confidence >= 70) return { text: `${confidence}%`, variant: 'warning' };
    return { text: `${confidence}%`, variant: 'error' };
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-gray-50">
        {/* Image navigation header */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-600">
            Image: {imagePath || issue.location || 'Location unknown'}
          </p>
          {totalImages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevImage}
                disabled={currentImageIndex === 0}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span 
                className="text-sm text-gray-600"
                role="status"
                aria-live="polite"
                aria-atomic="true"
                aria-label={`Viewing image ${currentImageIndex + 1} of ${totalImages} images requiring alt text`}
              >
                {currentImageIndex + 1} of {totalImages}
              </span>
              <button
                type="button"
                onClick={handleNextImage}
                disabled={currentImageIndex === totalImages - 1}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center min-h-[8rem] bg-gray-200 rounded overflow-hidden">
          {imagePreviewUrl && !imageLoadError ? (
            <AuthenticatedImage
              src={imagePreviewUrl}
              alt="Preview of the image needing alt text"
              className="max-h-48 max-w-full object-contain"
              onError={createImageLoadErrorHandler(currentImageIndex)}
              fallbackMessage={imagePath ? 'Image preview not available' : 'Image path could not be detected'}
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
              maxLength={MAX_ALT_TEXT_LENGTH}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500">
                Keep it concise ({MAX_ALT_TEXT_LENGTH} chars max). Describe what the image shows.
              </p>
              <span className={`text-xs ${altText.length > MAX_ALT_TEXT_LENGTH ? 'text-red-500' : 'text-gray-400'}`}>
                {altText.length}/{MAX_ALT_TEXT_LENGTH}
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
