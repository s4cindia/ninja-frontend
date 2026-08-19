export type ComparisonTrialContentType = 'text-dominant' | 'table-heavy' | 'figure-heavy' | 'mixed';

/** Status values actually set by the backend — 'ninja_complete' and 'reported' are schema-aspirational, no code path sets them. */
export type ComparisonTrialStatus = 'registered' | 'pdfxt_logged' | 'validated';

export interface VeraPdfFailure {
  ruleId: string;
  description: string;
  pageNumber?: number;
  context?: string;
}

export interface ComparisonTrial {
  id: string;
  sourceFileName: string;
  sourceS3Path: string;
  contentType: ComparisonTrialContentType;
  operatorId: string;

  ninjaJobId: string | null;
  ninjaActiveMs: number | null;
  ninjaGpuCostUsd: number | null;
  ninjaPacResult: VeraPdfFailure[] | null;

  pdfxtS3Path: string | null;
  pdfxtTimeMs: number | null;
  pdfxtPageCount: number | null;
  pdfxtCostUsd: number | null;
  pdfxtPacResult: VeraPdfFailure[] | null;

  status: ComparisonTrialStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonTrialWithJob extends ComparisonTrial {
  job: { id: string; status: string; output: unknown } | null;
}

export interface TrialReport {
  trialId: string;
  sourceFileName: string;
  contentType: string;
  pageCount: number | null;
  ninja: {
    activeMs: number | null;
    costUsd: number | null;
    pacFailureCount: number | null;
    pagesPerHour: number | null;
  };
  pdfxt: {
    timeMs: number | null;
    costUsd: number | null;
    pacFailureCount: number | null;
    pagesPerHour: number | null;
  };
}

export interface AggregateReport {
  trialCount: number;
  validatedCount: number;
  avgNinjaActiveMs: number | null;
  avgPdfxtTimeMs: number | null;
  estimatedSpeedup: number | null;
  avgNinjaPacFailures: number | null;
  avgPdfxtPacFailures: number | null;
  avgNinjaCostUsd: number | null;
  avgPdfxtCostUsd: number | null;
}
