import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  AlertTriangle,
  Loader2,
  Play
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

type StepStatus = 'pending' | 'in_progress' | 'completed' | 'error' | 'not_started';

interface CitationWorkflowChecklistProps {
  documentId?: string;
  fileName?: string;
  citationDetectionStatus?: StepStatus;
  citationCount?: number;
  validationStatus?: StepStatus;
  validationErrorCount?: number;
  validationWarningCount?: number;
  referenceListStatus?: StepStatus;
  referenceCount?: number;
  onRunDetection?: () => void;
  isRunningDetection?: boolean;
}

interface Step {
  id: string;
  label: string;
  status: StepStatus;
  description: string;
  details?: string;
  expandable?: boolean;
  actionLabel?: string;
  actionPath?: string;
}

export function CitationWorkflowChecklist({
  documentId,
  fileName,
  citationDetectionStatus = 'not_started',
  citationCount = 0,
  validationStatus = 'not_started',
  validationErrorCount = 0,
  validationWarningCount = 0,
  referenceListStatus = 'not_started',
  referenceCount = 0,
  onRunDetection,
  isRunningDetection = false,
}: CitationWorkflowChecklistProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const steps: Step[] = [
    {
      id: 'detection',
      label: 'Detect Citations',
      status: citationDetectionStatus,
      description: 'Automatically identify citations in your document',
      details: citationCount > 0 
        ? `${citationCount} citations detected` 
        : 'No citations detected yet',
      expandable: false,
    },
    {
      id: 'validation',
      label: 'Validate Format',
      status: validationStatus,
      description: 'Check citations against style guide rules',
      details: validationStatus === 'completed'
        ? `${validationErrorCount} errors, ${validationWarningCount} warnings`
        : 'Validation not started',
      expandable: true,
      actionLabel: 'Validate',
      actionPath: documentId ? `/citation/${documentId}?tab=validation` : undefined,
    },
    {
      id: 'references',
      label: 'Generate References',
      status: referenceListStatus,
      description: 'Create formatted bibliography',
      details: referenceCount > 0
        ? `${referenceCount} references generated`
        : 'Reference list not generated',
      expandable: true,
      actionLabel: 'Generate',
      actionPath: documentId ? `/citation/${documentId}?tab=references` : undefined,
    },
  ];

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  const toggleExpand = (stepId: string) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-600" aria-hidden="true" />
          <h3 className="font-semibold text-gray-900">Citation Workflow</h3>
        </div>
        {fileName && (
          <span className="text-sm text-gray-500 truncate max-w-[200px]" title={fileName}>
            {fileName}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div 
            key={step.id}
            className={cn(
              'border rounded-lg transition-colors',
              step.status === 'completed' && 'border-green-200 bg-green-50/50',
              step.status === 'in_progress' && 'border-blue-200 bg-blue-50/50',
              step.status === 'error' && 'border-red-200 bg-red-50/50',
              !['completed', 'in_progress', 'error'].includes(step.status) && 'border-gray-200'
            )}
          >
            <div 
              className={cn(
                'flex items-center gap-3 p-3',
                step.expandable && 'cursor-pointer'
              )}
              onClick={() => step.expandable && toggleExpand(step.id)}
              role={step.expandable ? 'button' : undefined}
              aria-expanded={step.expandable ? expandedStep === step.id : undefined}
            >
              <span className="text-sm font-medium text-gray-400 w-5">
                {index + 1}.
              </span>
              {getStatusIcon(step.status)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{step.label}</p>
                <p className="text-sm text-gray-500 truncate">{step.description}</p>
              </div>
              
              {step.id === 'detection' && onRunDetection && citationDetectionStatus !== 'completed' && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRunDetection();
                  }}
                  disabled={isRunningDetection || citationDetectionStatus === 'in_progress'}
                >
                  {isRunningDetection || citationDetectionStatus === 'in_progress' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" aria-hidden="true" />
                      Detect
                    </>
                  )}
                </Button>
              )}
              
              {step.expandable && (
                expandedStep === step.id 
                  ? <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  : <ChevronRight className="h-5 w-5 text-gray-400" aria-hidden="true" />
              )}
            </div>
            
            {step.expandable && expandedStep === step.id && (
              <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                <div className="pl-12 pt-3">
                  <p className="text-sm text-gray-600 mb-3">{step.details}</p>
                  {step.actionPath && documentId && (
                    <Link to={step.actionPath}>
                      <Button size="sm" variant="outline">
                        {step.actionLabel}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {documentId && citationDetectionStatus === 'completed' && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Link to={`/citation/${documentId}`}>
            <Button variant="primary" className="w-full">
              Open Full Citation Workflow
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
