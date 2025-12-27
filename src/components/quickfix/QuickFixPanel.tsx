import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Wrench, X, Eye, Play, Edit3, SkipForward, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import DOMPurify from 'dompurify';
import { cn } from '@/utils/cn';
import { getQuickFixTemplate } from '@/data/quickFixTemplates';
import { 
  generateFixPreview, 
  applyQuickFix, 
  validateInputs, 
  getDefaultInputValues 
} from '@/utils/quickFixUtils';
import type { QuickFix, QuickFixContext, QuickFixPreview, QuickFixInput } from '@/types/quickfix.types';
import { QuickFixCheckboxGroup } from './QuickFixCheckboxGroup';
import { QuickFixRadioGroup } from './QuickFixRadioGroup';
import { QuickFixTextInput } from './QuickFixTextInput';
import { QuickFixColorPicker } from './QuickFixColorPicker';

interface QuickFixPanelProps {
  issue: {
    id: string;
    code: string;
    message: string;
    location?: string;
    filePath?: string;
    currentContent?: string;
    lineNumber?: number;
  };
  jobId?: string;
  onApplyFix: (fix: QuickFix) => Promise<void>;
  onEditManually?: () => void;
  onSkip?: () => void;
  onClose?: () => void;
}

type ToastState = {
  type: 'success' | 'error';
  message: string;
} | null;

export function QuickFixPanel({
  issue,
  jobId,
  onApplyFix,
  onEditManually,
  onSkip,
  onClose,
}: QuickFixPanelProps) {
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [template, setTemplate] = useState<ReturnType<typeof getQuickFixTemplate> | undefined>(() => getQuickFixTemplate(issue.code));
  const [asyncData, setAsyncData] = useState<Record<string, unknown> | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [inputValues, setInputValues] = useState<Record<string, unknown>>(() => 
    template ? getDefaultInputValues(template) : {}
  );
  const [showPreview, setShowPreview] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const context: QuickFixContext = useMemo(() => ({
    issueId: issue.id,
    issueCode: issue.code,
    currentContent: issue.currentContent,
    filePath: issue.filePath,
    lineNumber: issue.lineNumber,
    elementContext: issue.location,
    jobId,
    issueMessage: issue.message,
    ...asyncData,
  }), [issue, jobId, asyncData]);

  useEffect(() => {
    async function loadTemplateData() {
      const tpl = getQuickFixTemplate(issue.code);
      console.log('QuickFixPanel: template for', issue.code, ':', tpl?.id);
      if (!tpl) {
        setTemplate(undefined);
        return;
      }
      
      setTemplate(tpl);
      
      if (tpl.requiresAsyncData && tpl.loadAsyncData) {
        console.log('QuickFixPanel: template requires async data, jobId:', jobId);
        if (!jobId) {
          console.warn('QuickFixPanel: no jobId provided for async template');
          setLoadError('Missing job ID for loading data');
          return;
        }
        setIsLoadingData(true);
        setLoadError(null);
        
        try {
          const data = await tpl.loadAsyncData({
            issueId: issue.id,
            issueCode: issue.code,
            currentContent: issue.currentContent,
            filePath: issue.filePath,
            lineNumber: issue.lineNumber,
            elementContext: issue.location,
            jobId,
            issueMessage: issue.message,
          });
          console.log('QuickFixPanel: async data loaded:', data);
          setAsyncData(data);
        } catch (error) {
          console.error('QuickFixPanel: Failed to load template data:', error);
          setLoadError('Failed to load Quick Fix data');
        } finally {
          setIsLoadingData(false);
        }
      }
    }
    
    loadTemplateData();
  }, [issue.code, issue.id, issue.filePath, issue.currentContent, issue.lineNumber, issue.location, issue.message, jobId]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const inputFields = useMemo(() => {
    if (!template) return [];
    
    if (template.getInputFields) {
      return template.getInputFields(context);
    }
    
    return template.inputs || [];
  }, [template, context]);

  useEffect(() => {
    if (inputFields.length > 0 && Object.keys(inputValues).length === 0) {
      const defaults: Record<string, unknown> = {};
      inputFields.forEach(field => {
        if (field.default !== undefined) {
          defaults[field.id] = field.default;
        }
      });
      if (Object.keys(defaults).length > 0) {
        setInputValues(prev => ({ ...defaults, ...prev }));
      }
    }
  }, [inputFields, inputValues]);

  const preview: QuickFixPreview | null = useMemo(() => {
    if (!template || !showPreview) return null;
    try {
      return generateFixPreview(template, inputValues, context);
    } catch {
      return null;
    }
  }, [template, inputValues, context, showPreview]);

  const handleInputChange = useCallback((inputId: string, value: unknown) => {
    setInputValues(prev => ({ ...prev, [inputId]: value }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[inputId];
      return newErrors;
    });
  }, []);

  const handleApplyFix = async () => {
    if (!template) return;

    const validation = validateInputs(template, inputValues);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setIsApplying(true);
    setToast(null);

    try {
      const fix = applyQuickFix(template, inputValues, context);
      await onApplyFix(fix);
      setToast({ type: 'success', message: 'Fix applied successfully!' });
      closeTimeoutRef.current = setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to apply fix';
      setToast({ type: 'error', message });
    } finally {
      setIsApplying(false);
    }
  };

  const renderInput = (input: QuickFixInput) => {
    const value = inputValues[input.id];
    const error = errors[input.id];

    switch (input.type) {
      case 'checkbox-group':
        return (
          <QuickFixCheckboxGroup
            key={input.id}
            id={input.id}
            label={input.label}
            options={input.options ?? []}
            value={(value as string[]) ?? []}
            onChange={(v) => handleInputChange(input.id, v)}
            helpText={input.helpText}
            error={error}
          />
        );
      case 'radio-group':
        return (
          <QuickFixRadioGroup
            key={input.id}
            id={input.id}
            label={input.label}
            options={input.options ?? []}
            value={(value as string) ?? ''}
            onChange={(v) => handleInputChange(input.id, v)}
            helpText={input.helpText}
            error={error}
          />
        );
      case 'text':
        return (
          <QuickFixTextInput
            key={input.id}
            id={input.id}
            label={input.label}
            value={(value as string) ?? ''}
            onChange={(v) => handleInputChange(input.id, v)}
            placeholder={input.placeholder}
            required={input.required}
            helpText={input.helpText}
            error={error}
          />
        );
      case 'textarea':
        return (
          <QuickFixTextInput
            key={input.id}
            id={input.id}
            label={input.label}
            value={(value as string) ?? ''}
            onChange={(v) => handleInputChange(input.id, v)}
            placeholder={input.placeholder}
            multiline
            required={input.required}
            helpText={input.helpText}
            error={error}
          />
        );
      case 'color-picker':
        return (
          <QuickFixColorPicker
            key={input.id}
            id={input.id}
            label={input.label}
            value={(value as string) ?? '#000000'}
            onChange={(v) => handleInputChange(input.id, v)}
            showContrastRatio
            helpText={input.helpText}
            error={error}
          />
        );
      default:
        return null;
    }
  };

  if (isLoadingData) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
          <span className="text-gray-600">Loading Quick Fix options...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>{loadError}</span>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Wrench className="h-5 w-5 text-gray-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Quick Fix</h3>
            <p className="text-sm text-gray-500">No quick fix available for this issue</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-auto p-1 text-gray-400 hover:text-gray-600 rounded"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Issue code <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">{issue.code}</code> requires manual remediation.
        </p>
        
        <div className="flex gap-2">
          {onEditManually && (
            <button
              onClick={onEditManually}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Edit3 className="h-4 w-4" />
              Edit Manually
            </button>
          )}
          {onSkip && (
            <button
              onClick={onSkip}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <SkipForward className="h-4 w-4" />
              Skip
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 p-4 border-b border-gray-200">
        <div className="p-2 bg-primary-100 rounded-lg">
          <Wrench className="h-5 w-5 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{template.title}</h3>
          <p className="text-sm text-gray-500 truncate">{template.description}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Issue:</span> {issue.message}
          </p>
          {issue.location && (
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-medium">Location:</span> {issue.location}
            </p>
          )}
        </div>

        {inputFields.length > 0 && (
          <div className="space-y-4">
            {inputFields.map(renderInput)}
          </div>
        )}

        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          <Eye className="h-4 w-4" />
          {showPreview ? 'Hide Preview' : 'Preview Changes'}
        </button>

        {showPreview && preview && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">Code Changes</span>
            </div>
            <div 
              className="p-3 bg-gray-900 text-sm font-mono overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(preview.diff) }}
            />
            <style>{`
              .diff-container { white-space: pre-wrap; }
              .diff-add { display: block; color: #22c55e; }
              .diff-remove { display: block; color: #ef4444; }
            `}</style>
          </div>
        )}

        {toast && (
          <div
            className={cn(
              'flex items-center gap-2 p-3 rounded-lg',
              toast.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            )}
            role="alert"
          >
            {toast.type === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="text-sm">{toast.message}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 p-4 border-t border-gray-200 bg-gray-50">
        <button
          onClick={handleApplyFix}
          disabled={isApplying}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
            'bg-primary-600 text-white hover:bg-primary-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isApplying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isApplying ? 'Applying...' : 'Apply Fix'}
        </button>
        
        {onEditManually && (
          <button
            onClick={onEditManually}
            disabled={isApplying}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <Edit3 className="h-4 w-4" />
            Edit Manually
          </button>
        )}
        
        {onSkip && (
          <button
            onClick={onSkip}
            disabled={isApplying}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            <SkipForward className="h-4 w-4" />
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

export default QuickFixPanel;
