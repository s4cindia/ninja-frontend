/**
 * Export Options Modal
 * Allows user to configure export options for corrected manuscript
 */

import { useState } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: { includeOriginal: boolean; highlightChanges: boolean; acceptChanges: boolean }) => void;
  isExporting: boolean;
}

export function ExportOptionsModal({
  isOpen,
  onClose,
  onExport,
  isExporting,
}: ExportOptionsModalProps) {
  const [includeOriginal, setIncludeOriginal] = useState(false);
  const [highlightChanges, setHighlightChanges] = useState(true);
  const [acceptChanges, setAcceptChanges] = useState(true);

  if (!isOpen) return null;

  const handleExport = () => {
    onExport({ includeOriginal, highlightChanges, acceptChanges });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Export Corrected Manuscript</h2>
              <p className="text-sm text-gray-500 mt-1">
                Configure export options for your DOCX file
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isExporting}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">📄 Export Format: Microsoft Word (DOCX)</p>
            <p className="text-sm text-blue-800">
              The exported document will contain your manuscript with all corrected references applied.
            </p>
          </div>

          {/* Options */}
          <div className="space-y-4">
            {/* Highlight Changes */}
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={highlightChanges}
                onChange={(e) => setHighlightChanges(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Highlight corrected references</div>
                <div className="text-sm text-gray-600 mt-1">
                  Corrected references will be highlighted in yellow for easy identification
                </div>
              </div>
            </label>

            {/* Include Original */}
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeOriginal}
                onChange={(e) => setIncludeOriginal(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Include original text</div>
                <div className="text-sm text-gray-600 mt-1">
                  Show original reference text in gray next to corrections (useful for review)
                </div>
              </div>
            </label>

            {/* Accept Changes */}
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptChanges}
                onChange={(e) => setAcceptChanges(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Accept all changes</div>
                <div className="text-sm text-gray-600 mt-1">
                  Apply changes cleanly without Track Changes. Uncheck to export with Track Changes enabled.
                </div>
              </div>
            </label>
          </div>

          {/* Preview Example */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 mb-2">PREVIEW:</p>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <span className="font-bold text-sm">1.</span>
                <div className="flex-1">
                  <p
                    className={`text-sm ${
                      highlightChanges ? 'bg-yellow-100 px-1' : ''
                    }`}
                  >
                    Smith J, Johnson K. Corrected citation format. Journal Name. 2023;15(2):123-130.
                  </p>
                  {includeOriginal && (
                    <p className="text-xs text-gray-500 italic mt-1">
                      [Original: Smith, J. and Johnson, K. (2023). Citation format. Journal. 15(2), 123-130.]
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t px-6 py-4 flex items-center justify-end space-x-3 rounded-b-lg">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export DOCX'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
