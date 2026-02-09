import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle, Clock, FileText, Loader2, ArrowLeft } from 'lucide-react';

interface AcrWorkflow {
  acrWorkflowId: string;
  epubFileName: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt?: string;
}

interface BatchAcrListProps {
  batchId: string;
  acrWorkflowIds: string[];
  fileNames?: string[];
  generatedAt?: string;
  workflowDetails?: AcrWorkflow[];
}

export function BatchAcrList({
  batchId,
  acrWorkflowIds,
  fileNames = [],
  generatedAt,
  workflowDetails,
}: BatchAcrListProps) {
  const navigate = useNavigate();

  const acrWorkflows: AcrWorkflow[] = useMemo(() => {
    return workflowDetails ?? acrWorkflowIds.map((id, index) => {
      // Type guard for safe array access
      const fileName = Array.isArray(fileNames) ? fileNames[index] : undefined;
      // Safe fallback: check id length before slicing
      const idPreview = id && id.length >= 8 ? id.slice(0, 8) : id || 'unknown';
      const displayName = fileName 
        ? fileName 
        : `Unknown File (ID: ${idPreview}...)`;
      return {
        acrWorkflowId: id,
        epubFileName: displayName,
        status: 'pending' as const,
      };
    });
  }, [workflowDetails, acrWorkflowIds, fileNames]);

  const handleVerify = (acrWorkflowId: string, fileName: string) => {
    navigate(`/acr/verification/${acrWorkflowId}`, {
      state: { 
        fileName,
        acrWorkflowId,
        batchId,
      },
    });
  };

  const getStatusBadge = (status: AcrWorkflow['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="success">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="warning">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge variant="default">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ACR Workflows Created</h2>
          <p className="text-gray-600 mt-1">
            Successfully created {acrWorkflowIds.length} ACR workflow{acrWorkflowIds.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="outline"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/batches')}
        >
          Back to Batch
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Batch Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Source Batch ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{batchId}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Generated At</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {generatedAt
                  ? new Date(generatedAt).toLocaleString()
                  : 'Just now'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="p-0">
        <CardHeader className="px-6 pt-6">
          <CardTitle>Individual ACR Workflows ({acrWorkflowIds.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    ACR ID
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    EPUB File
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {acrWorkflows.map((workflow) => (
                  <tr key={workflow.acrWorkflowId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {workflow.acrWorkflowId.length > 12
                        ? `${workflow.acrWorkflowId.slice(0, 12)}...`
                        : workflow.acrWorkflowId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                        <span className="truncate max-w-xs" title={workflow.epubFileName}>
                          {workflow.epubFileName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(workflow.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Button
                        size="sm"
                        onClick={() => handleVerify(workflow.acrWorkflowId, workflow.epubFileName)}
                      >
                        Verify
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {acrWorkflows.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No ACR workflows found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
