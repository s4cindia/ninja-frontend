import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Spinner } from '@/components/ui/Spinner';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ComparisonView } from '@/components/remediation';
import { api } from '@/services/api';

type ContentType = 'pdf' | 'epub';

export const ComparisonPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!jobId) {
      navigate('/remediation');
      return;
    }

    const typeParam = searchParams.get('type') as ContentType | null;
    if (typeParam && (typeParam === 'pdf' || typeParam === 'epub')) {
      setContentType(typeParam);
      setIsLoading(false);
      return;
    }

    const fetchJobType = async () => {
      try {
        const response = await api.get(`/jobs/${jobId}`);
        const job = response.data.data || response.data;
        const type = job.contentType || job.type || 'epub';
        setContentType(type.toLowerCase() as ContentType);
      } catch (error) {
        console.error('[ComparisonPage] Failed to fetch job type:', error);
        setContentType('epub');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobType();
  }, [jobId, searchParams, navigate]);

  const handleBack = () => {
    const typeParam = contentType ? `?type=${contentType}` : '';
    navigate(`/remediation/${jobId}${typeParam}`);
  };

  if (isLoading || !contentType || !jobId) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Breadcrumbs items={[
        { label: 'Remediation', path: '/remediation' },
        { label: 'Comparison' }
      ]} />
      <ComparisonView
        jobId={jobId}
        contentType={contentType}
        onBack={handleBack}
      />
    </div>
  );
};
