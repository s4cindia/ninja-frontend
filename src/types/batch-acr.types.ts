export interface BatchAcrOptions {
  edition: 'VPAT2.5-508' | 'VPAT2.5-WCAG' | 'VPAT2.5-EU' | 'VPAT2.5-INT';
  batchName: string;
  vendor: string;
  contactEmail: string;
  aggregationStrategy: 'conservative' | 'optimistic';
}

export interface BatchAcrGenerationRequest {
  batchId: string;
  mode: 'individual' | 'aggregate';
  options?: BatchAcrOptions;
}

export interface IndividualAcrGenerationResult {
  mode: 'individual';
  acrWorkflowIds: string[];
  totalAcrs: number;
  message: string;
}

export interface AggregateAcrGenerationResult {
  mode: 'aggregate';
  acrWorkflowId: string;
  totalDocuments: number;
  totalCriteria: number;
  message: string;
}

export type BatchAcrGenerationResult =
  | IndividualAcrGenerationResult
  | AggregateAcrGenerationResult;

export interface BatchAcrHistoryEntry {
  mode: 'individual' | 'aggregate';
  acrWorkflowIds: string[];
  generatedAt: string;
  generatedBy: string;
}

export interface BatchAcrCurrentState {
  generated: boolean;
  mode?: 'individual' | 'aggregate';
  workflowIds: string[];
  generatedAt?: string;
}

export interface BatchAcrHistory {
  history: BatchAcrHistoryEntry[];
  currentAcr: BatchAcrCurrentState;
}

export interface BatchAcrDocument {
  acrDocument: unknown;
  metadata: {
    id: string;
    status: string;
    createdAt: string;
    completedAt?: string;
  };
}

export interface BatchAcrExportResult {
  downloadUrl: string;
  format: 'pdf' | 'docx' | 'html';
}
