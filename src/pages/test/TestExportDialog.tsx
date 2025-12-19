import { useState } from 'react';
import { ExportDialog } from '@/components/acr/ExportDialog';
import { Button } from '@/components/ui/Button';

export default function TestExportDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Export Dialog Test Page</h1>
          <p className="text-gray-600 mb-6">
            Click the button below to open the export dialog and test the ACR export functionality.
          </p>
          
          <Button onClick={() => setIsOpen(true)}>
            Open Export Dialog
          </Button>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Features to Test</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Format selection (Word, PDF, HTML) with radio buttons</li>
            <li>• Export options checkboxes (Methodology, Attribution, Disclaimer)</li>
            <li>• Optional branding section (Company Name, Color, Footer)</li>
            <li>• Preview section showing included sections</li>
            <li>• Loading state during export (2 second mock delay)</li>
            <li>• Download link after export completion</li>
            <li>• Dialog close and reset functionality</li>
          </ul>
        </div>
      </div>

      <ExportDialog
        acrId="test-acr-123"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}
