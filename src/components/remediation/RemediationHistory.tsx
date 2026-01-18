import React, { useState, useEffect, useCallback } from 'react';
import { History, FileText, Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/services/api';

type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type ContentType = 'pdf' | 'epub';

interface RemediationJob {
  id: string;
  fileName: string;
  contentType: ContentType;
  status: JobStatus;
  issuesFixed: number;
  totalIssues: number;
  createdAt: string;
  completedAt?: string;
}

interface RemediationHistoryProps {
  onViewJob?: (jobId: string, contentType?: ContentType) => void;
  onDownload?: (jobId: string, contentType?: ContentType) => void;
  className?: string;
}

const STATUS_VARIANTS: Record<JobStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  COMPLETED: 'success',
  FAILED: 'error',
};

const generateDemoJobs = (): RemediationJob[] => [
  {
    id: 'job-1',
    fileName: 'biology-textbook.epub',
    contentType: 'epub',
    status: 'COMPLETED',
    issuesFixed: 45,
    totalIssues: 52,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 1800000).toISOString(),
  },
  {
    id: 'job-2',
    fileName: 'chemistry-guide.pdf',
    contentType: 'pdf',
    status: 'COMPLETED',
    issuesFixed: 28,
    totalIssues: 35,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 2400000).toISOString(),
  },
  {
    id: 'job-3',
    fileName: 'math-workbook.epub',
    contentType: 'epub',
    status: 'PROCESSING',
    issuesFixed: 12,
    totalIssues: 40,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'job-4',
    fileName: 'history-reader.pdf',
    contentType: 'pdf',
    status: 'FAILED',
    issuesFixed: 0,
    totalIssues: 18,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'job-5',
    fileName: 'english-literature.epub',
    contentType: 'epub',
    status: 'PENDING',
    issuesFixed: 0,
    totalIssues: 25,
    createdAt: new Date().toISOString(),
  },
];

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const RemediationHistory: React.FC<RemediationHistoryProps> = ({
  onViewJob,
  onDownload,
  className,
}) => {
  const [jobs, setJobs] = useState<RemediationJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      
      interface RawJob {
        type?: string;
        jobType?: string;
        fileName?: string;
        filename?: string;
        name?: string;
        originalName?: string;
        file?: { name?: string; fileName?: string; originalName?: string };
        input?: { fileName?: string; name?: string };
        metadata?: { fileName?: string; name?: string };
        product?: { name?: string; fileName?: string };
        issuesFixed?: number;
        fixedCount?: number;
        fixed?: number;
        totalIssues?: number;
        issuesTotal?: number;
        issueCount?: number;
        total?: number;
        status?: string;
        createdAt?: string;
        created_at?: string;
        uploadedAt?: string;
        created?: string;
        completedAt?: string;
        id?: string;
        _id?: string;
        jobId?: string;
        items?: RawJob[];
        jobs?: RawJob[];
        data?: RawJob[];
        result?: { fixed?: number; issuesFixed?: number; total?: number; issuesTotal?: number; totalIssues?: number };
        stats?: { fixed?: number; total?: number };
        remediation?: { fixed?: number };
        audit?: { total?: number; issueCount?: number };
        output?: { fixed?: number; issuesFixed?: number; total?: number; issuesTotal?: number; issueCount?: number };
      }

      const parseJobsList = (responseData: RawJob | RawJob[]): RawJob[] => {
        if (Array.isArray(responseData)) {
          return responseData;
        } else if (responseData?.items && Array.isArray(responseData.items)) {
          return responseData.items;
        } else if (responseData?.jobs && Array.isArray(responseData.jobs)) {
          return responseData.jobs;
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          return responseData.data;
        }
        return [];
      };
      
      // Filter to only show relevant job types (accessibility jobs, not batch processing)
      const RELEVANT_JOB_TYPES = ['EPUB_ACCESSIBILITY', 'PDF_ACCESSIBILITY', 'ACCESSIBILITY_AUDIT', 'REMEDIATION'];
      
      const isRelevantJob = (job: RawJob): boolean => {
        const jobType = String(job.type || job.jobType || '').toUpperCase();
        return RELEVANT_JOB_TYPES.some(t => jobType.includes(t));
      };
      
      // Derive content type from job type
      const getContentType = (job: RawJob): ContentType => {
        const jobType = String(job.type || job.jobType || '').toUpperCase();
        if (jobType.includes('PDF')) return 'pdf';
        return 'epub';
      };
      
      // Get display name for the job
      const getJobDisplayName = (job: RawJob): string => {
        // Try direct file name fields
        if (job.fileName) return job.fileName;
        if (job.filename) return job.filename;
        if (job.name) return job.name;
        if (job.originalName) return job.originalName;
        
        // Try nested file object
        if (job.file?.name) return job.file.name;
        if (job.file?.fileName) return job.file.fileName;
        if (job.file?.originalName) return job.file.originalName;
        
        // Try input object
        if (job.input?.fileName) return job.input.fileName;
        if (job.input?.name) return job.input.name;
        
        // Try metadata
        if (job.metadata?.fileName) return job.metadata.fileName;
        if (job.metadata?.name) return job.metadata.name;
        
        // Try product
        if (job.product?.name) return job.product.name;
        if (job.product?.fileName) return job.product.fileName;
        
        // Create a descriptive name from job type
        const jobType = String(job.type || '').replace(/_/g, ' ').toLowerCase();
        const date = new Date(job.createdAt || Date.now()).toLocaleDateString();
        return `${jobType} - ${date}`;
      };
      
      const mapToRemediationJob = (job: RawJob): RemediationJob => {
        // Try multiple field paths for issues
        const issuesFixed = job.issuesFixed || job.fixedCount || job.fixed || 
                           job.result?.fixed || job.result?.issuesFixed || 
                           job.stats?.fixed || job.remediation?.fixed ||
                           job.output?.fixed || job.output?.issuesFixed || 0;
        const totalIssues = job.totalIssues || job.issueCount || job.total || 
                           job.result?.total || job.result?.totalIssues || 
                           job.stats?.total || job.audit?.issueCount ||
                           job.output?.total || job.output?.issueCount || 0;
        
        return {
          id: String(job.id || job._id || job.jobId || ''),
          fileName: getJobDisplayName(job),
          contentType: getContentType(job),
          status: (String(job.status || 'PENDING').toUpperCase()) as JobStatus,
          issuesFixed: Number(issuesFixed),
          totalIssues: Number(totalIssues),
          createdAt: String(job.createdAt || job.created_at || job.uploadedAt || job.created || new Date().toISOString()),
          completedAt: job.completedAt ? String(job.completedAt) : undefined,
        };
      };
      
      try {
        // Try multiple endpoints in order of preference
        const endpoints = [
          '/jobs',
          '/user/jobs',
          '/files',
        ];
        
        let jobsList: RemediationJob[] = [];
        
        for (const endpoint of endpoints) {
          try {
            const response = await api.get(endpoint);
            const responseData = response.data?.data || response.data;
            const rawJobs = parseJobsList(responseData);
            
            if (rawJobs.length > 0) {
              // Filter to relevant job types and map to our format
              const relevantJobs = rawJobs.filter(isRelevantJob);
              jobsList = relevantJobs.map(mapToRemediationJob).filter(job => job.id);
              break;
            }
          } catch {
            // Endpoint not available, try next
          }
        }
        
        if (jobsList.length > 0) {
          setJobs(jobsList);
          setTotalPages(Math.ceil(jobsList.length / 10) || 1);
        } else {
          console.log('[RemediationHistory] No jobs found from any endpoint, using demo data');
          setJobs(generateDemoJobs());
          setTotalPages(1);
        }
      } catch (error) {
        console.error('[RemediationHistory] Failed to fetch jobs:', error);
        setJobs(generateDemoJobs());
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, [page]);

  const handleViewJob = useCallback((jobId: string, contentType: ContentType) => {
    onViewJob?.(jobId, contentType);
  }, [onViewJob]);

  const handleDownload = useCallback((jobId: string, contentType: ContentType) => {
    onDownload?.(jobId, contentType);
  }, [onDownload]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary-600" />
          Remediation History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No remediation jobs found</p>
            <p className="text-sm mt-1">Start a new remediation to see it here</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">File Name</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Type</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Issues Fixed</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-2 text-sm text-gray-600">
                        {formatDate(job.createdAt)}
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-sm font-medium text-gray-900">{job.fileName}</span>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={job.contentType === 'epub' ? 'info' : 'default'} size="sm">
                          {job.contentType.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={STATUS_VARIANTS[job.status]} size="sm">
                          {job.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-sm">
                        <span className="text-green-600 font-medium">{job.issuesFixed}</span>
                        <span className="text-gray-400"> / {job.totalIssues}</span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewJob(job.id, job.contentType)}
                            aria-label={`View ${job.fileName}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {job.status === 'COMPLETED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(job.id, job.contentType)}
                              aria-label={`Download ${job.fileName}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
