import React, { useState } from 'react';
import { BatchApprovalPanel, BatchApprovalInline } from '@/components/alt-text/BatchApprovalPanel';
import { GeneratedAltText } from '@/types/alt-text.types';

const generateSampleItems = (): GeneratedAltText[] => [
  {
    id: '1',
    imageId: 'img-1',
    jobId: 'job-1',
    shortAlt: 'Bar chart showing quarterly revenue',
    confidence: 95,
    flags: ['DATA_VISUALIZATION'],
    aiModel: 'gemini-1.5-pro',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    imageId: 'img-2',
    jobId: 'job-1',
    shortAlt: 'Line graph depicting growth trends',
    confidence: 92,
    flags: ['DATA_VISUALIZATION', 'DATA_EXTRACTED'],
    aiModel: 'gemini-1.5-pro',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    imageId: 'img-3',
    jobId: 'job-1',
    shortAlt: 'Team photo with executives',
    confidence: 88,
    flags: ['FACE_DETECTED'],
    aiModel: 'gemini-1.5-pro',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    imageId: 'img-4',
    jobId: 'job-1',
    shortAlt: 'Product screenshot with UI elements',
    confidence: 78,
    flags: ['TEXT_IN_IMAGE'],
    aiModel: 'gemini-1.5-pro',
    status: 'needs_review',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    imageId: 'img-5',
    jobId: 'job-1',
    shortAlt: 'Complex architectural diagram',
    confidence: 72,
    flags: ['COMPLEX_IMAGE', 'NEEDS_MANUAL_REVIEW'],
    aiModel: 'gemini-1.5-pro',
    status: 'needs_review',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '6',
    imageId: 'img-6',
    jobId: 'job-1',
    shortAlt: 'Flowchart showing approval process',
    confidence: 86,
    flags: ['DATA_VISUALIZATION'],
    aiModel: 'gemini-1.5-pro',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '7',
    imageId: 'img-7',
    jobId: 'job-1',
    shortAlt: 'Low quality scan of document',
    confidence: 55,
    flags: ['LOW_CONFIDENCE', 'TEXT_IN_IMAGE'],
    aiModel: 'gemini-1.5-pro',
    status: 'needs_review',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '8',
    imageId: 'img-8',
    jobId: 'job-1',
    shortAlt: 'Pie chart of market share',
    confidence: 91,
    flags: ['DATA_VISUALIZATION'],
    aiModel: 'gemini-1.5-pro',
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const TestBatchApprovalPanel: React.FC = () => {
  const [items, setItems] = useState<GeneratedAltText[]>(generateSampleItems);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inlineConfidence, setInlineConfidence] = useState(85);

  const handleBatchApprove = async (ids: string[]) => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setItems(prev => prev.map(item => 
      ids.includes(item.id) ? { ...item, status: 'approved' as const } : item
    ));
    setIsProcessing(false);
    console.log('Approved IDs:', ids);
  };

  const handleBatchReject = async (ids: string[]) => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setItems(prev => prev.map(item => 
      ids.includes(item.id) ? { ...item, status: 'rejected' as const } : item
    ));
    setIsProcessing(false);
    console.log('Rejected IDs:', ids);
  };

  const handleInlineApprove = async () => {
    const eligible = items.filter(
      i => ['pending', 'needs_review'].includes(i.status) && i.confidence >= inlineConfidence
    );
    await handleBatchApprove(eligible.map(i => i.id));
  };

  const resetData = () => {
    setItems(generateSampleItems());
  };

  const pendingItems = items.filter(i => ['pending', 'needs_review'].includes(i.status));
  const eligibleForInline = pendingItems.filter(i => i.confidence >= inlineConfidence).length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Batch Approval Panel Test</h1>
        <p className="text-gray-600">Test bulk approval of alt text items based on confidence and criteria.</p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={resetData}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          Reset Demo Data
        </button>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Current Items ({items.length})</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <div>Pending: {items.filter(i => i.status === 'pending').length}</div>
          <div>Needs Review: {items.filter(i => i.status === 'needs_review').length}</div>
          <div>Approved: {items.filter(i => i.status === 'approved').length}</div>
          <div>Rejected: {items.filter(i => i.status === 'rejected').length}</div>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Full Panel</h2>
        <BatchApprovalPanel
          items={items}
          onBatchApprove={handleBatchApprove}
          onBatchReject={handleBatchReject}
          isProcessing={isProcessing}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Inline Version</h2>
        <p className="text-sm text-gray-500">Compact version for embedding in toolbars</p>
        <BatchApprovalInline
          eligibleCount={eligibleForInline}
          totalCount={pendingItems.length}
          minConfidence={inlineConfidence}
          onConfidenceChange={setInlineConfidence}
          onApprove={handleInlineApprove}
          isProcessing={isProcessing}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Items Detail</h2>
        <div className="border rounded-lg divide-y">
          {items.map((item) => (
            <div key={item.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.shortAlt}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs text-gray-500">Confidence: {item.confidence}%</span>
                  <span className="text-xs text-gray-500">Flags: {item.flags.join(', ') || 'None'}</span>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                item.status === 'approved' ? 'bg-green-100 text-green-700' :
                item.status === 'rejected' ? 'bg-red-100 text-red-700' :
                item.status === 'needs_review' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
