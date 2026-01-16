import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { api } from '@/services/api';

interface TransferToAcrButtonProps {
  jobId: string;
  pendingCount: number;
  isDemo?: boolean;
}

export const TransferToAcrButton: React.FC<TransferToAcrButtonProps> = ({
  jobId,
  pendingCount,
  isDemo = false,
}) => {
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferred, setTransferred] = useState(false);
  const [acrWorkflowId, setAcrWorkflowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleTransfer = async () => {
    if (pendingCount === 0) return;

    setIsTransferring(true);
    setError(null);

    try {
      if (isDemo) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const demoAcrId = `acr-${jobId}-${Date.now()}`;
        setAcrWorkflowId(demoAcrId);
        setTransferred(true);
      } else {
        const response = await api.post(`/epub/job/${jobId}/transfer-to-acr`);
        const data = response.data.data || response.data;
        setAcrWorkflowId(data.acrWorkflowId || data.id);
        setTransferred(true);
      }
    } catch (err) {
      console.error('Transfer failed:', err);
      setError('Failed to transfer tasks. Please try again.');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleGoToAcr = () => {
    if (acrWorkflowId) {
      navigate(`/acr/workflow/${acrWorkflowId}`);
    } else {
      navigate('/acr');
    }
  };

  if (pendingCount === 0) {
    return null;
  }

  if (transferred) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 text-green-700">
            <FileCheck className="h-6 w-6 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{pendingCount} tasks transferred to ACR Workflow</p>
              <p className="text-sm text-green-600">
                Document these manual fixes in your Accessibility Conformance Report
              </p>
            </div>
          </div>
          <Button
            onClick={handleGoToAcr}
            variant="outline"
            size="sm"
            className="mt-3 text-green-700 border-green-300 hover:bg-green-100"
          >
            Go to ACR Workflow
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleTransfer}
        disabled={isTransferring}
        className="w-full bg-purple-600 hover:bg-purple-700"
        size="lg"
      >
        <ArrowRight className="h-5 w-5 mr-2" />
        {isTransferring
          ? 'Transferring...'
          : `Send ${pendingCount} Pending Tasks to ACR Workflow`}
      </Button>
      <p className="text-xs text-gray-500 text-center">
        Transfer unresolved issues to the ACR workflow for documentation and reporting
      </p>
      
      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
