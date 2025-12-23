import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Wrench, Plus, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { RemediationHistory, RemediationWorkflow } from '@/components/remediation';
import { api } from '@/services/api';

type ContentType = 'pdf' | 'epub';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const RemediationPage: React.FC = () => {
  const { jobId } = useParams<{ jobId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const typeParam = searchParams.get('type') as ContentType | null;
    if (typeParam && (typeParam === 'pdf' || typeParam === 'epub')) {
      setContentType(typeParam);
      return;
    }

    const fetchJobType = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/jobs/${jobId}`);
        const job = response.data.data || response.data;
        const type = job.contentType || job.type || 'epub';
        setContentType(type.toLowerCase() as ContentType);
      } catch (error) {
        console.error('[RemediationPage] Failed to fetch job type:', error);
        setContentType('epub');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobType();
  }, [jobId, searchParams]);

  const handleViewJob = (id: string, type?: ContentType) => {
    const typeParam = type ? `?type=${type}` : '';
    navigate(`/remediation/${id}${typeParam}`);
  };

  const handleDownload = useCallback(async (id: string, type?: ContentType) => {
    const apiPrefix = type === 'pdf' ? 'pdf' : 'epub';
    const mimeType = type === 'pdf' ? 'application/pdf' : 'application/epub+zip';
    const extension = type === 'pdf' ? 'pdf' : 'epub';
    
    try {
      const response = await api.get(`/${apiPrefix}/job/${id}/download-remediated`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: mimeType });
      downloadBlob(blob, `remediated-file.${extension}`);
    } catch (error) {
      console.error('[Download] Failed:', error);
    }
  }, []);

  const handleStartNew = () => {
    navigate('/epub');
  };

  const handleComplete = () => {
    navigate('/remediation');
  };

  if (jobId) {
    if (isLoading || !contentType) {
      return (
        <div className="p-6 max-w-5xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/remediation')}>
            ← Back to History
          </Button>
        </div>
        <RemediationWorkflow
          contentType={contentType}
          jobId={jobId}
          onComplete={handleComplete}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Breadcrumbs items={[{ label: 'Remediation' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="h-7 w-7 text-primary-600" />
            Remediation
          </h1>
          <p className="text-gray-600 mt-1">
            View past remediation jobs and start new ones
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/remediation/batch')}>
            <Layers className="h-4 w-4 mr-2" aria-hidden="true" />
            Batch Remediation
          </Button>
          <Button variant="primary" onClick={handleStartNew}>
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Start New Remediation
          </Button>
        </div>
      </div>

      <RemediationHistory
        onViewJob={handleViewJob}
        onDownload={handleDownload}
      />
    </div>
  );
};
