export type FeedbackType = 'ACCESSIBILITY_ISSUE' | 'ALT_TEXT_QUALITY' | 'AUDIT_ACCURACY' | 'REMEDIATION_SUGGESTION' | 'GENERAL' | 'BUG_REPORT' | 'FEATURE_REQUEST';
export type FeedbackStatus = 'NEW' | 'REVIEWED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';

export interface FeedbackAttachment {
  id: string;
  feedbackId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedById?: string;
  uploadedBy?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
}

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  status: FeedbackStatus;
  comment: string;
  context?: Record<string, unknown>;
  isPositive?: boolean | null;
  entityType?: string;
  entityId?: string;
  createdAt: string;
  updatedAt?: string;
  userEmail?: string;
  attachments?: FeedbackAttachment[];
}
