import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Image as ImageIcon, Loader2 } from 'lucide-react';

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackMessage?: string;
  onError?: () => void;
  onLoad?: () => void;
}

export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({
  src,
  alt,
  className = '',
  fallbackMessage = 'Image preview not available',
  onError,
  onLoad,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    const controller = new AbortController();
    let objectUrl: string | null = null;

    const fetchImage = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        console.log('[AuthenticatedImage] Fetching image from:', src);
        const response = await api.get(src, {
          responseType: 'blob',
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const blob = response.data as Blob;
        console.log('[AuthenticatedImage] Received blob:', blob.type, blob.size, 'bytes');
        
        // Validate the response is actually an image
        if (!blob.type.startsWith('image/')) {
          console.error('[AuthenticatedImage] Response is not an image:', blob.type);
          // Try to read the response as text to see the error
          try {
            const text = await blob.text();
            console.error('[AuthenticatedImage] Response body:', text.substring(0, 500));
          } catch {
            // Ignore text parsing errors
          }
          setHasError(true);
          onError?.();
          return;
        }
        
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        onLoad?.();
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('[AuthenticatedImage] Failed to fetch image:', src, err);
        setHasError(true);
        onError?.();
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchImage();

    return () => {
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src, onError, onLoad]);

  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm">
        <Loader2 className="h-8 w-8 mb-2 animate-spin opacity-50" />
        <span>Loading image...</span>
      </div>
    );
  }

  if (hasError || !blobUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm">
        <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
        <span>{fallbackMessage}</span>
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
    />
  );
};

export default AuthenticatedImage;
