import React, { useState } from 'react';
import { 
  Eye, EyeOff, Download, Copy, Check,
  AlertTriangle, Image as ImageIcon, Maximize2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '@/utils/cn';
import { AltTextFlag, AltTextStatus } from '@/types/alt-text.types';

interface ImagePreviewCardProps {
  src: string;
  alt: string;
  extendedAlt?: string;
  confidence?: number;
  flags?: AltTextFlag[];
  status?: AltTextStatus;
  imageType?: string;
  size?: 'sm' | 'md' | 'lg';
  showAltOverlay?: boolean;
  showActions?: boolean;
  showMetadata?: boolean;
  onZoom?: () => void;
  onDownload?: () => void;
  className?: string;
}

const FLAG_CONFIG: Record<string, { label: string; color: string }> = {
  FACE_DETECTED: { label: 'Face', color: 'yellow' },
  TEXT_IN_IMAGE: { label: 'Text', color: 'blue' },
  LOW_CONFIDENCE: { label: 'Low Confidence', color: 'red' },
  SENSITIVE_CONTENT: { label: 'Sensitive', color: 'red' },
  COMPLEX_SCENE: { label: 'Complex', color: 'yellow' },
  NEEDS_MANUAL_REVIEW: { label: 'Needs Review', color: 'orange' },
  REGENERATED: { label: 'Regenerated', color: 'gray' },
  DATA_VISUALIZATION: { label: 'Data Viz', color: 'purple' },
  DATA_EXTRACTED: { label: 'Data Extracted', color: 'green' },
  COMPLEX_IMAGE: { label: 'Complex', color: 'yellow' },
};

const STATUS_CONFIG: Record<AltTextStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'gray' },
  needs_review: { label: 'Needs Review', color: 'orange' },
  approved: { label: 'Approved', color: 'green' },
  edited: { label: 'Edited', color: 'blue' },
  rejected: { label: 'Rejected', color: 'red' },
};

const SIZE_CONFIG = {
  sm: { container: 'w-32', image: 'h-24', text: 'text-xs' },
  md: { container: 'w-48', image: 'h-36', text: 'text-sm' },
  lg: { container: 'w-64', image: 'h-48', text: 'text-sm' },
};

export const ImagePreviewCard: React.FC<ImagePreviewCardProps> = ({
  src,
  alt,
  extendedAlt,
  confidence,
  flags = [],
  status,
  imageType,
  size = 'md',
  showAltOverlay = true,
  showActions = true,
  showMetadata = true,
  onZoom,
  onDownload,
  className,
}) => {
  const [showAlt, setShowAlt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const sizeConfig = SIZE_CONFIG[size];

  const handleCopyAlt = async () => {
    try {
      await navigator.clipboard.writeText(alt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 85) return 'bg-green-500';
    if (conf >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceTextColor = (conf: number) => {
    if (conf >= 85) return 'text-green-600';
    if (conf >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div 
      className={cn(
        'rounded-lg border bg-white overflow-hidden transition-shadow hover:shadow-md',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn('relative', sizeConfig.image)}>
        {imageError ? (
          <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400">
            <ImageIcon className="h-8 w-8 mb-1" />
            <span className="text-xs">Image unavailable</span>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )}

        {confidence !== undefined && (
          <div className="absolute top-0 left-0 right-0 h-1">
            <div 
              className={cn('h-full', getConfidenceColor(confidence))}
              style={{ width: `${confidence}%` }}
            />
          </div>
        )}

        {status && (
          <div className="absolute top-2 left-2">
            <Badge variant={STATUS_CONFIG[status].color as 'default' | 'success' | 'warning' | 'error' | 'info'} className="text-xs">
              {STATUS_CONFIG[status].label}
            </Badge>
          </div>
        )}

        {imageType && imageType !== 'PHOTO' && imageType !== 'UNKNOWN' && (
          <div className="absolute top-2 right-2">
            <Badge variant="info" className="text-xs">
              {imageType.replace(/_/g, ' ')}
            </Badge>
          </div>
        )}

        {showActions && isHovered && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 transition-opacity">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/20"
              onClick={() => setShowAlt(!showAlt)}
              title={showAlt ? 'Hide alt text' : 'Show alt text'}
            >
              {showAlt ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            {onZoom && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/20"
                onClick={onZoom}
                title="Zoom"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
            {onDownload && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/20"
                onClick={onDownload}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {showAltOverlay && showAlt && (
          <div className="absolute inset-0 bg-black/80 p-3 overflow-y-auto">
            <p className="text-white text-sm">{alt}</p>
            {extendedAlt && (
              <p className="text-gray-300 text-xs mt-2">{extendedAlt}</p>
            )}
          </div>
        )}

        {flags.includes('NEEDS_MANUAL_REVIEW') && (
          <div className="absolute bottom-2 left-2">
            <div className="bg-orange-500 text-white p-1 rounded-full">
              <AlertTriangle className="h-3 w-3" />
            </div>
          </div>
        )}
      </div>

      {showMetadata && (
        <div className="p-3 space-y-2">
          <div className="flex items-start gap-2">
            <p className={cn('flex-1 text-gray-700 line-clamp-2', sizeConfig.text)}>
              {alt}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="flex-shrink-0 p-1"
              onClick={handleCopyAlt}
              title="Copy alt text"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 text-gray-400" />
              )}
            </Button>
          </div>

          {confidence !== undefined && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={cn('h-full rounded-full', getConfidenceColor(confidence))}
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <span className={cn('text-xs font-medium', getConfidenceTextColor(confidence))}>
                {confidence}%
              </span>
            </div>
          )}

          {flags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {flags.slice(0, 3).map((flag) => {
                const config = FLAG_CONFIG[flag];
                return (
                  <Badge 
                    key={flag} 
                    variant={config?.color as 'default' | 'success' | 'warning' | 'error' | 'info' || 'default'} 
                    className="text-xs py-0"
                  >
                    {config?.label || flag}
                  </Badge>
                );
              })}
              {flags.length > 3 && (
                <Badge variant="default" className="text-xs py-0">
                  +{flags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ImagePreviewCardCompact: React.FC<{
  src: string;
  alt: string;
  confidence?: number;
  status?: AltTextStatus;
  onClick?: () => void;
  selected?: boolean;
}> = ({ src, alt, confidence, status, onClick, selected }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div 
      className={cn(
        'relative rounded-lg overflow-hidden cursor-pointer transition-all',
        'border-2',
        selected ? 'border-primary-500 ring-2 ring-primary-200' : 'border-transparent hover:border-gray-300'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {imageError ? (
        <div className="w-full h-20 bg-gray-100 flex items-center justify-center">
          <ImageIcon className="h-6 w-6 text-gray-400" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className="w-full h-20 object-cover"
          onError={() => setImageError(true)}
        />
      )}
      
      {confidence !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
          <div 
            className={cn(
              'h-full',
              confidence >= 85 ? 'bg-green-500' : confidence >= 70 ? 'bg-yellow-500' : 'bg-red-500'
            )}
            style={{ width: `${confidence}%` }}
          />
        </div>
      )}

      {status && (
        <div className={cn(
          'absolute top-1 right-1 w-2 h-2 rounded-full',
          status === 'approved' && 'bg-green-500',
          status === 'needs_review' && 'bg-orange-500',
          status === 'rejected' && 'bg-red-500',
          status === 'pending' && 'bg-gray-400',
          status === 'edited' && 'bg-blue-500',
        )} />
      )}
    </div>
  );
};

export const ImageZoomModal: React.FC<{
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}> = ({ src, alt, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative max-w-4xl max-h-full">
        <img 
          src={src} 
          alt={alt} 
          className="max-w-full max-h-[90vh] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 text-white hover:bg-white/20"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </Button>
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-3">
          <p className="text-white text-sm">{alt}</p>
        </div>
      </div>
    </div>
  );
};
