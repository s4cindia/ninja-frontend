import React, { useState, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '@/services/api';

type EntityType = 'alt_text' | 'audit' | 'remediation';
type RatingValue = 'positive' | 'negative' | null;

interface QuickRatingProps {
  entityType: EntityType;
  entityId: string;
  onRated?: (rating: RatingValue) => void;
  initialRating?: RatingValue;
  size?: 'sm' | 'md';
  className?: string;
}

export const QuickRating: React.FC<QuickRatingProps> = ({
  entityType,
  entityId,
  onRated,
  initialRating = null,
  size = 'sm',
  className,
}) => {
  const [rating, setRating] = useState<RatingValue>(initialRating);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const buttonPadding = size === 'sm' ? 'p-1.5' : 'p-2';

  const handleRate = useCallback(async (isPositive: boolean) => {
    if (isSubmitting) return;

    const newRating: RatingValue = isPositive ? 'positive' : 'negative';
    const ratingToSubmit = rating === newRating ? null : newRating;
    const previousRating = rating;
    
    setIsSubmitting(true);
    setError(null);
    setRating(ratingToSubmit);

    try {
      const payload = {
        entityType,
        entityId,
        isPositive: ratingToSubmit === null ? null : ratingToSubmit === 'positive',
      };
      if (process.env.NODE_ENV === 'development') {
        console.log('[QuickRating] Submitting:', payload);
      }
      
      await api.post('/feedback/quick-rating', payload);
      onRated?.(ratingToSubmit);
    } catch (err: unknown) {
      console.error('[QuickRating] Error:', err);
      setRating(previousRating);
      setError('Failed to save rating');
    } finally {
      setIsSubmitting(false);
    }
  }, [entityType, entityId, rating, isSubmitting, onRated]);

  if (isSubmitting) {
    return (
      <div className={clsx('inline-flex items-center gap-1', className)}>
        <Loader2 className={clsx(iconSize, 'animate-spin text-gray-400')} />
      </div>
    );
  }

  return (
    <div 
      className={clsx('inline-flex items-center gap-1', className)}
      role="group"
      aria-label="Rate this content"
    >
      <button
        type="button"
        onClick={() => handleRate(true)}
        disabled={isSubmitting}
        aria-pressed={rating === 'positive'}
        aria-label="Rate as helpful"
        title={error || 'Helpful'}
        className={clsx(
          buttonPadding,
          'rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
          rating === 'positive'
            ? 'bg-green-100 text-green-600 hover:bg-green-200'
            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
        )}
      >
        <ThumbsUp className={iconSize} />
      </button>
      <button
        type="button"
        onClick={() => handleRate(false)}
        disabled={isSubmitting}
        aria-pressed={rating === 'negative'}
        aria-label="Rate as not helpful"
        title={error || 'Not helpful'}
        className={clsx(
          buttonPadding,
          'rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
          rating === 'negative'
            ? 'bg-red-100 text-red-600 hover:bg-red-200'
            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
        )}
      >
        <ThumbsDown className={iconSize} />
      </button>
    </div>
  );
};
