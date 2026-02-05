import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, CheckCircle, BookOpen, ArrowLeft, Loader2 } from 'lucide-react';
import { ValidationPanel } from '@/components/citation/validation/ValidationPanel';
import { ReferenceListGenerator } from '@/components/citation/reference-list/ReferenceListGenerator';
import { CitationsModule } from '@/components/citation/CitationsModule';
import { Card } from '@/components/ui/Card';
import { useJob } from '@/hooks/useJobs';

type Tab = 'citations' | 'validation' | 'references';

export function CitationWorkflow() {
  const { documentId } = useParams<{ documentId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('citations');

  const { data: job, isLoading: jobLoading } = useJob(documentId || null);

  if (!documentId) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="p-8 text-center">
          <p className="text-gray-500">No document selected</p>
          <Link to="/jobs" className="text-blue-600 hover:underline mt-2 inline-block">
            Go to Jobs
          </Link>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'citations', label: 'Detected Citations', icon: FileText },
    { id: 'validation', label: 'Style Validation', icon: CheckCircle },
    { id: 'references', label: 'Reference List', icon: BookOpen },
  ] as const;

  const jobOutput = job?.output as Record<string, unknown> | undefined;
  const jobInput = job?.input as Record<string, unknown> | undefined;
  const jobDocumentId = (jobOutput?.documentId as string) || documentId;
  const filename = (jobInput?.filename as string) || (jobInput?.fileName as string) || (jobInput?.originalName as string);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <Link
          to="/jobs"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Jobs
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Citation Management</h1>
        {filename && (
          <p className="text-sm text-gray-600 mt-1">{filename}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">Job ID: {documentId}</p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4" role="tablist" aria-label="Citation workflow tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[400px]" role="tabpanel" id={`${activeTab}-panel`}>
        {activeTab === 'citations' && (
          jobLoading ? (
            <Card className="p-8 text-center">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading citations...</p>
            </Card>
          ) : (
            <CitationsModule jobId={documentId} documentId={jobDocumentId} />
          )
        )}

        {activeTab === 'validation' && (
          <ValidationPanel documentId={jobDocumentId} />
        )}

        {activeTab === 'references' && (
          <ReferenceListGenerator documentId={jobDocumentId} />
        )}
      </div>
    </div>
  );
}

export default CitationWorkflow;
