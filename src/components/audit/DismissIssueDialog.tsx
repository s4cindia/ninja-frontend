/**
 * Small modal that collects an optional reason before an operator marks
 * an audit-issue instance as "not an issue". The reason field is optional
 * (max 280 chars, mirroring the backend validation) and defaults to empty.
 */

import { useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';

interface DismissIssueDialogProps {
  /** Human-readable issue code — shown in the dialog title. */
  issueCode: string;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const MAX_REASON = 280;

export function DismissIssueDialog({
  issueCode,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: DismissIssueDialogProps) {
  const [reason, setReason] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset on each open + focus the textarea.
  useEffect(() => {
    if (isOpen) {
      setReason('');
      const id = window.setTimeout(() => textareaRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
  }, [isOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(reason.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Mark as not an issue"
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Mark as not an issue</h3>
            <p className="mt-0.5 text-xs text-gray-500 font-mono">{issueCode}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-gray-600">
            This instance will be visually deprioritised. It still counts in the total but won't
            block re-audits. Dismissals persist until you remove them.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reason <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              ref={textareaRef}
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
              rows={3}
              disabled={isSubmitting}
              placeholder="e.g. Intentional language — proper noun in Latin script"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
            <div className="mt-0.5 text-right text-xs text-gray-400">
              {reason.length}/{MAX_REASON}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Mark as not an issue
          </Button>
        </div>
      </form>
    </div>
  );
}
