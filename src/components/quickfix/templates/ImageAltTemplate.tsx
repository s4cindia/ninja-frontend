import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle, Info, Image as ImageIcon } from 'lucide-react';
import { useQuickFixAltText } from '@/hooks/useQuickFixAltText';
import type { AltTextFlag } from '@/types/alt-text.types';

interface QuickFixIssue {
  id: string;
  code: string;
  message: string;
  location?: string;
  html?: string;
  severity: string;
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

export const ImageAltTemplate: React.FC<ImageAltTemplateProps> = ({
  issue,
  jobId,
  values,
  onChange,
  onValidate,
}) => {
  const [isDecorative, setIsDecorative] = useState<string>(
    (values.isDecorative as string) || 'no'
  );
  const [altText, setAltText] = useState<string>((values.altText as string) || '');
  const [aiUsed, setAiUsed] = useState(false);

  const imagePath = issue.location || issue.html?.match(/src=["']([^"']+)["']/)?.[1] || '';
  const imageId = issue.id || `img-${imagePath.replace(/[^a-z0-9]/gi, '-')}`;

  const { isGenerating, result, error, generateAltText, reset } = useQuickFixAltText({
    jobId,
    imageId,
    imagePath,
    onSuccess: (data) => {
      setAltText(data.shortAlt);
      setAiUsed(true);
      onChange({
        altText: data.shortAlt,
        isDecorative,
        aiGenerated: true,
        aiConfidence: data.confidence,
        extendedAlt: data.extendedAlt,
      });
    },
  });

  const prevValidRef = useRef<boolean | null>(null);

  useEffect(() => {
    const isValid = isDecorative === 'yes' || (altText.trim().length > 0 && altText.length <= 125);
    if (prevValidRef.current !== isValid) {
      prevValidRef.current = isValid;
      onValidate(isValid);
    }
  }, [isDecorative, altText, onValidate]);

  const handleDecorativeChange = useCallback((value: string) => {
    setIsDecorative(value);
    if (value === 'yes') {
      setAltText('');
      setAiUsed(false);
      reset();
    }
    onChange({ altText: value === 'yes' ? '' : altText, isDecorative: value });
  }, [altText, onChange, reset]);

  const handleAltTextChange = useCallback((value: string) => {
    setAltText(value);
    onChange({
      altText: value,
      isDecorative,
      aiGenerated: aiUsed,
      aiConfidence: result?.confidence,
    });
  }, [isDecorative, aiUsed, result?.confidence, onChange]);

  const handleGenerateClick = async () => {
    try {
      await generateAltText();
    } catch {
      // Error is already set in hook
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 85) return { text: `${confidence}%`, variant: 'success' };
    if (confidence >= 70) return { text: `${confidence}%`, variant: 'warning' };
    return { text: `${confidence}%`, variant: 'error' };
  };

  return (
    <div className="space-y-4">
      {imagePath && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <p className="text-sm font-medium text-gray-600 mb-2">Image: {imagePath}</p>
          <div className="flex items-center justify-center h-32 bg-gray-200 rounded text-gray-500 text-sm">
            <ImageIcon className="h-8 w-8 mr-2 opacity-50" />
            [Image Preview]
          </div>
        </div>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-700">
          Is this image decorative (no informational content)?
        </legend>
        <div className="space-y-2">
          <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="isDecorative"
              value="yes"
              checked={isDecorative === 'yes'}
              onChange={() => handleDecorativeChange('yes')}
              className="mt-0.5"
            />
            <div>
              <span className="font-medium text-gray-900">Yes, decorative only</span>
              <p className="text-sm text-gray-500">Will use alt="" (empty alt attribute)</p>
            </div>
          </label>
          <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="isDecorative"
              value="no"
              checked={isDecorative === 'no'}
              onChange={() => handleDecorativeChange('no')}
              className="mt-0.5"
            />
            <div>
              <span className="font-medium text-gray-900">No, it conveys information</span>
              <p className="text-sm text-gray-500">Requires descriptive alt text</p>
            </div>
          </label>
        </div>
      </fieldset>

      {isDecorative === 'no' && (
        <div className="space-y-3">
          <div>
            <label htmlFor="altText" className="block text-sm font-medium text-gray-700 mb-1">
              Enter alt text
            </label>
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
                Keep it concise (125 chars max). Describe what the image shows and why it's important.
              </p>
              <span className={`text-xs ${altText.length > 125 ? 'text-red-500' : 'text-gray-400'}`}>
                {altText.length}/125
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateClick}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate with AI
                </>
              )}
            </button>

            {result && (
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${VARIANT_CLASSES[getConfidenceBadge(result.confidence).variant]}`}>
                  {getConfidenceBadge(result.confidence).text} confidence
                </span>
                {aiUsed && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    AI suggestion applied
                  </span>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {result && result.flags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {result.flags.map((flag) => {
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

          {result?.extendedAlt && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Extended description available</p>
                  <p className="text-xs text-blue-600 mt-1">{result.extendedAlt}</p>
                  <p className="text-xs text-blue-500 mt-2">
                    Consider using this for complex images that need detailed description.
                  </p>
                </div>
              </div>
            </div>
          )}

          {result?.needsReview && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              AI suggests this image needs human review. Please verify the description is accurate.
            </div>
          )}
        </div>
      )}

      {isDecorative === 'yes' && (
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
