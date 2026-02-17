/**
 * DragDropGuide - Visual guide for drag and drop operations
 */

import { useState, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

export default function DragDropGuide() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('citation-drag-guide-seen');
    if (!seen) setShow(true);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('citation-drag-guide-seen', 'true');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={dismiss}>
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Drag & Drop References</h3>
        <div className="space-y-4 text-sm text-gray-600">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <GripVertical className="h-4 w-4 text-blue-600" />
            </div>
            <p>Drag references to reorder them. Citation numbers update automatically.</p>
          </div>
        </div>
        <button onClick={dismiss} className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">
          Got it!
        </button>
      </div>
    </div>
  );
}
