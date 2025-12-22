import React, { useEffect, useRef, useCallback } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { FeedbackForm } from './FeedbackForm';

type FeedbackType = 
  | 'ACCESSIBILITY_ISSUE'
  | 'ALT_TEXT_QUALITY'
  | 'AUDIT_ACCURACY'
  | 'REMEDIATION_SUGGESTION'
  | 'GENERAL'
  | 'BUG_REPORT'
  | 'FEATURE_REQUEST';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillType?: FeedbackType;
  prefillContext?: string;
  entityType?: string;
  entityId?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  prefillType,
  prefillContext,
  entityType,
  entityId,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }

    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      closeButtonRef.current?.focus();

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg mx-4 bg-white rounded-lg shadow-xl"
        role="document"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 
            id="feedback-modal-title" 
            className="text-lg font-semibold text-gray-900 flex items-center gap-2"
          >
            <MessageSquare className="h-5 w-5 text-primary-600" />
            Send Feedback
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close feedback form"
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          <FeedbackForm
            prefillType={prefillType}
            prefillContext={prefillContext}
            entityType={entityType}
            entityId={entityId}
            onSuccess={onClose}
            onCancel={onClose}
            showCancelButton={true}
          />
        </div>
      </div>
    </div>
  );
};
