import { useState } from 'react';
import { CheckCircle, XCircle, FileCheck } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { CriterionRow } from './CriterionRow';
import { 
  useAcrDocument, 
  useUpdateCriterion, 
  useGenerateRemarks,
  useCredibilityValidation,
  useCanFinalize,
  useFinalizeDocument,
} from '@/hooks/useAcrEditor';
import type { 
  AcrCriterion,
  AcrDocument, 
  ConformanceLevel, 
  CredibilityValidation,
  FinalizationStatus,
} from '@/types/acr.types';

interface AcrEditorProps {
  jobId: string;
  onFinalized?: () => void;
}

const MOCK_DOCUMENT: AcrDocument = {
  id: 'doc-1',
  jobId: 'test-job-123',
  productName: 'Sample Educational Content',
  editionId: 'VPAT2.5-508',
  editionName: 'VPAT 2.5 Section 508',
  status: 'draft',
  createdAt: '2024-12-01',
  updatedAt: '2024-12-15',
  criteria: [
    {
      id: 'c1',
      criterionId: '1.1.1',
      criterionName: 'Non-text Content',
      wcagLevel: 'A',
      conformanceLevel: 'supports',
      remarks: 'All images include descriptive alt text. Decorative images use empty alt attributes.',
      attribution: 'AUTOMATED',
      isSuspicious: false,
    },
    {
      id: 'c2',
      criterionId: '1.2.1',
      criterionName: 'Audio-only and Video-only',
      wcagLevel: 'A',
      conformanceLevel: 'supports',
      remarks: 'Transcripts are provided for all audio-only content.',
      attribution: 'AI-SUGGESTED',
      isSuspicious: false,
    },
    {
      id: 'c3',
      criterionId: '1.3.1',
      criterionName: 'Info and Relationships',
      wcagLevel: 'A',
      conformanceLevel: 'partially_supports',
      remarks: 'Most structural relationships are conveyed through markup, except for some data tables.',
      attribution: 'HUMAN-VERIFIED',
      isSuspicious: false,
    },
    {
      id: 'c4',
      criterionId: '1.4.1',
      criterionName: 'Use of Color',
      wcagLevel: 'A',
      conformanceLevel: 'does_not_support',
      remarks: 'Color is used as the only visual means of conveying information in form error states.',
      attribution: 'AUTOMATED',
      isSuspicious: false,
    },
    {
      id: 'c5',
      criterionId: '1.4.3',
      criterionName: 'Contrast (Minimum)',
      wcagLevel: 'AA',
      conformanceLevel: 'supports',
      remarks: '',
      attribution: 'AUTOMATED',
      isSuspicious: true,
    },
    {
      id: 'c6',
      criterionId: '2.1.1',
      criterionName: 'Keyboard',
      wcagLevel: 'A',
      conformanceLevel: 'supports',
      remarks: 'All functionality is operable through keyboard interface.',
      attribution: 'HUMAN-VERIFIED',
      isSuspicious: false,
    },
    {
      id: 'c7',
      criterionId: '2.4.1',
      criterionName: 'Bypass Blocks',
      wcagLevel: 'A',
      conformanceLevel: 'not_applicable',
      remarks: 'Content is single-page without repeated blocks.',
      attribution: 'AUTOMATED',
      isSuspicious: false,
    },
  ],
};

const MOCK_CREDIBILITY: CredibilityValidation = {
  isCredible: false,
  supportsPercentage: 71,
  warnings: ['High percentage of "Supports" determinations may need review'],
  suspiciousCriteria: ['1.4.3'],
};

const MOCK_FINALIZATION: FinalizationStatus = {
  canFinalize: false,
  blockers: [
    'Missing remarks for criterion 1.4.3',
    '1 suspicious entry requires review',
  ],
  pendingCount: 0,
  missingRemarksCount: 1,
};

export function AcrEditor({ jobId, onFinalized }: AcrEditorProps) {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [localDocument, setLocalDocument] = useState<AcrDocument>(MOCK_DOCUMENT);
  const [localCredibility, setLocalCredibility] = useState<CredibilityValidation>(MOCK_CREDIBILITY);
  const [localFinalization, setLocalFinalization] = useState<FinalizationStatus>(MOCK_FINALIZATION);
  
  const { data: apiDocument, isLoading: isLoadingDoc, error: docError } = useAcrDocument(jobId);
  const { data: apiCredibility } = useCredibilityValidation(jobId);
  const { data: apiFinalization } = useCanFinalize(jobId);
  const updateMutation = useUpdateCriterion(jobId);
  const generateMutation = useGenerateRemarks();
  const finalizeMutation = useFinalizeDocument(jobId);

  const document = apiDocument ?? localDocument;
  const credibility = apiCredibility ?? localCredibility;
  const finalization = apiFinalization ?? localFinalization;
  const useMockData = !apiDocument && !!docError;

  const handleUpdateConformance = (criterionId: string, level: ConformanceLevel) => {
    if (useMockData) {
      setLocalDocument(prev => ({
        ...prev,
        criteria: prev.criteria.map(c =>
          c.id === criterionId ? { ...c, conformanceLevel: level, attribution: 'HUMAN-VERIFIED' as const } : c
        ),
      }));
      updateCredibilityAndFinalization();
    } else {
      updateMutation.mutate({
        criterionId,
        data: { conformanceLevel: level, attribution: 'HUMAN-VERIFIED' },
      });
    }
  };

  const handleUpdateRemarks = (criterionId: string, remarks: string) => {
    if (useMockData) {
      setLocalDocument(prev => ({
        ...prev,
        criteria: prev.criteria.map(c =>
          c.id === criterionId ? { ...c, remarks, attribution: 'HUMAN-VERIFIED' as const } : c
        ),
      }));
      updateCredibilityAndFinalization();
    } else {
      updateMutation.mutate({
        criterionId,
        data: { remarks, attribution: 'HUMAN-VERIFIED' },
      });
    }
  };

  const handleGenerateRemarks = async (criterion: AcrCriterion) => {
    setGeneratingId(criterion.id);
    
    if (useMockData) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const generatedRemarks = getGeneratedRemarks(criterion);
      setLocalDocument(prev => ({
        ...prev,
        criteria: prev.criteria.map(c =>
          c.id === criterion.id ? { ...c, remarks: generatedRemarks, attribution: 'AI-SUGGESTED' as const } : c
        ),
      }));
      updateCredibilityAndFinalization();
    } else {
      try {
        const result = await generateMutation.mutateAsync({
          criterionId: criterion.criterionId,
          conformanceLevel: criterion.conformanceLevel,
        });
        updateMutation.mutate({
          criterionId: criterion.id,
          data: { remarks: result.remarks, attribution: 'AI-SUGGESTED' },
        });
      } catch {
        // Handle error
      }
    }
    
    setGeneratingId(null);
  };

  const updateCredibilityAndFinalization = () => {
    const supportsCount = localDocument.criteria.filter(c => c.conformanceLevel === 'supports').length;
    const supportsPercentage = Math.round((supportsCount / localDocument.criteria.length) * 100);
    const missingRemarks = localDocument.criteria.filter(c => !c.remarks.trim()).length;
    const suspiciousCount = localDocument.criteria.filter(c => c.isSuspicious).length;
    
    setLocalCredibility({
      isCredible: supportsPercentage <= 95,
      supportsPercentage,
      warnings: supportsPercentage > 95 ? ['High percentage of "Supports" determinations may need review'] : [],
      suspiciousCriteria: localDocument.criteria.filter(c => c.isSuspicious).map(c => c.criterionId),
    });
    
    const blockers: string[] = [];
    if (missingRemarks > 0) blockers.push(`${missingRemarks} criteria missing remarks`);
    if (suspiciousCount > 0) blockers.push(`${suspiciousCount} suspicious entries require review`);
    
    setLocalFinalization({
      canFinalize: blockers.length === 0,
      blockers,
      pendingCount: 0,
      missingRemarksCount: missingRemarks,
    });
  };

  const handleFinalize = async () => {
    if (useMockData) {
      setLocalDocument(prev => ({ ...prev, status: 'final' }));
      onFinalized?.();
    } else {
      await finalizeMutation.mutateAsync();
      onFinalized?.();
    }
  };

  if (isLoadingDoc && !docError) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{document.productName}</h2>
            <p className="text-sm text-gray-500">{document.editionName} - {document.criteria.length} criteria</p>
          </div>
          <div className="flex items-center gap-2">
            {useMockData && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">Demo Mode</span>
            )}
            <span className={cn(
              'px-2 py-1 rounded text-xs font-medium',
              document.status === 'draft' && 'bg-gray-100 text-gray-600',
              document.status === 'review' && 'bg-yellow-100 text-yellow-700',
              document.status === 'final' && 'bg-green-100 text-green-700'
            )}>
              {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {!credibility.isCredible && (
        <Alert variant="warning" title="Credibility Warning">
          <p>{credibility.supportsPercentage}% of criteria are marked as "Supports". This high percentage may raise questions about the thoroughness of the evaluation.</p>
          {credibility.suspiciousCriteria.length > 0 && (
            <p className="mt-1">Suspicious entries: {credibility.suspiciousCriteria.join(', ')}</p>
          )}
        </Alert>
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Conformance Criteria</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Criterion</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conformance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              </tr>
            </thead>
            <tbody>
              {document.criteria.map((criterion) => (
                <CriterionRow
                  key={criterion.id}
                  criterion={criterion}
                  onUpdateConformance={(level) => handleUpdateConformance(criterion.id, level)}
                  onUpdateRemarks={(remarks) => handleUpdateRemarks(criterion.id, remarks)}
                  onGenerateRemarks={() => handleGenerateRemarks(criterion)}
                  isGeneratingRemarks={generatingId === criterion.id}
                  disabled={document.status === 'final'}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Finalization Status
            </h3>
            {finalization.canFinalize ? (
              <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
                <CheckCircle className="h-4 w-4" />
                Ready to finalize
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                {finalization.blockers.map((blocker, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-red-600 text-sm">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    {blocker}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <Button
            onClick={handleFinalize}
            disabled={!finalization.canFinalize || document.status === 'final' || finalizeMutation.isPending}
            isLoading={finalizeMutation.isPending}
          >
            Mark as Final
          </Button>
        </div>
      </div>
    </div>
  );
}

function getGeneratedRemarks(criterion: AcrCriterion): string {
  const templates: Record<ConformanceLevel, string[]> = {
    supports: [
      `All ${criterion.criterionName.toLowerCase()} requirements are fully met.`,
      `The content fully supports ${criterion.criterionId} requirements.`,
    ],
    partially_supports: [
      `Most ${criterion.criterionName.toLowerCase()} requirements are met, except for minor issues.`,
      `The content partially supports ${criterion.criterionId}, with some exceptions noted.`,
    ],
    does_not_support: [
      `The ${criterion.criterionName.toLowerCase()} requirement has an accessibility issue that prevents conformance.`,
      `There is an accessibility barrier related to ${criterion.criterionId}.`,
    ],
    not_applicable: [
      `${criterion.criterionName} is not applicable to this content.`,
      `This criterion does not apply to the content being evaluated.`,
    ],
  };
  
  const options = templates[criterion.conformanceLevel];
  return options[Math.floor(Math.random() * options.length)];
}
