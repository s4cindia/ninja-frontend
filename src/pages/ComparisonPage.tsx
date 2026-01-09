import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Code } from 'lucide-react';
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
import { VisualComparisonPanel } from '@/components/comparison/VisualComparisonPanel';
import { useFilteredComparison } from '@/hooks/useComparison';
import type { ComparisonFilters } from '@/types/comparison';

export const ComparisonPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filters, setFilters] = useState<ComparisonFilters>({});
  const [viewType, setViewType] = useState<'visual' | 'code'>('visual');

  const { data, isLoading, error } = useFilteredComparison(jobId || '', filters);

  const changeTypes = useMemo(() => {
    if (!data?.byType) return [];
    return Object.keys(data.byType);
  }, [data?.byType]);

  const handleFilterChange = (newFilters: ComparisonFilters) => {
    setFilters(newFilters);
    setCurrentIndex(0);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (data?.changes) {
      setCurrentIndex((prev) => Math.min(data.changes.length - 1, prev + 1));
    }
  };

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

  const currentChange = data.changes[currentIndex];

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
          />

          {currentChange && (
            <>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setViewType('visual')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    viewType === 'visual'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Eye size={16} />
                  Visual
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
                <VisualComparisonPanel
                  jobId={jobId}
                  changeId={currentChange.id}
                />
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
