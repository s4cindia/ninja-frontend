import { useState, useEffect } from 'react';
import { BookOpen, Loader2, Download, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StyleSelector } from '../validation/StyleSelector';
import { ReferenceEntryCard } from './ReferenceEntryCard';
import { useCitationStyles } from '@/hooks/useCitationValidation';
import {
  useFetchReferenceList,
  useGenerateReferenceList,
  useUpdateReferenceEntry,
  useFinalizeReferenceList
} from '@/hooks/useReferenceList';
import type { ReferenceListResult } from '@/types/reference-list.types';

interface ReferenceListGeneratorProps {
  documentId: string;
}

export function ReferenceListGenerator({ documentId }: ReferenceListGeneratorProps) {
  const [selectedStyle, setSelectedStyle] = useState('apa7');
  const [referenceList, setReferenceList] = useState<ReferenceListResult | null>(null);

  const { data: styles = [] } = useCitationStyles();
  const {
    data: existingList,
    isLoading: isFetching,
  } = useFetchReferenceList(documentId, selectedStyle);
  const generateMutation = useGenerateReferenceList();
  const updateEntryMutation = useUpdateReferenceEntry();
  const finalizeMutation = useFinalizeReferenceList();

  useEffect(() => {
    if (existingList && existingList.entries && existingList.entries.length > 0) {
      setReferenceList(existingList);
    }
  }, [existingList]);

  const handleGenerate = async () => {
    if (!documentId) {
      console.error('No documentId available - job may still be loading');
      return;
    }
    const result = await generateMutation.mutateAsync({
      documentId,
      request: {
        styleCode: selectedStyle,
        options: {
          enrichFromCrossRef: true,
          enrichFromPubMed: true
        }
      }
    });
    setReferenceList(result);
  };

  const handleFinalize = async () => {
    await finalizeMutation.mutateAsync({
      documentId,
      styleCode: selectedStyle
    });
  };

  const handleExport = () => {
    if (!referenceList) return;

    const text = referenceList.entries
      .map((e, i) => `${i + 1}. ${(e.formattedEntry || e.formatted || e.formattedApa || e.title || '').replace(/\*/g, '')}`)
      .join('\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'references.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = isFetching || generateMutation.isPending;
  const hasEntries = referenceList && referenceList.entries && referenceList.entries.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reference List</h2>
          <p className="text-sm text-gray-500">
            Generate a formatted bibliography from your citations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StyleSelector
            styles={styles}
            selected={selectedStyle}
            onChange={setSelectedStyle}
            disabled={isLoading}
          />
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                Generating...
              </>
            ) : hasEntries ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                Regenerate
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4 mr-2" aria-hidden="true" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>

      {isFetching && !referenceList && (
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading existing reference list...</p>
        </Card>
      )}

      {referenceList && referenceList.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-3 text-center">
            <p className="text-2xl font-semibold">{referenceList.stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-semibold text-green-600">
              {referenceList.stats.enrichedWithDoi || 0}
            </p>
            <p className="text-xs text-gray-500">With DOI</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-semibold text-yellow-600">
              {referenceList.stats.needsReview}
            </p>
            <p className="text-xs text-gray-500">Needs Review</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-semibold text-gray-600">
              {referenceList.entries.length - (referenceList.stats.needsReview || 0)}
            </p>
            <p className="text-xs text-gray-500">Complete</p>
          </Card>
        </div>
      )}

      {hasEntries && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">
            References ({referenceList.entries.length})
          </h3>
          {referenceList.entries.map((entry, index) => (
            <ReferenceEntryCard
              key={entry.id}
              entry={entry}
              index={index}
              styleCode={selectedStyle}
              onEdit={(updates) =>
                updateEntryMutation.mutate({ entryId: entry.id, updates })
              }
            />
          ))}
        </div>
      )}

      {hasEntries && (
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            Export
          </Button>
          <Button
            onClick={handleFinalize}
            disabled={(referenceList.stats?.needsReview || 0) > 0 || finalizeMutation.isPending}
          >
            {finalizeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                Finalizing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" aria-hidden="true" />
                Finalize
              </>
            )}
          </Button>
        </div>
      )}

      {!hasEntries && !isFetching && (
        <Card className="p-8 text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No reference list yet
          </h3>
          <p className="text-gray-500 mb-4">
            Select a style and click "Generate" to create a reference list from your citations.
          </p>
        </Card>
      )}
    </div>
  );
}
