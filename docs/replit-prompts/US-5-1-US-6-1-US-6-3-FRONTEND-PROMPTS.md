# Citation Feature - Frontend Replit Prompts

> **User Stories**: US-5.1, US-6.1, US-6.3
> **Branch**: `feature/citation/US-4-1-US-4-2-frontend` (existing, not yet pushed)
> **Repository**: ninja-frontend
> **Prerequisites**: Complete backend prompts first, US-4.1 and US-4.2 already on this branch

---

## Table of Contents

0. [Git Setup](#git-setup)
1. [US-5.1: Citation Format Validation](#us-51-citation-format-validation)
   - 5.1.5: Validation Types
   - 5.1.6: Validation Service
   - 5.1.7: Validation Hooks
   - 5.1.8: Validation UI Components
2. [US-6.1: Citation Format Correction](#us-61-citation-format-correction)
   - 6.1.3: Batch Correction Modal
3. [US-6.3: Reference List Generation](#us-63-reference-list-generation)
   - 6.3.4: Reference List Types & Service
   - 6.3.5: Reference List Hooks
   - 6.3.6: Reference List UI Components

---

# Git Setup

## Step 0: Switch to Existing Feature Branch

You already have the branch `feature/citation/US-4-1-US-4-2-frontend` with US-4.1 and US-4.2 implemented.
Continue working on this branch to add US-5.1, US-6.1, and US-6.3.

Open the Shell tab in Replit and run:

```bash
# Check current branch
git branch

# If not on the feature branch, switch to it
git checkout feature/citation/US-4-1-US-4-2-frontend

# Verify you're on the correct branch
git status
```

### Verify Branch Setup

```bash
git branch
# Should show: * feature/citation/US-4-1-US-4-2-frontend

git log --oneline -5
# Should show your US-4.1 and US-4.2 commits
```

### Commit After Each Prompt (Local Only)

```bash
git add .
git commit -m "feat(citation): <description>"
# DO NOT push yet - we'll push everything together at the end
```

**Example commit messages:**
- `feat(citation): add validation types`
- `feat(citation): add validation service and hooks`
- `feat(citation): add validation UI components`
- `feat(citation): add batch correction modal`
- `feat(citation): add reference list types and service`
- `feat(citation): add reference list UI components`

### Push All Changes (After Completing All Prompts)

Only after completing ALL frontend prompts:

```bash
# Frontend - push all commits
git push -u origin feature/citation/US-4-1-US-4-2-frontend
```

---

# US-5.1: Citation Format Validation

## Frontend Prompt 5.1.5: Validation Types

```
Create TypeScript types for validation at src/types/citation-validation.types.ts.

```typescript
export interface CitationStyle {
  code: string;
  name: string;
  version: string;
}

export interface ValidationViolation {
  id: string;
  citationId: string;
  citationText: string;
  violationType: 'punctuation' | 'capitalization' | 'author_format' | 'date_format' | 'italics' | 'order';
  ruleReference: string;
  ruleName: string;
  explanation: string;
  originalText: string;
  suggestedFix: string;
  correctedCitation: string;
  severity: 'error' | 'warning' | 'info';
  status: 'pending' | 'accepted' | 'rejected' | 'edited';
}

export interface ValidationSummary {
  totalCitations: number;
  validCitations: number;
  citationsWithErrors: number;
  citationsWithWarnings: number;
  errorCount: number;
  warningCount: number;
}

export interface ValidationResult {
  documentId: string;
  styleCode: string;
  styleName: string;
  summary: ValidationSummary;
  violations: ValidationViolation[];
}

export interface ValidateDocumentRequest {
  styleCode: string;
  options?: {
    checkPunctuation?: boolean;
    checkCapitalization?: boolean;
    checkAuthorFormat?: boolean;
    checkDateFormat?: boolean;
    checkItalics?: boolean;
    checkOrder?: boolean;
  };
}
```
```

---

## Frontend Prompt 5.1.6: Validation Service

```
Create the validation API service at src/services/citation-validation.service.ts.

```typescript
import api from './api';
import type {
  CitationStyle,
  ValidationResult,
  ValidationViolation,
  ValidateDocumentRequest
} from '@/types/citation-validation.types';

export const citationValidationService = {
  /**
   * Get available citation styles
   */
  async getStyles(): Promise<CitationStyle[]> {
    const response = await api.get('/citation/styles');
    return response.data.data;
  },

  /**
   * Validate all citations in a document
   */
  async validateDocument(
    documentId: string,
    request: ValidateDocumentRequest
  ): Promise<ValidationResult> {
    const response = await api.post(`/citation/document/${documentId}/validate`, request);
    return response.data.data;
  },

  /**
   * Get validation results for a document
   */
  async getValidations(
    documentId: string,
    filters?: {
      status?: string;
      severity?: string;
      violationType?: string;
    }
  ): Promise<ValidationViolation[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.violationType) params.append('violationType', filters.violationType);

    const response = await api.get(
      `/citation/document/${documentId}/validations?${params.toString()}`
    );
    return response.data.data;
  },

  /**
   * Accept a validation suggestion
   */
  async acceptValidation(validationId: string): Promise<void> {
    await api.post(`/citation/validation/${validationId}/accept`);
  },

  /**
   * Reject a validation (mark as intentional)
   */
  async rejectValidation(validationId: string, reason?: string): Promise<void> {
    await api.post(`/citation/validation/${validationId}/reject`, { reason });
  },

  /**
   * Apply a manual edit to a validation
   */
  async editValidation(validationId: string, correctedText: string): Promise<void> {
    await api.post(`/citation/validation/${validationId}/edit`, { correctedText });
  },

  /**
   * Batch correct multiple validations
   */
  async batchCorrect(
    documentId: string,
    validationIds: string[]
  ): Promise<{ correctedCount: number; skippedCount: number }> {
    const response = await api.post(`/citation/document/${documentId}/correct/batch`, {
      validationIds
    });
    return response.data.data;
  }
};
```
```

---

## Frontend Prompt 5.1.7: Validation Hooks

```
Create React Query hooks for validation at src/hooks/useCitationValidation.ts.

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { citationValidationService } from '@/services/citation-validation.service';
import type { ValidateDocumentRequest } from '@/types/citation-validation.types';
import toast from 'react-hot-toast';

export function useCitationStyles() {
  return useQuery({
    queryKey: ['citation-styles'],
    queryFn: () => citationValidationService.getStyles(),
    staleTime: Infinity // Styles don't change often
  });
}

export function useValidateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      request
    }: {
      documentId: string;
      request: ValidateDocumentRequest;
    }) => citationValidationService.validateDocument(documentId, request),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['citation-validations', variables.documentId]
      });
      toast.success(`Validation complete: ${data.summary.errorCount} errors, ${data.summary.warningCount} warnings`);
    },
    onError: (error) => {
      toast.error('Validation failed');
      console.error(error);
    }
  });
}

export function useValidations(documentId: string, filters?: {
  status?: string;
  severity?: string;
  violationType?: string;
}) {
  return useQuery({
    queryKey: ['citation-validations', documentId, filters],
    queryFn: () => citationValidationService.getValidations(documentId, filters),
    enabled: !!documentId
  });
}

export function useAcceptValidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (validationId: string) =>
      citationValidationService.acceptValidation(validationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citation-validations'] });
      toast.success('Correction applied');
    },
    onError: () => {
      toast.error('Failed to apply correction');
    }
  });
}

export function useRejectValidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ validationId, reason }: { validationId: string; reason?: string }) =>
      citationValidationService.rejectValidation(validationId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citation-validations'] });
      toast.success('Marked as intentional');
    }
  });
}

export function useEditValidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ validationId, correctedText }: { validationId: string; correctedText: string }) =>
      citationValidationService.editValidation(validationId, correctedText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citation-validations'] });
      toast.success('Edit saved');
    }
  });
}

export function useBatchCorrect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, validationIds }: { documentId: string; validationIds: string[] }) =>
      citationValidationService.batchCorrect(documentId, validationIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['citation-validations'] });
      toast.success(`Applied ${data.correctedCount} corrections`);
    },
    onError: () => {
      toast.error('Batch correction failed');
    }
  });
}
```
```

---

## Frontend Prompt 5.1.8: Validation UI Components

```
Create the validation UI components.

First, create the folder structure:
src/components/citation/validation/

Create StyleSelector.tsx:

```tsx
import { ChevronDown } from 'lucide-react';
import type { CitationStyle } from '@/types/citation-validation.types';

interface StyleSelectorProps {
  styles: CitationStyle[];
  selected: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export function StyleSelector({ styles, selected, onChange, disabled }: StyleSelectorProps) {
  return (
    <div className="relative">
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
      >
        {styles.map((style) => (
          <option key={style.code} value={style.code}>
            {style.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
    </div>
  );
}
```

Create ValidationSummary.tsx:

```tsx
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { ValidationSummary as ValidationSummaryType } from '@/types/citation-validation.types';

interface ValidationSummaryProps {
  data: ValidationSummaryType;
}

export function ValidationSummary({ data }: ValidationSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <span className="text-blue-600 font-semibold">#</span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-semibold">{data.totalCitations}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Valid</p>
            <p className="text-2xl font-semibold text-green-600">{data.validCitations}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Errors</p>
            <p className="text-2xl font-semibold text-red-600">{data.errorCount}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Warnings</p>
            <p className="text-2xl font-semibold text-yellow-600">{data.warningCount}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

Create ViolationCard.tsx:

```tsx
import { useState } from 'react';
import { Check, X, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import type { ValidationViolation } from '@/types/citation-validation.types';

interface ViolationCardProps {
  violation: ValidationViolation;
  onAccept: () => void;
  onReject: () => void;
  onEdit: (text: string) => void;
  isLoading?: boolean;
}

export function ViolationCard({
  violation,
  onAccept,
  onReject,
  onEdit,
  isLoading
}: ViolationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(violation.suggestedFix);

  const handleSaveEdit = () => {
    onEdit(editText);
    setIsEditing(false);
  };

  return (
    <Card
      className={cn(
        'p-4 border-l-4',
        violation.severity === 'error' ? 'border-l-red-500' : 'border-l-yellow-500',
        violation.status !== 'pending' && 'opacity-60'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
              violation.severity === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            )}
          >
            {violation.severity.toUpperCase()}
          </span>
          <span className="ml-2 text-sm text-gray-500">{violation.ruleReference}</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-600"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Rule name */}
      <p className="font-medium text-gray-900 mb-2">{violation.ruleName}</p>

      {/* Citation text with highlight */}
      <div className="bg-gray-50 rounded p-3 mb-3 font-mono text-sm">
        <div className="text-gray-600 mb-1">Original:</div>
        <div className="text-gray-900">
          {violation.citationText.split(violation.originalText).map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <mark className="bg-red-200 px-0.5">{violation.originalText}</mark>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Suggested fix */}
      <div className="bg-green-50 rounded p-3 mb-3 font-mono text-sm">
        <div className="text-gray-600 mb-1">Suggested:</div>
        <div className="text-green-800">{violation.correctedCitation}</div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mb-3 p-3 bg-blue-50 rounded text-sm">
          <p className="font-medium text-blue-900 mb-1">Why this matters:</p>
          <p className="text-blue-800">{violation.explanation}</p>
        </div>
      )}

      {/* Inline editor */}
      {isEditing && (
        <div className="mb-3">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
            rows={2}
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleSaveEdit}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      {violation.status === 'pending' && !isEditing && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={onAccept}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-1" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onReject}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-1" />
            Ignore
          </Button>
        </div>
      )}

      {/* Status badge if resolved */}
      {violation.status !== 'pending' && (
        <div
          className={cn(
            'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
            violation.status === 'accepted' && 'bg-green-100 text-green-800',
            violation.status === 'rejected' && 'bg-gray-100 text-gray-800',
            violation.status === 'edited' && 'bg-blue-100 text-blue-800'
          )}
        >
          {violation.status === 'accepted' && 'Corrected'}
          {violation.status === 'rejected' && 'Ignored'}
          {violation.status === 'edited' && 'Manually edited'}
        </div>
      )}
    </Card>
  );
}
```

Create ValidationPanel.tsx:

```tsx
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

interface ValidationPanelProps {
  documentId: string;
}

export function ValidationPanel({ documentId }: ValidationPanelProps) {
  const [selectedStyle, setSelectedStyle] = useState('apa7');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const { data: styles = [] } = useCitationStyles();
  const { data: validations = [], isLoading: isLoadingValidations } = useValidations(documentId);
  const validateMutation = useValidateDocument();
  const acceptMutation = useAcceptValidation();
  const rejectMutation = useRejectValidation();
  const editMutation = useEditValidation();
  const batchMutation = useBatchCorrect();

  const handleValidate = async () => {
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
      {/* Header */}
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
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <FileCheck className="h-4 w-4 mr-2" />
                Validate All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary */}
      {validationResult && (
        <ValidationSummary data={validationResult.summary} />
      )}

      {/* Batch actions */}
      {pendingViolations.length > 1 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => setShowBatchModal(true)}
          >
            <Layers className="h-4 w-4 mr-2" />
            Batch Correct ({pendingViolations.length})
          </Button>
        </div>
      )}

      {/* Pending violations */}
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

      {/* Resolved violations */}
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

      {/* Empty state */}
      {!validationResult && validations.length === 0 && (
        <Card className="p-8 text-center">
          <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No validation results yet
          </h3>
          <p className="text-gray-500 mb-4">
            Select a citation style and click "Validate All" to check your citations.
          </p>
        </Card>
      )}

      {/* Batch correction modal */}
      <BatchCorrectionModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        violations={pendingViolations}
        onApplyBatch={async (ids) => {
          await batchMutation.mutateAsync({ documentId, validationIds: ids });
        }}
      />
    </div>
  );
}
```

Export all from src/components/citation/validation/index.ts:

```typescript
export { StyleSelector } from './StyleSelector';
export { ValidationSummary } from './ValidationSummary';
export { ViolationCard } from './ViolationCard';
export { ValidationPanel } from './ValidationPanel';
```
```

---

# US-6.1: Citation Format Correction

## Frontend Prompt 6.1.3: Batch Correction Modal

```
Create the batch correction modal at src/components/citation/correction/BatchCorrectionModal.tsx.

```tsx
import { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ValidationViolation } from '@/types/citation-validation.types';

interface BatchCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  violations: ValidationViolation[];
  onApplyBatch: (validationIds: string[]) => Promise<void>;
}

export function BatchCorrectionModal({
  isOpen,
  onClose,
  violations,
  onApplyBatch
}: BatchCorrectionModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(violations.map(v => v.id))
  );
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  // Group violations by type
  const groupedByType = violations.reduce((acc, v) => {
    if (!acc[v.violationType]) {
      acc[v.violationType] = [];
    }
    acc[v.violationType].push(v);
    return acc;
  }, {} as Record<string, ValidationViolation[]>);

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (type: string) => {
    const newSelected = new Set(selectedIds);
    groupedByType[type].forEach(v => newSelected.add(v.id));
    setSelectedIds(newSelected);
  };

  const handleDeselectAll = (type: string) => {
    const newSelected = new Set(selectedIds);
    groupedByType[type].forEach(v => newSelected.delete(v.id));
    setSelectedIds(newSelected);
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApplyBatch(Array.from(selectedIds));
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Batch Correction</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-gray-600 mb-4">
            Select the corrections you want to apply. {selectedIds.size} of {violations.length} selected.
          </p>

          {Object.entries(groupedByType).map(([type, typeViolations]) => (
            <div key={type} className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 capitalize">
                  {type.replace(/_/g, ' ')} ({typeViolations.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelectAll(type)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Select all
                  </button>
                  <button
                    onClick={() => handleDeselectAll(type)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {typeViolations.map(violation => (
                  <label
                    key={violation.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(violation.id)}
                      onChange={() => handleToggle(violation.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm">
                        <span className="text-red-600 line-through">{violation.originalText}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600">{violation.suggestedFix}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {violation.citationText}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isApplying}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={selectedIds.size === 0 || isApplying}
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Apply {selectedIds.size} Corrections
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

Export from src/components/citation/correction/index.ts:

```typescript
export { BatchCorrectionModal } from './BatchCorrectionModal';
```
```

---

# US-6.3: Reference List Generation

## Frontend Prompt 6.3.4: Reference List Types & Service

```
Add types for reference list at src/types/reference-list.types.ts:

```typescript
export interface ReferenceAuthor {
  firstName?: string;
  lastName: string;
  suffix?: string;
}

export interface ReferenceEntry {
  id: string;
  citationIds: string[];
  sourceType: 'journal' | 'book' | 'chapter' | 'conference' | 'website' | 'unknown';
  authors: ReferenceAuthor[];
  year?: string;
  title: string;
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  doi?: string;
  url?: string;
  formatted: string;
  enrichmentSource: 'crossref' | 'pubmed' | 'manual' | 'ai';
  enrichmentConfidence: number;
  needsReview: boolean;
  reviewReason?: string;
}

export interface ReferenceListSummary {
  totalEntries: number;
  enrichedFromCrossRef: number;
  enrichedFromPubMed: number;
  manualEntries: number;
  needsReview: number;
}

export interface ReferenceListResult {
  documentId: string;
  styleCode: string;
  status: 'draft' | 'finalized';
  summary: ReferenceListSummary;
  entries: ReferenceEntry[];
}

export interface GenerateReferenceListRequest {
  styleCode: string;
  options?: {
    enrichFromCrossRef?: boolean;
    enrichFromPubMed?: boolean;
  };
}
```

Add the service at src/services/reference-list.service.ts:

```typescript
import api from './api';
import type {
  ReferenceListResult,
  ReferenceEntry,
  GenerateReferenceListRequest
} from '@/types/reference-list.types';

export const referenceListService = {
  async generate(
    documentId: string,
    request: GenerateReferenceListRequest
  ): Promise<ReferenceListResult> {
    const response = await api.post(
      `/citation/document/${documentId}/reference-list/generate`,
      request
    );
    return response.data.data;
  },

  async updateEntry(
    entryId: string,
    updates: Partial<ReferenceEntry>
  ): Promise<ReferenceEntry> {
    const response = await api.patch(`/citation/reference-list/${entryId}`, updates);
    return response.data.data;
  },

  async finalize(
    documentId: string,
    styleCode: string
  ): Promise<{ status: string; formattedList: string; entryCount: number }> {
    const response = await api.post(
      `/citation/document/${documentId}/reference-list/finalize`,
      { styleCode }
    );
    return response.data.data;
  }
};
```
```

---

## Frontend Prompt 6.3.5: Reference List Hooks

```
Add React Query hooks at src/hooks/useReferenceList.ts:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referenceListService } from '@/services/reference-list.service';
import type { GenerateReferenceListRequest, ReferenceEntry } from '@/types/reference-list.types';
import toast from 'react-hot-toast';

export function useGenerateReferenceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      request
    }: {
      documentId: string;
      request: GenerateReferenceListRequest;
    }) => referenceListService.generate(documentId, request),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['reference-list', variables.documentId], data);
      toast.success(`Generated ${data.summary.totalEntries} reference entries`);
    },
    onError: () => {
      toast.error('Failed to generate reference list');
    }
  });
}

export function useReferenceList(documentId: string) {
  return useQuery({
    queryKey: ['reference-list', documentId],
    queryFn: () => referenceListService.generate(documentId, {
      styleCode: 'apa7',
      options: { enrichFromCrossRef: true }
    }),
    enabled: false // Only run when explicitly triggered
  });
}

export function useUpdateReferenceEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entryId,
      updates
    }: {
      entryId: string;
      updates: Partial<ReferenceEntry>;
    }) => referenceListService.updateEntry(entryId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-list'] });
      toast.success('Entry updated');
    }
  });
}

export function useFinalizeReferenceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      styleCode
    }: {
      documentId: string;
      styleCode: string;
    }) => referenceListService.finalize(documentId, styleCode),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reference-list'] });
      toast.success('Reference list finalized');
    }
  });
}
```
```

---

## Frontend Prompt 6.3.6: Reference List UI Components

```
Create the reference list components.

First, create folder: src/components/citation/reference-list/

Create ReferenceEntryCard.tsx:

```tsx
import { useState } from 'react';
import { Edit2, Check, X, ExternalLink, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import type { ReferenceEntry } from '@/types/reference-list.types';

interface ReferenceEntryCardProps {
  entry: ReferenceEntry;
  index: number;
  onEdit: (updates: Partial<ReferenceEntry>) => void;
}

export function ReferenceEntryCard({ entry, index, onEdit }: ReferenceEntryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEntry, setEditedEntry] = useState(entry);

  const handleSave = () => {
    onEdit(editedEntry);
    setIsEditing(false);
  };

  // Convert *text* to italics for display
  const formatWithItalics = (text: string) => {
    return text.split(/\*([^*]+)\*/).map((part, i) =>
      i % 2 === 1 ? <em key={i}>{part}</em> : part
    );
  };

  return (
    <Card className={cn(
      'p-4',
      entry.needsReview && 'border-l-4 border-l-yellow-500'
    )}>
      <div className="flex items-start gap-4">
        {/* Index number */}
        <span className="text-gray-400 font-mono text-sm">{index + 1}.</span>

        <div className="flex-1">
          {/* Formatted reference */}
          {!isEditing ? (
            <p className="text-gray-900">{formatWithItalics(entry.formatted)}</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Authors</label>
                  <input
                    type="text"
                    value={editedEntry.authors.map(a => `${a.lastName}, ${a.firstName || ''}`).join('; ')}
                    onChange={(e) => {
                      const authors = e.target.value.split(';').map(a => {
                        const [lastName, firstName] = a.trim().split(',').map(s => s.trim());
                        return { lastName: lastName || '', firstName };
                      });
                      setEditedEntry({ ...editedEntry, authors });
                    }}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Year</label>
                  <input
                    type="text"
                    value={editedEntry.year || ''}
                    onChange={(e) => setEditedEntry({ ...editedEntry, year: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Title</label>
                <input
                  type="text"
                  value={editedEntry.title}
                  onChange={(e) => setEditedEntry({ ...editedEntry, title: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Journal</label>
                  <input
                    type="text"
                    value={editedEntry.journalName || ''}
                    onChange={(e) => setEditedEntry({ ...editedEntry, journalName: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Volume(Issue)</label>
                  <input
                    type="text"
                    value={`${editedEntry.volume || ''}${editedEntry.issue ? `(${editedEntry.issue})` : ''}`}
                    onChange={(e) => {
                      const match = e.target.value.match(/^(\d+)(?:\((\d+)\))?$/);
                      if (match) {
                        setEditedEntry({
                          ...editedEntry,
                          volume: match[1],
                          issue: match[2]
                        });
                      }
                    }}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Pages</label>
                  <input
                    type="text"
                    value={editedEntry.pages || ''}
                    onChange={(e) => setEditedEntry({ ...editedEntry, pages: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">DOI</label>
                <input
                  type="text"
                  value={editedEntry.doi || ''}
                  onChange={(e) => setEditedEntry({ ...editedEntry, doi: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>
          )}

          {/* Metadata badges */}
          <div className="flex items-center gap-2 mt-2">
            <span className={cn(
              'text-xs px-2 py-0.5 rounded',
              entry.enrichmentSource === 'crossref' && 'bg-green-100 text-green-700',
              entry.enrichmentSource === 'pubmed' && 'bg-blue-100 text-blue-700',
              entry.enrichmentSource === 'manual' && 'bg-gray-100 text-gray-700',
              entry.enrichmentSource === 'ai' && 'bg-purple-100 text-purple-700'
            )}>
              {entry.enrichmentSource}
            </span>
            <span className="text-xs text-gray-500">
              {Math.round(entry.enrichmentConfidence * 100)}% confidence
            </span>
            {entry.doi && (
              <a
                href={`https://doi.org/${entry.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                DOI
              </a>
            )}
            {entry.needsReview && (
              <span className="text-xs text-yellow-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {entry.reviewReason || 'Needs review'}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {!isEditing ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={handleSave}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditedEntry(entry);
                  setIsEditing(false);
                }}
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
```

Create ReferenceListGenerator.tsx:

```tsx
import { useState } from 'react';
import { BookOpen, Loader2, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StyleSelector } from '../validation/StyleSelector';
import { ReferenceEntryCard } from './ReferenceEntryCard';
import {
  useCitationStyles
} from '@/hooks/useCitationValidation';
import {
  useGenerateReferenceList,
  useUpdateReferenceEntry,
  useFinalizeReferenceList
} from '@/hooks/useReferenceList';
import type { ReferenceListResult } from '@/types/reference-list.types';

interface ReferenceListGeneratorProps {
  documentId: string;
}

export function ReferenceListGenerator({ documentId }: ReferenceListGeneratorProps) {
  const [selectedStyle, setSelectedStyle] = useState('apa7');
  const [referenceList, setReferenceList] = useState<ReferenceListResult | null>(null);

  const { data: styles = [] } = useCitationStyles();
  const generateMutation = useGenerateReferenceList();
  const updateEntryMutation = useUpdateReferenceEntry();
  const finalizeMutation = useFinalizeReferenceList();

  const handleGenerate = async () => {
    const result = await generateMutation.mutateAsync({
      documentId,
      request: {
        styleCode: selectedStyle,
        options: {
          enrichFromCrossRef: true,
          enrichFromPubMed: true
        }
      }
    });
    setReferenceList(result);
  };

  const handleFinalize = async () => {
    await finalizeMutation.mutateAsync({
      documentId,
      styleCode: selectedStyle
    });
  };

  const handleExport = () => {
    if (!referenceList) return;

    const text = referenceList.entries
      .map((e, i) => `${i + 1}. ${e.formatted.replace(/\*/g, '')}`)
      .join('\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'references.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reference List</h2>
          <p className="text-sm text-gray-500">
            Generate a formatted bibliography from your citations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StyleSelector
            styles={styles}
            selected={selectedStyle}
            onChange={setSelectedStyle}
            disabled={generateMutation.isPending}
          />
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary */}
      {referenceList && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-3 text-center">
            <p className="text-2xl font-semibold">{referenceList.summary.totalEntries}</p>
            <p className="text-xs text-gray-500">Total</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-semibold text-green-600">
              {referenceList.summary.enrichedFromCrossRef}
            </p>
            <p className="text-xs text-gray-500">CrossRef</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-semibold text-blue-600">
              {referenceList.summary.enrichedFromPubMed}
            </p>
            <p className="text-xs text-gray-500">PubMed</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-semibold text-gray-600">
              {referenceList.summary.manualEntries}
            </p>
            <p className="text-xs text-gray-500">Manual</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-semibold text-yellow-600">
              {referenceList.summary.needsReview}
            </p>
            <p className="text-xs text-gray-500">Needs Review</p>
          </Card>
        </div>
      )}

      {/* Entries */}
      {referenceList && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">
            References ({referenceList.entries.length})
          </h3>
          {referenceList.entries.map((entry, index) => (
            <ReferenceEntryCard
              key={entry.id}
              entry={entry}
              index={index}
              onEdit={(updates) =>
                updateEntryMutation.mutate({ entryId: entry.id, updates })
              }
            />
          ))}
        </div>
      )}

      {/* Actions */}
      {referenceList && referenceList.entries.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={handleFinalize}
            disabled={referenceList.summary.needsReview > 0 || finalizeMutation.isPending}
          >
            {finalizeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Finalizing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Finalize
              </>
            )}
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!referenceList && (
        <Card className="p-8 text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No reference list yet
          </h3>
          <p className="text-gray-500 mb-4">
            Select a style and click "Generate" to create a reference list from your citations.
          </p>
        </Card>
      )}
    </div>
  );
}
```

Export from src/components/citation/reference-list/index.ts:

```typescript
export { ReferenceEntryCard } from './ReferenceEntryCard';
export { ReferenceListGenerator } from './ReferenceListGenerator';
```
```

---

## Implementation Order

**Do these prompts in sequence (after completing backend):**

1. **5.1.5**: Validation Types
2. **5.1.6**: Validation Service
3. **5.1.7**: Validation Hooks
4. **5.1.8**: Validation UI Components
5. **6.1.3**: Batch Correction Modal
6. **6.3.4**: Reference List Types & Service
7. **6.3.5**: Reference List Hooks
8. **6.3.6**: Reference List UI Components

---

## Final Push - Both Repositories

After completing ALL prompts in both backend and frontend, push everything to GitHub:

### Step 1: Push Backend

```bash
# In ninja-backend Replit
git checkout feature/citation/US-4-1-US-4-2

# Verify all commits are there
git log --oneline

# Push to GitHub
git push -u origin feature/citation/US-4-1-US-4-2
```

### Step 2: Push Frontend

```bash
# In ninja-frontend Replit
git checkout feature/citation/US-4-1-US-4-2-frontend

# Verify all commits are there
git log --oneline

# Push to GitHub
git push -u origin feature/citation/US-4-1-US-4-2-frontend
```

### Step 3: Create Pull Requests (Optional)

After pushing, create PRs on GitHub:
- Backend: `feature/citation/US-4-1-US-4-2` → `main`
- Frontend: `feature/citation/US-4-1-US-4-2-frontend` → `main`

---

## Summary

These prompts implement:

### US-5.1: Citation Format Validation (Frontend)
- Style selector dropdown
- Validation summary cards
- Violation cards with accept/reject/edit actions
- Validation panel with full workflow

### US-6.1: Citation Format Correction (Frontend)
- Batch correction modal with grouping by violation type
- Select all/deselect all per type
- Progress indication during batch apply

### US-6.3: Reference List Generation (Frontend)
- Reference entry cards with inline editing
- Reference list generator with style selection
- Summary statistics (CrossRef, PubMed, manual counts)
- Export and finalize actions

---

**Last Updated**: February 2026
