import React, { useState } from 'react';
import { ImagePreviewCard, ImagePreviewCardCompact, ImageZoomModal } from '@/components/alt-text/ImagePreviewCard';
import { AltTextFlag, AltTextStatus } from '@/types/alt-text.types';

export const TestImagePreviewCard: React.FC = () => {
  const [zoomImage, setZoomImage] = useState<{ src: string; alt: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sampleImages: Array<{
    id: string;
    src: string;
    alt: string;
    extendedAlt?: string;
    confidence: number;
    flags: AltTextFlag[];
    status: AltTextStatus;
    imageType?: string;
  }> = [
    {
      id: '1',
      src: 'https://picsum.photos/seed/chart1/400/300',
      alt: 'Bar chart showing quarterly revenue growth from Q1 to Q4 2024',
      extendedAlt: 'A vertical bar chart displaying company revenue across four quarters. Q1 shows $2.3M, Q2 shows $2.8M, Q3 shows $3.1M, and Q4 shows $3.5M, indicating steady growth throughout the year.',
      confidence: 92,
      flags: ['DATA_VISUALIZATION', 'DATA_EXTRACTED'],
      status: 'approved',
      imageType: 'BAR_CHART',
    },
    {
      id: '2',
      src: 'https://picsum.photos/seed/person1/400/300',
      alt: 'Professional headshot of a person in business attire',
      confidence: 65,
      flags: ['FACE_DETECTED', 'NEEDS_MANUAL_REVIEW'],
      status: 'needs_review',
      imageType: 'PHOTO',
    },
    {
      id: '3',
      src: 'https://picsum.photos/seed/diagram1/400/300',
      alt: 'Flowchart showing the document approval workflow process',
      confidence: 78,
      flags: ['COMPLEX_IMAGE', 'DATA_VISUALIZATION'],
      status: 'pending',
      imageType: 'FLOWCHART',
    },
    {
      id: '4',
      src: 'https://invalid-url.com/broken.jpg',
      alt: 'This image failed to load',
      confidence: 45,
      flags: ['LOW_CONFIDENCE'],
      status: 'rejected',
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Image Preview Card Test</h1>
        <p className="text-gray-600">Test image preview components with various configurations.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Size Variations</h2>
        <div className="flex flex-wrap gap-4 items-start">
          <div>
            <p className="text-sm text-gray-500 mb-2">Small</p>
            <ImagePreviewCard
              src={sampleImages[0].src}
              alt={sampleImages[0].alt}
              confidence={sampleImages[0].confidence}
              size="sm"
            />
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Medium (default)</p>
            <ImagePreviewCard
              src={sampleImages[0].src}
              alt={sampleImages[0].alt}
              confidence={sampleImages[0].confidence}
              size="md"
            />
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Large</p>
            <ImagePreviewCard
              src={sampleImages[0].src}
              alt={sampleImages[0].alt}
              confidence={sampleImages[0].confidence}
              size="lg"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Full Featured Cards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sampleImages.map((img) => (
            <ImagePreviewCard
              key={img.id}
              src={img.src}
              alt={img.alt}
              extendedAlt={img.extendedAlt}
              confidence={img.confidence}
              flags={img.flags}
              status={img.status}
              imageType={img.imageType}
              onZoom={() => setZoomImage({ src: img.src, alt: img.alt })}
              onDownload={() => console.log('Download:', img.id)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Compact Cards (for grids)</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
          {sampleImages.map((img) => (
            <ImagePreviewCardCompact
              key={img.id}
              src={img.src}
              alt={img.alt}
              confidence={img.confidence}
              status={img.status}
              selected={selectedId === img.id}
              onClick={() => setSelectedId(selectedId === img.id ? null : img.id)}
            />
          ))}
        </div>
        <p className="text-sm text-gray-500">
          Selected: {selectedId || 'None'} (click to select/deselect)
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Minimal (no metadata)</h2>
        <div className="flex gap-4">
          <ImagePreviewCard
            src={sampleImages[0].src}
            alt={sampleImages[0].alt}
            showMetadata={false}
            showActions={false}
          />
          <ImagePreviewCard
            src={sampleImages[1].src}
            alt={sampleImages[1].alt}
            showMetadata={false}
            showActions={true}
          />
        </div>
      </section>

      <ImageZoomModal
        src={zoomImage?.src || ''}
        alt={zoomImage?.alt || ''}
        isOpen={!!zoomImage}
        onClose={() => setZoomImage(null)}
      />
    </div>
  );
};
