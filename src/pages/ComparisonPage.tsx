import React, { useState, useMemo, useEffect, useCallback, useTransition, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, Code, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import {
  ComparisonHeader,
  FilterBar,
  IssueNavigator,
  ComparisonPanel,
} from '@/components/comparison';

const VisualComparisonPanel = lazy(() =>
  import('@/components/comparison/VisualComparisonPanel').then(module => ({
    default: module.VisualComparisonPanel
  }))
);
import { useFilteredComparison } from '@/hooks/useComparison';
import { getVisualComparison } from '@/services/comparison.service';
import type { ComparisonFilters } from '@/types/comparison';
import { useMemoryMonitor, memoryMonitor } from '@/utils/MemoryProfiler';

export const ComparisonPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filters, setFilters] = useState<ComparisonFilters>({});
  const [viewType, setViewType] = useState<'visual' | 'code'>('code'); // Default to code for performance
  const [isPending, startTransition] = useTransition();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data, isLoading, error } = useFilteredComparison(jobId || '', filters);

  useMemoryMonitor(currentIndex);

  useEffect(() => {
    (window as any).printMemorySummary = () => memoryMonitor.printSummary();
    console.log('💡 Tip: Run printMemorySummary() in console to see memory usage table');
  }, []);


  useEffect(() => {
    console.log(`[ComparisonPage] Navigated to change ${currentIndex}/${data?.changes.length || 0}`);
  }, [currentIndex, data?.changes.length]);

  const currentChange = data?.changes[currentIndex];

  const { data: isVisualAvailable, isLoading: isCheckingVisual } = useQuery({
    queryKey: ['visual-available', currentChange?.jobId, currentChange?.id],
    queryFn: async () => {
      const metadataFiles = ['content.opf', 'toc.ncx', 'nav.xhtml', '.opf'];
      const isMetadataChange = metadataFiles.some(file =>
        currentChange?.filePath?.toLowerCase().includes(file)
      );

      if (isMetadataChange) {
        return false;
      }

      try {
        await getVisualComparison(currentChange!.jobId, currentChange!.id);
        return true;
      } catch (error: unknown) {
        const err = error as { response?: { status?: number }; message?: string };
        if (err?.response?.status === 500 ||
            err?.message?.includes('Spine item not found')) {
          return false;
        }
        console.warn('Visual comparison check failed:', error);
        return false;
      }
    },
    enabled: !!currentChange?.jobId && !!currentChange?.id,
    retry: false,
    staleTime: 5 * 60 * 1000
  });

  useEffect(() => {
    if (isVisualAvailable === false && viewType === 'visual') {
      setViewType('code');
    }
  }, [isVisualAvailable, viewType]);

  useEffect(() => {
    if (!data?.changes || viewType !== 'visual') return;

    const prefetchChange = (index: number) => {
      if (index < 0 || index >= data.changes.length) return;

      const change = data.changes[index];
      queryClient.prefetchQuery({
        queryKey: ['visual-comparison', change.jobId, change.id],
        queryFn: () => getVisualComparison(change.jobId, change.id),
        staleTime: Infinity,
      });
    };

    const timer = setTimeout(() => {
      prefetchChange(currentIndex + 1);
      prefetchChange(currentIndex - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentIndex, data?.changes, viewType, queryClient]);

  const changeTypes = useMemo(() => {
    if (!data?.byType) return [];
    return Object.keys(data.byType);
  }, [data?.byType]);

  const handleFilterChange = (newFilters: ComparisonFilters) => {
    setFilters(newFilters);
    setCurrentIndex(0);
  };

  const handlePrevious = useCallback(() => {
    if (isNavigating) return; // Prevent rapid clicks

    setIsNavigating(true);
    startTransition(() => {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
      setTimeout(() => setIsNavigating(false), 500);
    });
  }, [isNavigating]);

  const handleNext = useCallback(() => {
    if (isNavigating || !data?.changes) return; // Prevent rapid clicks

    setIsNavigating(true);
    startTransition(() => {
      setCurrentIndex((prev) => Math.min(data.changes.length - 1, prev + 1));
      setTimeout(() => setIsNavigating(false), 500);
    });
  }, [isNavigating, data?.changes]);

  const handleBack = () => {
    navigate(`/remediation/${jobId}`);
  };

  if (!jobId) {
    navigate('/remediation');
    return null;
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Breadcrumbs
          items={[
            { label: 'Remediation', path: '/remediation' },
            { label: 'Comparison' },
          ]}
        />
        <Alert variant="error" className="mt-4">
          Failed to load comparison data. Please try again.
        </Alert>
        <Button variant="outline" onClick={handleBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Remediation
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Breadcrumbs
          items={[
            { label: 'Remediation', path: '/remediation' },
            { label: 'Comparison' },
          ]}
        />
        <Alert variant="warning" className="mt-4">
          No comparison data available for this job.
        </Alert>
        <Button variant="outline" onClick={handleBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Remediation
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <Breadcrumbs
        items={[
          { label: 'Remediation', path: '/remediation' },
          { label: data.fileName || 'Comparison' },
        ]}
      />

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Remediation
        </Button>
      </div>

      <ComparisonHeader summary={data.summary} fileName={data.fileName} />

      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        changeTypes={changeTypes}
      />

      {data.changes.length > 0 ? (
        <>
          <IssueNavigator
            currentIndex={currentIndex}
            totalCount={data.changes.length}
            onPrevious={handlePrevious}
            onNext={handleNext}
            disabled={isNavigating || isPending}
          />

          {currentChange && (
            <>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setViewType('visual')}
                  disabled={!isVisualAvailable || isCheckingVisual}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    viewType === 'visual'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : isVisualAvailable && !isCheckingVisual
                        ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                  }`}
                  title={
                    isCheckingVisual
                      ? 'Checking availability...'
                      : !isVisualAvailable
                        ? 'Visual comparison not available for this change'
                        : ''
                  }
                >
                  <Eye size={16} />
                  Visual
                  {isCheckingVisual && <span className="text-xs ml-1">(Checking...)</span>}
                  {!isCheckingVisual && !isVisualAvailable && <span className="text-xs ml-1">(N/A)</span>}
                </button>
                <button
                  onClick={() => setViewType('code')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    viewType === 'code'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Code size={16} />
                  Code
                </button>
              </div>

              {viewType === 'visual' ? (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-96 bg-white rounded-lg border border-gray-200">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-600">Loading visual comparison...</span>
                  </div>
                }>
                  <VisualComparisonPanel
                    jobId={jobId}
                    changeId={currentChange.id}
                    changeDescription={currentChange.description}
                    changeType={currentChange.changeType}
                    filePath={currentChange.filePath}
                    severity={currentChange.severity || undefined}
                    currentIndex={currentIndex}
                    totalChanges={data?.changes.length}
                    onNavigatePrevious={handlePrevious}
                    onNavigateNext={handleNext}
                    canNavigatePrevious={currentIndex > 0}
                    canNavigateNext={currentIndex < (data?.changes.length ?? 0) - 1}
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={() => setIsFullscreen(prev => !prev)}
                  />
                </Suspense>
              ) : (
                <ComparisonPanel change={currentChange} />
              )}
            </>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No changes found matching the current filters.</p>
        </div>
      )}
    </div>
  );
};
