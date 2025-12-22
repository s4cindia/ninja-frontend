import React, { useState, useRef, useCallback } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { clsx } from 'clsx';
import { FeedbackModal } from './FeedbackModal';

type FeedbackType = 
  | 'ACCESSIBILITY_ISSUE'
  | 'ALT_TEXT_QUALITY'
  | 'AUDIT_ACCURACY'
  | 'REMEDIATION_SUGGESTION'
  | 'GENERAL'
  | 'BUG_REPORT'
  | 'FEATURE_REQUEST';

interface FeedbackButtonProps {
  variant?: 'floating' | 'icon' | 'button';
  prefillType?: FeedbackType;
  prefillContext?: string;
  className?: string;
  position?: 'bottom-right' | 'bottom-left';
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  variant = 'floating',
  prefillType,
  prefillContext,
  className,
  position = 'bottom-right',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleOpen = useCallback(() => setIsModalOpen(true), []);
  
  const handleClose = useCallback(() => {
    setIsModalOpen(false);
    triggerRef.current?.focus();
  }, []);

  const positionClasses = {
    'bottom-right': 'right-6 bottom-6',
    'bottom-left': 'left-6 bottom-6',
  };

  if (variant === 'floating') {
    return (
      <>
        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          aria-label="Send feedback"
          aria-haspopup="dialog"
          aria-expanded={isModalOpen}
          className={clsx(
            'fixed z-40 flex items-center justify-center',
            'w-14 h-14 rounded-full shadow-lg',
            'bg-primary-600 text-white',
            'hover:bg-primary-700 hover:shadow-xl',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            'transition-all duration-200',
            positionClasses[position],
            className
          )}
        >
          <MessageSquarePlus className="h-6 w-6" />
        </button>
        <FeedbackModal
          isOpen={isModalOpen}
          onClose={handleClose}
          prefillType={prefillType}
          prefillContext={prefillContext}
        />
      </>
    );
  }

  if (variant === 'icon') {
    return (
      <>
        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          aria-label="Send feedback"
          aria-haspopup="dialog"
          aria-expanded={isModalOpen}
          className={clsx(
            'p-2 rounded-md text-gray-500',
            'hover:text-primary-600 hover:bg-gray-100',
            'focus:outline-none focus:ring-2 focus:ring-primary-500',
            'transition-colors',
            className
          )}
        >
          <MessageSquarePlus className="h-5 w-5" />
        </button>
        <FeedbackModal
          isOpen={isModalOpen}
          onClose={handleClose}
          prefillType={prefillType}
          prefillContext={prefillContext}
        />
      </>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={isModalOpen}
        className={clsx(
          'inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
          'bg-primary-600 text-white',
          'hover:bg-primary-700',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          'transition-colors',
          className
        )}
      >
        <MessageSquarePlus className="h-4 w-4" />
        Feedback
      </button>
      <FeedbackModal
        isOpen={isModalOpen}
        onClose={handleClose}
        prefillType={prefillType}
        prefillContext={prefillContext}
      />
    </>
  );
};
