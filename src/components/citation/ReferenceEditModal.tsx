/**
 * Reference Edit Modal
 * Allows inline editing of citation references with change tracking
 */

import { useState } from 'react';
import { X, Save, RotateCcw, History } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { CitationReference } from '@/types/citation-intel.types';

interface ReferenceEditModalProps {
  reference: CitationReference;
  isOpen: boolean;
  onClose: () => void;
  onSave: (correctedText: string, changeNote?: string) => void;
  onRevert: () => void;
  isSaving: boolean;
}

export function ReferenceEditModal({
  reference,
  isOpen,
  onClose,
  onSave,
  onRevert,
  isSaving,
}: ReferenceEditModalProps) {
  const [editedText, setEditedText] = useState(reference.correctedText || reference.originalText);
  const [changeNote, setChangeNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const hasChanges = reference.correctedText && reference.correctedText !== reference.originalText;
  const isDirty = editedText !== (reference.correctedText || reference.originalText);

  if (!isOpen) return null;

  const handleSave = () => {
    if (editedText.trim() && isDirty) {
      onSave(editedText.trim(), changeNote.trim() || undefined);
    }
  };

  const handleRevert = () => {
    if (confirm('Revert to original text? This will discard all changes.')) {
      onRevert();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Edit Reference [{reference.number}]
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Make corrections to the reference text below
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Original Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Original Text
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-800">{reference.originalText}</p>
            </div>
          </div>

          {/* Editor */}
          <div>
            <label htmlFor="edited-text" className="block text-sm font-medium text-gray-700 mb-2">
              Corrected Text
            </label>
            <textarea
              id="edited-text"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full min-h-[120px] px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Enter corrected reference text..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {editedText.length} characters
            </p>
          </div>

          {/* Change Note */}
          <div>
            <label htmlFor="change-note" className="block text-sm font-medium text-gray-700 mb-2">
              Change Note (Optional)
            </label>
            <input
              id="change-note"
              type="text"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="e.g., Corrected author name spelling, Added missing DOI..."
            />
          </div>

          {/* Change History */}
          {hasChanges && reference.changes && reference.changes.length > 0 && (
            <div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 mb-3"
              >
                <History className="h-4 w-4 mr-2" />
                {showHistory ? 'Hide' : 'Show'} Change History ({reference.changes.length})
              </button>

              {showHistory && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                  {(reference.changes as any[]).map((change, idx) => (
                    <div key={idx} className="text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">
                          Change {reference.changes!.length - idx}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {new Date(change.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {change.note && (
                        <p className="text-gray-600 mb-2 italic">"{change.note}"</p>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs font-medium text-gray-500">Before:</span>
                          <p className="text-gray-700 bg-white p-2 rounded border border-gray-200 mt-1">
                            {change.previousText}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500">After:</span>
                          <p className="text-gray-700 bg-white p-2 rounded border border-gray-200 mt-1">
                            {change.newText}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOI Preview */}
          {reference.doi && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Verified DOI</p>
              <a
                href={`https://doi.org/${reference.doi.replace(/^doi:\s*/i, '').replace(/^https?:\/\/doi\.org\//i, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-mono"
              >
                {reference.doi}
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-between">
          <div>
            {hasChanges && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevert}
                disabled={isSaving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Revert to Original
              </Button>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
