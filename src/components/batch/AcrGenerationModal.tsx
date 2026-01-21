import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Batch } from '@/types/batch.types';

interface AcrGenerationModalProps {
  batch: Batch;
  onGenerate: (mode: 'individual' | 'aggregate', options: AcrOptions) => void;
  onClose: () => void;
  isLoading: boolean;
}

interface AcrOptions {
  edition: string;
  batchName: string;
  vendor: string;
  contactEmail: string;
  aggregationStrategy: 'conservative' | 'optimistic';
}

export function AcrGenerationModal({
  batch,
  onGenerate,
  onClose,
  isLoading,
}: AcrGenerationModalProps) {
  const [mode, setMode] = useState<'individual' | 'aggregate'>('individual');
  const [edition, setEdition] = useState('VPAT2.5-WCAG');
  const [batchName, setBatchName] = useState(batch.name);
  const [vendor, setVendor] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const handleGenerate = () => {
    onGenerate(mode, {
      edition,
      batchName,
      vendor,
      contactEmail,
      aggregationStrategy: 'conservative',
    });
  };

  const isValid = vendor.trim() !== '' && contactEmail.trim() !== '';

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="relative">
          <DialogTitle>Generate ACR/VPAT</DialogTitle>
          <DialogClose onClick={onClose} />
        </DialogHeader>
        <div className="px-6 pb-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Generation Mode
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'individual'}
                  onChange={() => setMode('individual')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900">Individual ACRs</p>
                  <p className="text-sm text-gray-600">
                    Generate {batch.filesRemediated} separate ACR/VPAT documents (one
                    per file)
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'aggregate'}
                  onChange={() => setMode('aggregate')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900">Aggregate ACR</p>
                  <p className="text-sm text-gray-600">
                    Generate 1 consolidated ACR/VPAT for all files
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label
              htmlFor="edition"
              className="block text-sm font-medium text-gray-900 mb-2"
            >
              VPAT Edition
            </label>
            <select
              id="edition"
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="VPAT2.5-WCAG">VPAT 2.5 WCAG</option>
              <option value="VPAT2.5-508">VPAT 2.5 Section 508</option>
              <option value="VPAT2.5-EU">VPAT 2.5 EU</option>
              <option value="VPAT2.5-INT">VPAT 2.5 INT</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="batch-name"
              className="block text-sm font-medium text-gray-900 mb-2"
            >
              Product/Batch Name
            </label>
            <Input
              id="batch-name"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g., Q1 2026 EPUB Collection"
            />
          </div>

          <div>
            <label
              htmlFor="vendor"
              className="block text-sm font-medium text-gray-900 mb-2"
            >
              Vendor/Company Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="vendor"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g., Acme Publishing"
            />
          </div>

          <div>
            <label
              htmlFor="contact-email"
              className="block text-sm font-medium text-gray-900 mb-2"
            >
              Contact Email <span className="text-red-500">*</span>
            </label>
            <Input
              id="contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="e.g., contact@example.com"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} isLoading={isLoading} disabled={!isValid}>
              Generate ACR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
