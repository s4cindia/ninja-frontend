import { useState } from 'react';
import {
  CitationList,
  CitationDetail,
  CitationStats,
  CitationTypeFilter
} from '@/components/citation';
import type { Citation, CitationFilters, CitationStats as CitationStatsType } from '@/types/citation.types';

const mockCitations: Citation[] = [
  {
    id: '1',
    documentId: 'doc-1',
    rawText: 'Smith, J., & Johnson, M. (2023). Understanding machine learning in education. Journal of Educational Technology, 45(2), 123-145.',
    citationType: 'PARENTHETICAL',
    detectedStyle: 'APA',
    pageNumber: 12,
    paragraphIndex: 3,
    startOffset: 150,
    endOffset: 280,
    confidence: 95,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    primaryComponentId: 'comp-1',
    primaryComponent: {
      id: 'comp-1',
      citationId: '1',
      parseVariant: 'APA',
      confidence: 0.95,
      authors: ['Smith, J.', 'Johnson, M.'],
      year: '2023',
      title: 'Understanding machine learning in education',
      source: 'Journal of Educational Technology',
      volume: '45',
      issue: '2',
      pages: '123-145',
      doi: '10.1234/jet.2023.45.2.123',
      url: null,
      publisher: null,
      edition: null,
      accessDate: null,
      sourceType: 'JOURNAL_ARTICLE',
      fieldConfidence: { authors: 0.98, year: 0.99, title: 0.92 },
      doiVerified: true,
      urlValid: null,
      urlCheckedAt: null,
      needsReview: false,
      reviewReasons: [],
      createdAt: new Date().toISOString(),
    },
    needsReview: false,
  },
  {
    id: '2',
    documentId: 'doc-1',
    rawText: 'According to Brown (2022), accessibility standards have evolved significantly over the past decade.',
    citationType: 'NARRATIVE',
    detectedStyle: 'APA',
    pageNumber: 15,
    paragraphIndex: 1,
    startOffset: 0,
    endOffset: 98,
    confidence: 88,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    primaryComponentId: null,
    needsReview: false,
  },
  {
    id: '3',
    documentId: 'doc-1',
    rawText: '¹ World Health Organization. "Global Accessibility Report." WHO Publications, 2021.',
    citationType: 'FOOTNOTE',
    detectedStyle: 'CHICAGO',
    pageNumber: 18,
    paragraphIndex: null,
    startOffset: 500,
    endOffset: 582,
    confidence: 72,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    primaryComponentId: null,
    needsReview: true,
  },
  {
    id: '4',
    documentId: 'doc-1',
    rawText: 'Davis_and_Wilson (2020) personal_communication study results',
    citationType: 'UNKNOWN',
    detectedStyle: 'UNKNOWN',
    pageNumber: 22,
    paragraphIndex: 5,
    startOffset: 100,
    endOffset: 160,
    confidence: 45,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    primaryComponentId: null,
    needsReview: true,
  },
];

const mockStats: CitationStatsType = {
  total: 24,
  parsed: 18,
  unparsed: 6,
  needsReview: 4,
  byType: {
    PARENTHETICAL: 12,
    NARRATIVE: 6,
    FOOTNOTE: 3,
    ENDNOTE: 1,
    NUMERIC: 2,
    UNKNOWN: 0,
  },
  byStyle: {
    APA: 14,
    MLA: 4,
    CHICAGO: 3,
    VANCOUVER: 1,
    HARVARD: 1,
    IEEE: 1,
    UNKNOWN: 0,
  },
  averageConfidence: 82,
};

export function TestCitationComponents() {
  const [filters, setFilters] = useState<CitationFilters>({ page: 1, limit: 20 });
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [parsingId, setParsingId] = useState<string | null>(null);

  const handleParse = (citationId: string) => {
    setParsingId(citationId);
    setTimeout(() => {
      setParsingId(null);
      alert(`Citation ${citationId} parsed (mock)`);
    }, 1500);
  };

  const filteredCitations = mockCitations.filter((c) => {
    if (filters.type && c.citationType !== filters.type) return false;
    if (filters.style && c.detectedStyle !== filters.style) return false;
    if (filters.minConfidence !== undefined && c.confidence < filters.minConfidence) return false;
    if (filters.maxConfidence !== undefined && c.confidence >= filters.maxConfidence) return false;
    if (filters.needsReview !== undefined && c.needsReview !== filters.needsReview) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Citation Management - Component Test
          </h1>
          <p className="text-gray-600">
            This page demonstrates the citation detection and parsing components with mock data.
          </p>
        </div>

        <CitationStats stats={mockStats} />

        <CitationTypeFilter filters={filters} onFilterChange={setFilters} />

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Citations ({filteredCitations.length} of {mockCitations.length})
          </h2>
          <CitationList
            citations={filteredCitations}
            isLoading={false}
            onParse={handleParse}
            onViewDetail={setSelectedCitation}
            isParsing={parsingId}
          />
        </div>

        {selectedCitation && (
          <CitationDetail
            citation={selectedCitation}
            onClose={() => setSelectedCitation(null)}
          />
        )}
      </div>
    </div>
  );
}
