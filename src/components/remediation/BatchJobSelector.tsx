import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { api } from '@/services/api';
import { FileText, Check, Square, CheckSquare, AlertCircle } from 'lucide-react';

interface Job {
  id: string;
  fileName: string;
  type: 'epub' | 'pdf';
  auditScore: number;
  issueCount: number;
  createdAt: string;
  status: string;
}

interface SelectedJobInfo {
  jobId: string;
  fileName: string;
}

interface BatchJobSelectorProps {
  selectedJobs: string[];
  onSelectionChange: (jobIds: string[], jobDetails?: SelectedJobInfo[]) => void;
  maxJobs?: number;
  className?: string;
}

const MAX_BATCH_SIZE = 100;

const formatDate = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const mapJobData = (data: Record<string, unknown>): Job => {
  const input = data.input as Record<string, unknown> | undefined;
  const metadata = data.metadata as Record<string, unknown> | undefined;
  const output = data.output as Record<string, unknown> | undefined;
  
  const fileName = String(
    data.fileName || 
    data.file_name || 
    data.name ||
    data.originalName ||
    data.original_name ||
    input?.fileName ||
    input?.file_name ||
    input?.name ||
    input?.originalName ||
    metadata?.fileName ||
    metadata?.name ||
    output?.fileName ||
    'Unknown'
  );
  
  const auditScore = Number(
    data.auditScore || 
    data.audit_score || 
    data.score ||
    output?.score ||
    output?.auditScore ||
    0
  );
  
  const issueCount = Number(
    data.issueCount || 
    data.issue_count || 
    data.issues ||
    output?.issueCount ||
    output?.issues ||
    (output?.issues as unknown[])?.length ||
    0
  );

  return {
    id: String(data.id || data.jobId || data.job_id || ''),
    fileName,
    type: (data.type || data.contentType || data.content_type || 'epub') as 'epub' | 'pdf',
    auditScore,
    issueCount,
    createdAt: String(data.createdAt || data.created_at || new Date().toISOString()),
    status: String(data.status || 'pending'),
  };
};

export const BatchJobSelector: React.FC<BatchJobSelectorProps> = ({
  selectedJobs,
  onSelectionChange,
  maxJobs = MAX_BATCH_SIZE,
  className = '',
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('[BatchJobSelector] Fetching jobs...');
        const response = await api.get('/jobs');
        console.log('[BatchJobSelector] Full response:', response.data);
        
        const data = response.data.data || response.data;
        const jobList = Array.isArray(data) ? data : data.jobs || [];
        
        console.log('[BatchJobSelector] Job list:', jobList);
        console.log('[BatchJobSelector] First job sample:', jobList[0]);
        
        // Map all jobs - filter can be adjusted once we know the data structure
        const mappedJobs = jobList.map(mapJobData);
        console.log('[BatchJobSelector] Mapped jobs:', mappedJobs);
        
        setJobs(mappedJobs);
      } catch (err) {
        console.error('[BatchJobSelector] Failed to fetch jobs:', err);
        setError('Failed to load jobs. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const isAllSelected = useMemo(() => {
    return jobs.length > 0 && jobs.every(job => selectedJobs.includes(job.id));
  }, [jobs, selectedJobs]);

  const getJobDetails = (jobIds: string[]): SelectedJobInfo[] => {
    return jobIds.map(id => {
      const job = jobs.find(j => j.id === id);
      return { jobId: id, fileName: job?.fileName || 'Unknown' };
    });
  };

  const toggleJob = (jobId: string) => {
    if (selectedJobs.includes(jobId)) {
      const newSelection = selectedJobs.filter(id => id !== jobId);
      onSelectionChange(newSelection, getJobDetails(newSelection));
    } else if (selectedJobs.length < maxJobs) {
      const newSelection = [...selectedJobs, jobId];
      onSelectionChange(newSelection, getJobDetails(newSelection));
    }
  };

  const toggleAll = () => {
    if (isAllSelected) {
      onSelectionChange([], []);
    } else {
      const allIds = jobs.slice(0, maxJobs).map(job => job.id);
      onSelectionChange(allIds, getJobDetails(allIds));
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <Alert variant="error" className={className}>
        {error}
      </Alert>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" aria-hidden="true" />
            Select Jobs for Batch Remediation
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {selectedJobs.length} of {maxJobs} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAll}
              aria-label={isAllSelected ? 'Deselect all jobs' : 'Select all jobs'}
            >
              {isAllSelected ? (
                <>
                  <Square className="h-4 w-4 mr-1" aria-hidden="true" />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4 mr-1" aria-hidden="true" />
                  Select All
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedJobs.length >= maxJobs && (
          <Alert variant="warning" className="mb-4">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            Maximum of {maxJobs} jobs per batch reached.
          </Alert>
        )}
        
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No jobs available for batch remediation
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" role="grid" aria-label="Jobs available for batch remediation">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 text-left w-12" scope="col">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-600" scope="col">
                    File Name
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-600" scope="col">
                    Type
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-600" scope="col">
                    Audit Score
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-600" scope="col">
                    Issues
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-600" scope="col">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => {
                  const isSelected = selectedJobs.includes(job.id);
                  const isDisabled = !isSelected && selectedJobs.length >= maxJobs;
                  
                  return (
                    <tr
                      key={job.id}
                      className={`border-b border-gray-100 transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      } ${isDisabled ? 'opacity-50' : 'cursor-pointer'}`}
                      onClick={() => !isDisabled && toggleJob(job.id)}
                      role="row"
                      aria-selected={isSelected}
                    >
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isDisabled) toggleJob(job.id);
                          }}
                          disabled={isDisabled}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-300 bg-white'
                          } ${isDisabled ? 'cursor-not-allowed' : ''}`}
                          aria-label={isSelected ? `Deselect ${job.fileName}` : `Select ${job.fileName}`}
                          aria-checked={isSelected}
                          role="checkbox"
                        >
                          {isSelected && <Check className="h-3 w-3" aria-hidden="true" />}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-gray-900">{job.fileName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={job.type === 'epub' ? 'info' : 'default'} size="sm">
                          {job.type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-semibold ${getScoreColor(job.auditScore)}`}>
                          {job.auditScore}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{job.issueCount}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-500">{formatDate(job.createdAt)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
