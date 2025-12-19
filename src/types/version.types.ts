export interface VersionEntry {
  version: number;
  createdAt: string;
  createdBy: string;
  changeSummary: string;
  changeCount: number;
}

export interface VersionChange {
  field: string;
  criterionId?: string;
  criterionName?: string;
  oldValue: string;
  newValue: string;
  reason?: string;
}

export interface VersionDetails extends VersionEntry {
  changes: VersionChange[];
}

export interface VersionComparison {
  version1: number;
  version2: number;
  differences: VersionDifference[];
}

export interface VersionDifference {
  criterionId: string;
  criterionName: string;
  field: string;
  v1Value: string;
  v2Value: string;
}

export interface VersionHistoryData {
  versions: VersionEntry[];
  isLoading: boolean;
  error: Error | null;
}
