# Phase 4: Visual Comparison API Contract

**Version**: 1.0
**Last Updated**: 2026-02-15
**Status**: Ready for Implementation

---

## Overview

This document defines the **API contract** between backend and frontend for the Visual Comparison feature. Both teams must implement exactly these types, endpoints, and response formats.

**Critical Rule**: Any changes to this contract must be communicated to both backend and frontend teams immediately.

---

## TypeScript Shared Types

These types should be **identical** in both repositories:

### Backend Location
```
src/types/comparison.types.ts
```

### Frontend Location
```
src/types/comparison.ts
```

### Type Definitions

```typescript
/**
 * Status of a remediation change
 */
export enum ChangeStatus {
  APPLIED = 'APPLIED',       // Change successfully applied
  REJECTED = 'REJECTED',     // User rejected this change (Phase 3)
  REVERTED = 'REVERTED',     // Change was rolled back
  FAILED = 'FAILED',         // Change failed to apply
  SKIPPED = 'SKIPPED',       // Auto-fix skipped this change
}

/**
 * Type of remediation change
 */
export enum ChangeType {
  METADATA_UPDATE = 'METADATA_UPDATE',   // Document metadata (title, language, creator)
  TAG_FIX = 'TAG_FIX',                   // Structure tag corrections
  ALT_TEXT_ADD = 'ALT_TEXT_ADD',         // Alternative text additions
  LANGUAGE_SET = 'LANGUAGE_SET',         // Language attribute set
  HEADING_FIX = 'HEADING_FIX',           // Heading structure fixes
  TABLE_FIX = 'TABLE_FIX',               // Table accessibility fixes
  LINK_FIX = 'LINK_FIX',                 // Link text fixes
  COLOR_CONTRAST = 'COLOR_CONTRAST',     // Color contrast adjustments
  FORM_LABEL = 'FORM_LABEL',             // Form field labeling
  OTHER = 'OTHER',                       // Other changes
}

/**
 * Severity level for accessibility issues
 */
export enum Severity {
  CRITICAL = 'CRITICAL',     // Blocks accessibility, must fix
  SERIOUS = 'SERIOUS',       // Major impact, should fix
  MODERATE = 'MODERATE',     // Medium impact, recommended fix
  MINOR = 'MINOR',           // Low impact, nice to fix
}

/**
 * Individual remediation change record
 */
export interface RemediationChange {
  id: string;
  jobId: string;
  changeNumber: number;           // Sequential: 1, 2, 3...
  filePath: string;               // e.g., "EPUB/content.xhtml" or "PDF"
  changeType: ChangeType;
  description: string;            // Human-readable: "Set document language to 'en'"
  beforeContent: string | null;   // XML/JSON before change (null if new content)
  afterContent: string | null;    // XML/JSON after change (null if deleted)
  severity: Severity | null;
  wcagCriteria: string | null;    // e.g., "2.4.2", "1.1.1"
  status: ChangeStatus;
  appliedAt: string;              // ISO 8601 datetime
  reviewedBy: string | null;      // User ID (Phase 3)
  reviewedAt: string | null;      // ISO 8601 datetime (Phase 3)
  reviewComment: string | null;   // Optional user feedback (Phase 3)
}

/**
 * Summary report for all changes in a job
 */
export interface ComparisonReport {
  id: string;
  jobId: string;
  totalChanges: number;
  appliedCount: number;
  rejectedCount: number;
  revertedCount: number;
  reportData: ComparisonReportData | null;
  pdfUrl: string | null;          // S3 URL to exported PDF (Phase 2)
  generatedAt: string;            // ISO 8601 datetime
}

/**
 * Grouped statistics for the comparison report
 */
export interface ComparisonReportData {
  byType: Record<ChangeType, number>;      // Count by change type
  bySeverity: Record<Severity, number>;    // Count by severity
  byStatus: Record<ChangeStatus, number>;  // Count by status
  wcagCoverage: Array<{                    // WCAG criteria addressed
    criteria: string;                      // e.g., "2.4.2"
    changeCount: number;
  }>;
}

/**
 * Full comparison data response
 */
export interface ComparisonData {
  report: ComparisonReport;
  changes: RemediationChange[];
}

/**
 * Filter parameters for querying changes
 */
export interface ChangeFilters {
  types?: ChangeType[];
  severities?: Severity[];
  statuses?: ChangeStatus[];
  page?: number;              // Default: 1
  limit?: number;             // Default: 50, max: 100
}

/**
 * Paginated response for filtered changes
 */
export interface PaginatedChanges {
  report: ComparisonReport;
  changes: RemediationChange[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Request body for rejecting a change (Phase 3)
 */
export interface RejectChangeRequest {
  comment?: string;
}

/**
 * Request body for rolling back a change (Phase 3)
 */
export interface RollbackChangeRequest {
  reason: string;              // Required: explain why
}

/**
 * Success response wrapper
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Error response wrapper
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Generic API response
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
```

---

## API Endpoints

### Base Path
```
/api/v1/pdf/:jobId/comparison
```

---

### 1. Get Full Comparison Data

**Endpoint**: `GET /api/v1/pdf/:jobId/comparison`

**Description**: Retrieve all comparison data for a job (report + all changes)

**Auth**: Required (Bearer token)

**Path Parameters**:
- `jobId` (string, required): Job UUID

**Response**: `200 OK`
```typescript
ApiResponse<ComparisonData>
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "report": {
      "id": "report-uuid",
      "jobId": "job-uuid",
      "totalChanges": 15,
      "appliedCount": 13,
      "rejectedCount": 0,
      "revertedCount": 2,
      "reportData": {
        "byType": {
          "METADATA_UPDATE": 5,
          "TAG_FIX": 8,
          "ALT_TEXT_ADD": 2
        },
        "bySeverity": {
          "CRITICAL": 3,
          "SERIOUS": 7,
          "MODERATE": 5
        },
        "byStatus": {
          "APPLIED": 13,
          "REVERTED": 2
        },
        "wcagCoverage": [
          { "criteria": "2.4.2", "changeCount": 5 },
          { "criteria": "1.3.1", "changeCount": 8 },
          { "criteria": "1.1.1", "changeCount": 2 }
        ]
      },
      "pdfUrl": null,
      "generatedAt": "2026-02-15T10:30:00Z"
    },
    "changes": [
      {
        "id": "change-uuid-1",
        "jobId": "job-uuid",
        "changeNumber": 1,
        "filePath": "PDF",
        "changeType": "LANGUAGE_SET",
        "description": "Set document language to 'en'",
        "beforeContent": null,
        "afterContent": "<dc:language>en</dc:language>",
        "severity": "CRITICAL",
        "wcagCriteria": "3.1.1",
        "status": "APPLIED",
        "appliedAt": "2026-02-15T10:25:00Z",
        "reviewedBy": null,
        "reviewedAt": null,
        "reviewComment": null
      }
      // ... more changes
    ]
  }
}
```

**Error Responses**:
- `404 Not Found`: Job not found or no comparison data
- `401 Unauthorized`: Invalid/missing token
- `403 Forbidden`: User doesn't own this job

---

### 2. Get Single Change

**Endpoint**: `GET /api/v1/pdf/:jobId/comparison/changes/:changeId`

**Description**: Retrieve details for a specific change

**Auth**: Required

**Path Parameters**:
- `jobId` (string, required): Job UUID
- `changeId` (string, required): Change UUID

**Response**: `200 OK`
```typescript
ApiResponse<RemediationChange>
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "change-uuid-1",
    "jobId": "job-uuid",
    "changeNumber": 1,
    "filePath": "PDF",
    "changeType": "LANGUAGE_SET",
    "description": "Set document language to 'en'",
    "beforeContent": null,
    "afterContent": "<dc:language>en</dc:language>",
    "severity": "CRITICAL",
    "wcagCriteria": "3.1.1",
    "status": "APPLIED",
    "appliedAt": "2026-02-15T10:25:00Z",
    "reviewedBy": null,
    "reviewedAt": null,
    "reviewComment": null
  }
}
```

**Error Responses**:
- `404 Not Found`: Change not found
- `401 Unauthorized`: Invalid/missing token

---

### 3. Get Filtered Changes

**Endpoint**: `GET /api/v1/pdf/:jobId/comparison/filter`

**Description**: Retrieve filtered and paginated changes

**Auth**: Required

**Path Parameters**:
- `jobId` (string, required): Job UUID

**Query Parameters**:
- `types` (string[], optional): Array of ChangeType values (e.g., `?types=METADATA_UPDATE&types=TAG_FIX`)
- `severities` (string[], optional): Array of Severity values
- `statuses` (string[], optional): Array of ChangeStatus values
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 50, max: 100)

**Response**: `200 OK`
```typescript
ApiResponse<PaginatedChanges>
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "report": { /* same as endpoint #1 */ },
    "changes": [ /* filtered changes */ ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalPages": 1,
      "totalItems": 15,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 4. Reject Change (Phase 3)

**Endpoint**: `POST /api/v1/pdf/:jobId/comparison/changes/:changeId/reject`

**Description**: Mark a change as rejected (status update only, doesn't revert)

**Auth**: Required

**Path Parameters**:
- `jobId` (string, required): Job UUID
- `changeId` (string, required): Change UUID

**Request Body**:
```typescript
RejectChangeRequest
```

**Example Request**:
```json
{
  "comment": "This change introduced a regression in the table structure"
}
```

**Response**: `200 OK`
```typescript
ApiResponse<RemediationChange>
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "change-uuid-1",
    "status": "REJECTED",
    "reviewedBy": "user-uuid",
    "reviewedAt": "2026-02-15T11:00:00Z",
    "reviewComment": "This change introduced a regression in the table structure"
    // ... other fields
  }
}
```

**Error Responses**:
- `404 Not Found`: Change not found
- `400 Bad Request`: Invalid request body
- `409 Conflict`: Change already rejected or reverted

---

### 5. Rollback Change (Phase 3)

**Endpoint**: `POST /api/v1/pdf/:jobId/comparison/changes/:changeId/rollback`

**Description**: Revert a specific change (re-runs remediation without this fix)

**Auth**: Required

**Path Parameters**:
- `jobId` (string, required): Job UUID
- `changeId` (string, required): Change UUID

**Request Body**:
```typescript
RollbackChangeRequest
```

**Example Request**:
```json
{
  "reason": "Change broke table accessibility, reverting to manual fix"
}
```

**Response**: `200 OK`
```typescript
ApiResponse<{
  change: RemediationChange;
  remediationTriggered: boolean;
}>
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "change": {
      "id": "change-uuid-1",
      "status": "REVERTED",
      "reviewedBy": "user-uuid",
      "reviewedAt": "2026-02-15T11:05:00Z",
      "reviewComment": "Change broke table accessibility, reverting to manual fix"
      // ... other fields
    },
    "remediationTriggered": true
  }
}
```

**Error Responses**:
- `404 Not Found`: Change not found
- `400 Bad Request`: Missing reason or invalid request
- `409 Conflict`: Change already reverted
- `500 Internal Server Error`: Rollback failed (change status unchanged)

---

### 6. Export PDF Report (Phase 2)

**Endpoint**: `POST /api/v1/pdf/:jobId/comparison/export-pdf`

**Description**: Generate PDF compliance report and upload to S3

**Auth**: Required

**Path Parameters**:
- `jobId` (string, required): Job UUID

**Request Body**: None

**Response**: `200 OK`
```typescript
ApiResponse<{
  pdfUrl: string;
  reportId: string;
}>
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "pdfUrl": "https://ninja-epub-staging.s3.amazonaws.com/reports/comparison-report-uuid.pdf",
    "reportId": "report-uuid"
  }
}
```

**Error Responses**:
- `404 Not Found`: Job or comparison data not found
- `500 Internal Server Error`: PDF generation failed

**Note**: This is a **long-running operation** (5-10 seconds). Consider:
- Frontend shows loading spinner
- Backend returns immediately with `202 Accepted` and polls for completion (future enhancement)
- Or use WebSockets for progress updates (future enhancement)

---

## Validation Schemas (Zod)

### Backend: `src/schemas/comparison.schemas.ts`

```typescript
import { z } from 'zod';

export const ChangeFiltersSchema = z.object({
  types: z.array(z.enum([
    'METADATA_UPDATE', 'TAG_FIX', 'ALT_TEXT_ADD', 'LANGUAGE_SET',
    'HEADING_FIX', 'TABLE_FIX', 'LINK_FIX', 'COLOR_CONTRAST',
    'FORM_LABEL', 'OTHER'
  ])).optional(),
  severities: z.array(z.enum(['CRITICAL', 'SERIOUS', 'MODERATE', 'MINOR'])).optional(),
  statuses: z.array(z.enum(['APPLIED', 'REJECTED', 'REVERTED', 'FAILED', 'SKIPPED'])).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const RejectChangeSchema = z.object({
  comment: z.string().max(500).optional(),
});

export const RollbackChangeSchema = z.object({
  reason: z.string().min(10).max(500),
});
```

### Frontend: Same enums in TypeScript types (runtime validation optional)

---

## Error Codes

Standard error codes for comparison endpoints:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `COMPARISON_NOT_FOUND` | 404 | No comparison data for this job |
| `CHANGE_NOT_FOUND` | 404 | Change ID doesn't exist |
| `INVALID_FILTERS` | 400 | Invalid filter parameters |
| `CHANGE_ALREADY_REJECTED` | 409 | Change status is already REJECTED |
| `CHANGE_ALREADY_REVERTED` | 409 | Change status is already REVERTED |
| `ROLLBACK_FAILED` | 500 | Remediation rollback failed |
| `PDF_GENERATION_FAILED` | 500 | PDF export failed |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | User doesn't own this job |

---

## Database Schema (Reference)

### Prisma Schema

```prisma
model RemediationChange {
  id              String       @id @default(uuid())
  jobId           String
  job             Job          @relation(fields: [jobId], references: [id], onDelete: Cascade)
  changeNumber    Int
  filePath        String
  changeType      String       // ChangeType enum as string
  description     String
  beforeContent   String?      @db.Text
  afterContent    String?      @db.Text
  severity        String?      // Severity enum as string
  wcagCriteria    String?
  status          String       @default("APPLIED")  // ChangeStatus enum
  appliedAt       DateTime     @default(now())
  reviewedBy      String?
  reviewedAt      DateTime?
  reviewComment   String?

  @@index([jobId])
  @@index([status])
  @@index([changeType])
  @@index([changeNumber])
}

model ComparisonReport {
  id              String   @id @default(uuid())
  jobId           String   @unique
  job             Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  totalChanges    Int
  appliedCount    Int
  rejectedCount   Int
  revertedCount   Int
  reportData      Json?
  pdfUrl          String?
  generatedAt     DateTime @default(now())
}
```

---

## Testing Contract

### Backend Must Test

1. All endpoints return correct status codes
2. Pagination works correctly (page, limit, hasNextPage)
3. Filters work independently and combined
4. Cascade delete: Deleting job deletes all changes and report
5. Change status transitions are valid (can't reject → revert)
6. Before/after content handles null correctly

### Frontend Must Test

1. API client handles 401/403/404/500 correctly
2. Pagination updates URL query params
3. Filters can be combined (multi-select)
4. Loading states during API calls
5. Error messages displayed to user
6. Types match API responses exactly

---

## Migration Guide

### Adding New ChangeType

1. **Backend**: Add to `ChangeType` enum in `src/types/comparison.types.ts`
2. **Backend**: Add to `ChangeFiltersSchema` in `src/schemas/comparison.schemas.ts`
3. **Frontend**: Add to `ChangeType` enum in `src/types/comparison.ts`
4. **Frontend**: Add display label to `ChangeTypeLabels` map in components
5. **Update this document** with new type

### Adding New Endpoint

1. **Update this document** first (design contract)
2. **Backend**: Implement route, controller, service
3. **Backend**: Add Zod schema if needed
4. **Backend**: Write unit tests
5. **Frontend**: Add API service function
6. **Frontend**: Add React Query hook
7. **Integration**: Add E2E test

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-15 | Initial contract for Phase 4 MVP |

---

**Next Steps**:
1. Backend team: Implement endpoints in order (1 → 2 → 3 → 4 → 5 → 6)
2. Frontend team: Implement API client and types (F1)
3. Both teams: Sync after endpoint #1 is complete
4. Integration team: Write E2E tests after all endpoints complete

**Questions?** Add comments to this file or discuss in team sync.
