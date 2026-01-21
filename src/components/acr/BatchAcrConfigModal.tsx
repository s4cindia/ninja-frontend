import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';
import type { BatchAcrOptions } from '@/types/batch-acr.types';

interface BatchAcrConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  onGenerate: (mode: 'individual' | 'aggregate', options?: BatchAcrOptions) => void;
  isGenerating?: boolean;
}

export function BatchAcrConfigModal({
  isOpen,
  onClose,
  batchId: _batchId,
  totalJobs,
  successfulJobs,
  failedJobs,
  onGenerate,
  isGenerating = false,
}: BatchAcrConfigModalProps) {
  const [mode, setMode] = useState<'individual' | 'aggregate'>('aggregate');
  const [batchName, setBatchName] = useState('');
  const [vendor, setVendor] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [edition, setEdition] = useState<BatchAcrOptions['edition']>('VPAT2.5-WCAG');
  const [aggregationStrategy, setAggregationStrategy] = useState<'conservative' | 'optimistic'>('conservative');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setBatchName(`Batch ${today} - ${successfulJobs} EPUBs`);
  }, [successfulJobs]);

  useEffect(() => {
    if (!isOpen) {
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (mode === 'aggregate') {
      if (!batchName.trim()) {
        newErrors.batchName = 'Batch name is required';
      }
      if (!vendor.trim()) {
        newErrors.vendor = 'Vendor name is required';
      }
      if (!contactEmail.trim()) {
        newErrors.contactEmail = 'Contact email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        newErrors.contactEmail = 'Invalid email format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = () => {
    if (!validateForm()) return;

    if (mode === 'individual') {
      onGenerate('individual');
    } else {
      onGenerate('aggregate', {
        edition,
        batchName,
        vendor,
        contactEmail,
        aggregationStrategy,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate ACR/VPAT Report</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {failedJobs > 0 && (
            <Alert variant="warning">
              {failedJobs} of {totalJobs} jobs failed and will be excluded from ACR generation.
            </Alert>
          )}

          <div className="space-y-4">
            <label className="text-base font-semibold text-gray-900">
              Choose ACR Generation Mode:
            </label>

            <div className="space-y-3">
              <label
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                  mode === 'individual'
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  value="individual"
                  checked={mode === 'individual'}
                  onChange={() => setMode('individual')}
                  className="mt-1 h-4 w-4 text-sky-600 border-gray-300 focus:ring-sky-500"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">
                    Individual ACRs (1 per EPUB)
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    Generate separate ACR/VPAT for each EPUB.
                    <br />
                    <span className="font-medium">Best for:</span> Sharing individual reports
                    <br />
                    <span className="font-medium">Output:</span> {successfulJobs} separate ACR workflows
                  </p>
                </div>
              </label>

              <label
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                  mode === 'aggregate'
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  value="aggregate"
                  checked={mode === 'aggregate'}
                  onChange={() => setMode('aggregate')}
                  className="mt-1 h-4 w-4 text-sky-600 border-gray-300 focus:ring-sky-500"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">
                    Aggregate ACR (1 for all EPUBs)
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    Generate single ACR/VPAT for the batch.
                    <br />
                    <span className="font-medium">Best for:</span> Procurement & compliance review
                    <br />
                    <span className="font-medium">Output:</span> 1 aggregate ACR workflow
                  </p>
                </div>
              </label>
            </div>
          </div>

          {mode === 'aggregate' && (
            <>
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold text-gray-900">Batch Information</h3>

                <div className="space-y-2">
                  <label htmlFor="batchName" className="block text-sm font-medium text-gray-700">
                    Batch Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="batchName"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="Q1 2026 EPUB Collection"
                    error={errors.batchName}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="vendor" className="block text-sm font-medium text-gray-700">
                    Vendor Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="vendor"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="ACME Publishing"
                    error={errors.vendor}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                    Contact Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="a11y@acme.com"
                    error={errors.contactEmail}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="edition" className="block text-sm font-medium text-gray-700">
                    VPAT Edition
                  </label>
                  <select
                    id="edition"
                    value={edition}
                    onChange={(e) => setEdition(e.target.value as BatchAcrOptions['edition'])}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  >
                    <option value="VPAT2.5-WCAG">VPAT 2.5 WCAG</option>
                    <option value="VPAT2.5-508">VPAT 2.5 Section 508</option>
                    <option value="VPAT2.5-EU">VPAT 2.5 EU</option>
                    <option value="VPAT2.5-INT">VPAT 2.5 International</option>
                  </select>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <label className="text-base font-semibold text-gray-900">
                  Aggregation Strategy:
                </label>

                <div className="space-y-3">
                  <label
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      aggregationStrategy === 'conservative'
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <input
                      type="radio"
                      name="aggregationStrategy"
                      value="conservative"
                      checked={aggregationStrategy === 'conservative'}
                      onChange={() => setAggregationStrategy('conservative')}
                      className="mt-0.5 h-4 w-4 text-sky-600 border-gray-300 focus:ring-sky-500"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">
                        Conservative (Safer for compliance)
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        Any EPUB failure → "Does Not Support"
                      </p>
                    </div>
                  </label>

                  <label
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      aggregationStrategy === 'optimistic'
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <input
                      type="radio"
                      name="aggregationStrategy"
                      value="optimistic"
                      checked={aggregationStrategy === 'optimistic'}
                      onChange={() => setAggregationStrategy('optimistic')}
                      className="mt-0.5 h-4 w-4 text-sky-600 border-gray-300 focus:ring-sky-500"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">
                        Optimistic (Shows progress)
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        Majority pass → "Partially Supports"
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={onClose} disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} isLoading={isGenerating}>
              Generate ACR{mode === 'individual' && 's'} →
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
