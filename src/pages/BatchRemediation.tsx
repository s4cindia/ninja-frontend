import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { BatchJobSelector } from '@/components/remediation/BatchJobSelector';
import { BatchProgress } from '@/components/remediation/BatchProgress';
import { BatchResultsSummary } from '@/components/remediation/BatchResultsSummary';
import { api } from '@/services/api';
import { ArrowLeft, Play, Layers } from 'lucide-react';

type BatchState = 'selection' | 'processing' | 'completed';

interface SelectedJobInfo {
  jobId: string;
  fileName: string;
}

interface BatchSummary {
  batchId: string;
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  totalIssuesFixed: number;
  successRate: number;
  jobs: {
    jobId: string;
    fileName: string;
    status: 'completed' | 'failed';
    issuesFixed?: number;
    error?: string;
  }[];
}

const BatchRemediationPage: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<BatchState>('selection');
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [selectedJobsInfo, setSelectedJobsInfo] = useState<SelectedJobInfo[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartBatch = async () => {
    if (selectedJobs.length === 0) {
      setError('Please select at least one job to remediate.');
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      console.log('[BatchRemediation] Creating batch with jobs:', selectedJobs);
      
      const createResponse = await api.post('/epub/batch', {
        jobIds: selectedJobs,
        options: { generateComparison: true },
      });
      
      console.log('[BatchRemediation] Create response:', createResponse.data);
      
      const newBatchId = createResponse.data.data?.batchId || 
                          createResponse.data.batchId || 
                          createResponse.data.batch_id;
      
      if (!newBatchId) {
        throw new Error('No batch ID returned from API');
      }
      
      setBatchId(newBatchId);

      console.log('[BatchRemediation] Starting batch:', newBatchId);
      await api.post(`/epub/batch/${newBatchId}/start`);
      
      setState('processing');
    } catch (err) {
      console.error('[BatchRemediation] Failed to start batch:', err);
      setError('Failed to create batch. Starting in demo mode for preview.');
      const demoBatchId = `demo-batch-${Date.now()}`;
      setBatchId(demoBatchId);
      setState('processing');
    } finally {
      setIsStarting(false);
    }
  };

  const handleBatchComplete = (status: {
    batchId: string;
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    jobs: {
      jobId: string;
      fileName: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      issuesFixed?: number;
      error?: string;
    }[];
    summary: {
      totalIssuesFixed: number;
      successRate: number;
    };
  }) => {
    const summary: BatchSummary = {
      batchId: status.batchId,
      totalJobs: status.totalJobs,
      successfulJobs: status.completedJobs,
      failedJobs: status.failedJobs,
      totalIssuesFixed: status.summary.totalIssuesFixed,
      successRate: status.summary.successRate,
      jobs: status.jobs
        .filter(j => j.status === 'completed' || j.status === 'failed')
        .map(j => ({
          jobId: j.jobId,
          fileName: j.fileName,
          status: j.status as 'completed' | 'failed',
          issuesFixed: j.issuesFixed,
          error: j.error,
        })),
    };
    setBatchSummary(summary);
    setState('completed');
  };

  const handleBatchCancel = () => {
    setState('selection');
    setBatchId(null);
    setSelectedJobs([]);
  };

  const handleBack = () => {
    if (state === 'processing') {
      return;
    }
    navigate('/remediation');
  };

  const handleReset = () => {
    setState('selection');
    setBatchId(null);
    setBatchSummary(null);
    setSelectedJobs([]);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Breadcrumbs items={[
        { label: 'Remediation', path: '/remediation' },
        { label: 'Batch Processing' }
      ]} />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {state !== 'processing' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              aria-label="Back to remediation"
            >
              <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="h-6 w-6" aria-hidden="true" />
              Batch Remediation
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {state === 'selection' && 'Select multiple files to remediate at once'}
              {state === 'processing' && 'Processing batch remediation...'}
              {state === 'completed' && 'Batch remediation complete'}
            </p>
          </div>
        </div>

        {state === 'selection' && (
          <Button
            onClick={handleStartBatch}
            disabled={selectedJobs.length === 0 || isStarting}
            aria-label="Start batch remediation"
          >
            {isStarting ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" aria-hidden="true" />
            )}
            Start Batch ({selectedJobs.length})
          </Button>
        )}

        {state === 'completed' && (
          <Button variant="outline" onClick={handleReset}>
            Start New Batch
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {state === 'selection' && (
        <BatchJobSelector
          selectedJobs={selectedJobs}
          onSelectionChange={(ids, details) => {
            setSelectedJobs(ids);
            if (details) setSelectedJobsInfo(details);
          }}
        />
      )}

      {state === 'processing' && batchId && (
        <BatchProgress
          batchId={batchId}
          selectedJobs={selectedJobsInfo}
          onComplete={handleBatchComplete}
          onCancel={handleBatchCancel}
        />
      )}

      {state === 'completed' && batchSummary && (
        <BatchResultsSummary
          batchId={batchSummary.batchId}
          summary={batchSummary}
        />
      )}
    </div>
  );
};

export default BatchRemediationPage;
