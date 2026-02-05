import { useState } from 'react';
import { FileCheck, Loader2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StyleSelector } from './StyleSelector';
import { ValidationSummary } from './ValidationSummary';
import { ViolationCard } from './ViolationCard';
import { BatchCorrectionModal } from '../correction/BatchCorrectionModal';
import {
  useCitationStyles,
  useValidateDocument,
  useValidations,
  useAcceptValidation,
  useRejectValidation,
  useEditValidation,
  useBatchCorrect
} from '@/hooks/useCitationValidation';
import type { ValidationResult } from '@/types/citation-validation.types';

interface ValidationPanelProps {
  documentId: string;
}

export function ValidationPanel({ documentId }: ValidationPanelProps) {
  const [selectedStyle, setSelectedStyle] = useState('apa7');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const { data: styles = [] } = useCitationStyles();
  const { data: validations = [] } = useValidations(documentId);
  const validateMutation = useValidateDocument();
  const acceptMutation = useAcceptValidation();
  const rejectMutation = useRejectValidation();
  const editMutation = useEditValidation();
  const batchMutation = useBatchCorrect();

  const handleValidate = async () => {
    if (!documentId) {
      console.error('No documentId available - job may still be loading');
      return;
    }
    console.log('Validating citations for documentId:', documentId);
    const result = await validateMutation.mutateAsync({
      documentId,
      request: { styleCode: selectedStyle }
    });
    setValidationResult(result);
  };

  const pendingViolations = validations.filter(v => v.status === 'pending');
  const resolvedViolations = validations.filter(v => v.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Citation Validation</h2>
          <p className="text-sm text-gray-500">
            Check citations against style guide rules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StyleSelector
            styles={styles}
            selected={selectedStyle}
            onChange={setSelectedStyle}
            disabled={validateMutation.isPending}
          />
          <Button
            onClick={handleValidate}
            disabled={validateMutation.isPending}
          >
            {validateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                Validating...
              </>
            ) : (
              <>
                <FileCheck className="h-4 w-4 mr-2" aria-hidden="true" />
                Validate All
              </>
            )}
          </Button>
        </div>
      </div>

      {validationResult && (
        <ValidationSummary data={validationResult.summary} />
      )}

      {pendingViolations.length > 1 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => setShowBatchModal(true)}
          >
            <Layers className="h-4 w-4 mr-2" aria-hidden="true" />
            Batch Correct ({pendingViolations.length})
          </Button>
        </div>
      )}

      {pendingViolations.length > 0 && (
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-3">
            Issues to Review ({pendingViolations.length})
          </h3>
          <div className="space-y-3">
            {pendingViolations.map((violation) => (
              <ViolationCard
                key={violation.id}
                violation={violation}
                onAccept={() => acceptMutation.mutate(violation.id)}
                onReject={() => rejectMutation.mutate({ validationId: violation.id })}
                onEdit={(text) => editMutation.mutate({ validationId: violation.id, correctedText: text })}
                isLoading={acceptMutation.isPending || rejectMutation.isPending || editMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {resolvedViolations.length > 0 && (
        <div>
          <h3 className="text-md font-medium text-gray-500 mb-3">
            Resolved ({resolvedViolations.length})
          </h3>
          <div className="space-y-3">
            {resolvedViolations.map((violation) => (
              <ViolationCard
                key={violation.id}
                violation={violation}
                onAccept={() => {}}
                onReject={() => {}}
                onEdit={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {!validationResult && validations.length === 0 && (
        <Card className="p-8 text-center">
          <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No validation results yet
          </h3>
          <p className="text-gray-500 mb-4">
            Select a citation style and click "Validate All" to check your citations.
          </p>
        </Card>
      )}

      <BatchCorrectionModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        violations={pendingViolations}
        onApplyByType={async (violationType) => {
          await batchMutation.mutateAsync({ documentId, violationType, applyAll: true });
        }}
      />
    </div>
  );
}
