import React, { useState, useCallback } from 'react';
import { Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/services/api';

type FeedbackType = 
  | 'ACCESSIBILITY_ISSUE'
  | 'ALT_TEXT_QUALITY'
  | 'AUDIT_ACCURACY'
  | 'REMEDIATION_SUGGESTION'
  | 'GENERAL'
  | 'BUG_REPORT'
  | 'FEATURE_REQUEST';

interface FeedbackFormProps {
  prefillType?: FeedbackType;
  prefillContext?: string;
  entityType?: string;
  entityId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
}

const FEEDBACK_TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: 'GENERAL', label: 'General Feedback' },
  { value: 'ACCESSIBILITY_ISSUE', label: 'Accessibility Issue' },
  { value: 'ALT_TEXT_QUALITY', label: 'Alt-Text Quality' },
  { value: 'AUDIT_ACCURACY', label: 'Audit Accuracy' },
  { value: 'REMEDIATION_SUGGESTION', label: 'Remediation Suggestion' },
  { value: 'BUG_REPORT', label: 'Bug Report' },
  { value: 'FEATURE_REQUEST', label: 'Feature Request' },
];

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  prefillType = 'GENERAL',
  prefillContext = '',
  entityType,
  entityId,
  onSuccess,
  onCancel,
  showCancelButton = false,
}) => {
  const [type, setType] = useState<FeedbackType>(prefillType);
  const [message, setMessage] = useState('');
  const [context, setContext] = useState(prefillContext || `Page: ${window.location.pathname}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setErrorMessage('Please enter a message');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: Record<string, unknown> = {
        type,
        message: message.trim(),
        context: { page: window.location.pathname },
      };

      if (context.trim() && context.trim() !== `Page: ${window.location.pathname}`) {
        (payload.context as Record<string, string>).details = context.trim();
      }

      if (entityType) {
        payload.entityType = entityType;
      }

      if (entityId) {
        payload.entityId = entityId;
      }

      console.log('[FeedbackForm] Submitting:', payload);

      await api.post('/feedback', payload);

      setSubmitStatus('success');
      setMessage('');
      setContext(`Page: ${window.location.pathname}`);
      setType('GENERAL');

      setTimeout(() => {
        setSubmitStatus('idle');
        onSuccess?.();
      }, 2000);
    } catch {
      setSubmitStatus('error');
      setErrorMessage('Failed to submit feedback. Please try again.');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } finally {
      setIsSubmitting(false);
    }
  }, [type, message, context, entityType, entityId, onSuccess]);

  if (submitStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
        <h3 className="text-lg font-medium text-gray-900">Thank you!</h3>
        <p className="text-sm text-gray-600 mt-1">
          Your feedback has been submitted successfully.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label 
          htmlFor="feedback-type" 
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Feedback Type
        </label>
        <select
          id="feedback-type"
          value={type}
          onChange={(e) => setType(e.target.value as FeedbackType)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {FEEDBACK_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label 
          htmlFor="feedback-message" 
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="feedback-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your feedback, issue, or suggestion..."
          rows={4}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
        />
      </div>

      <div>
        <label 
          htmlFor="feedback-context" 
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Context <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="feedback-context"
          type="text"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Additional context (auto-filled with current page)"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {showCancelButton && onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || !message.trim()}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Feedback
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
