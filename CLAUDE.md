# Ninja Platform - Claude Context

## Project Overview

Ninja is an EPUB/PDF Accessibility Platform that provides accessibility auditing, remediation, and compliance reporting for digital publications. The platform helps publishers ensure their content meets WCAG, Section 508, and other accessibility standards.

## Architecture

### Repositories

| Repository | Purpose | Replit Workspace |
|------------|---------|------------------|
| `ninja-backend` | Express.js REST API | Backend Replit |
| `ninja-frontend` | React + Vite SPA | Frontend Replit |

### Tech Stack

**Backend:**
- Node.js + Express.js + TypeScript
- Prisma ORM
- PostgreSQL (Neon serverless)
- AWS S3 for file storage
- ACE (Accessibility Checker for EPUB) microservice

**Frontend:**
- React 18 + TypeScript
- Vite build tool
- TailwindCSS
- React Query (TanStack Query)
- React Router

### Deployment

- **Staging:** AWS ECS Fargate behind CloudFront
- **CI/CD:** GitHub Actions
- **Database:** Neon PostgreSQL (serverless)

---

## Windows Development Environment

This project runs on **Windows with MSYS bash**. Always account for Windows-specific considerations:

- **Paths:** Always use Windows-style paths (e.g., `C:\Users\...`) not Linux paths (e.g., `/tmp/`)
- **File Encoding:** Be aware of UTF-8 BOM and UTF-16 encoding issues when editing files created by PowerShell
- **Shell Scripts:** When writing shell scripts or hooks, account for MSYS path translation quirks
- **Line Endings:** Windows uses CRLF (`\r\n`), Linux uses LF (`\n`) - git typically handles this automatically

---

## Project Structure

### Multi-Repository Workspace

The workspace contains multiple repositories:
- **`ninja-backend`** - Express.js REST API at `C:\Users\<username>\projects\ninja-backend`
- **`ninja-frontend`** - React + Vite SPA at `C:\Users\<username>\projects\ninja-frontend`

### Critical Rules

- **Always confirm which repo/directory you're working in before making changes**
- The frontend dev server runs from the workspace directory, not necessarily the git root
- **Never make changes in the frontend repo when working on a backend task (or vice versa) without explicit user approval**
- Check `pwd` and `git status` before starting work to verify location

---

## Workflow Rules

### Before Starting Implementation

1. **Read the full prompt/spec file before starting implementation**
2. Do not begin coding until you've confirmed you have all required context
3. When the user provides PR review comments, wait for ALL rounds of comments before starting implementation unless told otherwise
4. **Stay focused on the assigned task** - do not drift to adjacent features or improvements without explicit approval

### During Implementation

- If unsure about scope, ask for clarification before proceeding
- When working across multiple files, group related changes into logical commits
- Test changes locally before committing
- Run lint and typecheck before pushing

---

## API & Integration Conventions

### Backend API Patterns

- **Base Path:** All API routes include `/api/v1` prefix - always include the full path when constructing URLs
- **Example:** `https://api.example.com/api/v1/jobs/:id` (not `/jobs/:id`)

### Common CI Failure Patterns

When fixing CI errors, check for these most common issues:
1. **TypeScript type errors** - missing types, incorrect type annotations
2. **Invalid component prop values** - e.g., button variants that don't exist in the component definition
3. **Lint warnings** - unused imports, console.logs, etc.
4. **Test failures** - especially path handling on Windows vs POSIX

---

## Testing & Validation

### Pre-Commit Checklist

Before committing any bug fix or feature:

1. **Run relevant unit tests:**
   ```bash
   npm test -- --related
   ```

2. **Run type checking:**
   ```bash
   npm run typecheck
   ```

3. **Run linter:**
   ```bash
   npm run lint
   ```

4. **Only commit if all three pass**

### Windows-Specific Testing

- When fixing tests on Windows, verify path handling works for both Windows and POSIX paths
- Test with forward slashes and backslashes where applicable
- Be mindful of case-sensitivity differences (Windows is case-insensitive, Linux is case-sensitive)

### Local CI Validation

To catch CI failures before pushing:
```bash
# Run the full CI check locally
npm run typecheck && npm run lint && npm test
```

---

## Visual Comparison Feature (Active Development)

### Feature Overview
Side-by-side visual comparison of remediation changes with:
- XML diff view with syntax highlighting
- Issue navigation (prev/next)
- Filtering by type, severity, status
- PDF export for compliance documentation (Phase 2)

### Implementation Status
- [ ] B1: Database schema
- [ ] B2: Comparison service
- [ ] B3: Controller & routes
- [ ] B4: Remediation service integration
- [ ] F1: Types & API service
- [ ] F2: React Query hooks
- [ ] F3: UI components
- [ ] F4: Page & route integration

### New Models
- `RemediationChange` - Individual change records
- `ComparisonReport` - Generated reports with PDF URLs
- `ChangeReview` - Review/approval records (Phase 3)

### New Files
**Backend:**
- `src/services/comparison/comparison.service.ts`
- `src/controllers/comparison.controller.ts`
- `src/routes/comparison.routes.ts`
- `src/types/comparison.types.ts`

**Frontend:**
- `src/pages/ComparisonPage.tsx`
- `src/components/comparison/*`
- `src/services/comparison.service.ts`
- `src/hooks/useComparison.ts`

### API Endpoints
- `GET /api/v1/jobs/:jobId/comparison` - Get comparison data
- `GET /api/v1/jobs/:jobId/comparison/changes/:changeId` - Single change
- `GET /api/v1/jobs/:jobId/comparison/filter` - Filtered results
- `POST /api/v1/jobs/:jobId/comparison/export-pdf` - Export PDF (Phase 2)

### Session Checkpoint
**Updated:** [DATE TIME]
**Last completed:** [Step name]
**Next step:** [Step name]
**Blockers:** [None / Description]

---

## PDF Accessibility Sprint - Frontend (Active Development)

### Feature Overview
React UI for PDF accessibility audit results:
- PDF audit results display with Matterhorn Protocol summary
- Issue navigation with page-level grouping
- PDF preview panel with issue highlighting
- Reuses 80% of EPUB components (AuditHeader, ScoreDisplay, IssueCard)

### New Files
**Frontend:**
- `src/pages/PdfAuditResultsPage.tsx`
- `src/components/pdf/MatterhornSummary.tsx`
- `src/components/pdf/PdfPageNavigator.tsx`
- `src/components/pdf/PdfPreviewPanel.tsx`
- `src/services/api/pdfAuditApi.ts`
- `src/hooks/usePdfAudit.ts`
- `src/types/pdf.types.ts`

### Updated Files (Shared Components)
- `src/components/shared/FileUpload.tsx` - Add PDF MIME type
- `src/components/shared/IssueCard.tsx` - Add Matterhorn checkpoint display

### Session Checkpoint (PDF Sprint)
**Updated:** January 29, 2026
**Current Story:** Not started
**Last completed:** Setup - CLAUDE.md updated
**Next step:** FE-PDF-8 - TypeScript types (start with types before components)

---

## Key Directories

### Backend (`ninja-backend`)

```
src/
├── controllers/     # Route handlers
├── services/        # Business logic
│   ├── comparison/  # NEW: Visual Comparison service
│   └── ...
├── routes/          # Express route definitions
├── middleware/      # Auth, validation, error handling
├── schemas/         # Zod validation schemas
├── types/           # TypeScript types
│   ├── comparison.types.ts  # NEW
│   └── ...
├── utils/           # Helpers and utilities
prisma/
├── schema.prisma    # Database schema
├── migrations/      # Migration files
.github/
└── workflows/       # CI/CD pipelines
```

### Frontend (`ninja-frontend`)

```
src/
├── components/      # Reusable UI components
│   ├── ui/          # Base components (Button, Card, etc.)
│   ├── files/       # Files-related components
│   ├── epub/        # EPUB audit/remediation components
│   ├── comparison/  # NEW: Visual Comparison components
│   └── acr/         # ACR workflow components
├── pages/           # Route pages
│   ├── ComparisonPage.tsx  # NEW
│   └── ...
├── services/        # API service functions
│   ├── comparison.service.ts  # NEW
│   └── ...
├── hooks/           # React Query hooks
│   ├── useComparison.ts  # NEW
│   └── ...
├── types/           # TypeScript types
│   ├── comparison.ts  # NEW
│   └── ...
├── utils/           # Helper functions
.github/
└── workflows/       # CI/CD pipelines
```

---

## Development Workflow

### Making Changes

1. **Create feature branch:**
   ```bash
   git checkout main && git pull && git checkout -b feature/feature-name
   ```

2. **Develop in Replit** using prompts provided by Claude

3. **Commit and push:**
   ```bash
   git add .
   git commit -m "feat: description"
   git push -u origin feature/feature-name
   ```

4. **Create PR:**
   ```bash
   gh pr create --title "feat: Title" --body "Description"
   ```

5. **Address CodeRabbit review comments**

6. **Merge to main** triggers deployment to staging

### Commit Message Convention

```
<type>: <description>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `chore`, `ci`, `refactor`, `docs`, `test`

### Multi-Session Workflow

When resuming work after a break:

1. **Pull latest changes:**
   ```bash
   git pull origin feature/visual-comparison
   ```

2. **Check checkpoint** in this file (Session Checkpoint section)

3. **Review pending items:**
   - CodeRabbit comments on open PR
   - CI/CD test results
   - Any blockers noted

4. **Continue from checkpoint** with context prompt:
   ```
   Continuing Visual Comparison implementation.
   Status: [from checkpoint]
   Next: [from checkpoint]
   ```

---

## Database

### Prisma Commands

```bash
# Generate Prisma client
npx prisma generate

# Create migration (dev only)
npx prisma migrate dev --name migration_name

# Apply migrations to staging/production
DATABASE_URL="..." npx prisma migrate deploy

# Mark migration as applied (baseline)
DATABASE_URL="..." npx prisma migrate resolve --applied migration_name

# View database in browser
npx prisma studio
```

### New Models (Visual Comparison)

```prisma
model RemediationChange {
  id              String       @id @default(uuid())
  jobId           String
  job             Job          @relation(fields: [jobId], references: [id], onDelete: Cascade)
  changeNumber    Int
  filePath        String
  changeType      String
  description     String
  beforeContent   String?      @db.Text
  afterContent    String?      @db.Text
  severity        String?
  wcagCriteria    String?
  status          ChangeStatus @default(APPLIED)
  appliedAt       DateTime     @default(now())

  @@index([jobId])
  @@index([status])
}

enum ChangeStatus {
  APPLIED
  REJECTED
  REVERTED
  FAILED
  SKIPPED
}

model ComparisonReport {
  id              String   @id @default(uuid())
  jobId           String   @unique
  job             Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  totalChanges    Int
  appliedCount    Int
  rejectedCount   Int
  reportData      Json?
  pdfUrl          String?
  generatedAt     DateTime @default(now())
}
```

### Staging Database

**Connection details are stored securely:**
- Database credentials and connection strings are stored in **Bitwarden** (team vault) and **AWS Secrets Manager**
- Never commit database URLs or credentials to git
- Access staging database connection info from:
  - Bitwarden: Search for "Ninja Staging Database"
  - AWS Secrets Manager: `ninja/staging/database`

---

## Testing Patterns

### Backend (Jest)

```typescript
// Service test pattern
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

describe('ServiceName', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let service: ServiceClass;

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    service = new ServiceClass(prisma as unknown as PrismaClient);
  });

  afterEach(() => {
    mockReset(prisma);
  });

  it('should do something', async () => {
    prisma.model.findMany.mockResolvedValue([...]);
    const result = await service.method();
    expect(result).toEqual(...);
  });
});
```

### Frontend (Vitest + React Testing Library)

```typescript
// Component test pattern
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '../mocks/server';
import { rest } from 'msw';

describe('ComponentName', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  beforeEach(() => {
    server.use(
      rest.get('/api/endpoint', (req, res, ctx) => 
        res(ctx.json({ success: true, data: mockData }))
      )
    );
  });

  it('should render correctly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Component />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });
  });
});
```

### Running Tests

```bash
# Backend
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # With coverage

# Frontend
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm run test:coverage       # With coverage

# E2E (Playwright)
npx playwright test
npx playwright test --headed  # See browser
```

---

## AWS Infrastructure

### Key Resources

| Resource | Name/ID |
|----------|---------|
| ECS Cluster | `ninja-cluster` |
| ECS Service | `ninja-backend-task-service` |
| Task Definition | `ninja-backend-task` |
| ECR Repository | `ninja-backend` |
| CloudFront (Backend) | `d1ruc3qmc844x9.cloudfront.net` |
| CloudFront (Frontend) | `dhi5xqbewozlg.cloudfront.net` |
| S3 Bucket | `ninja-epub-staging` |

### GitHub Actions Variables

| Variable | Purpose |
|----------|---------|
| `ECS_SUBNETS` | VPC subnet IDs for ECS tasks |
| `ECS_SECURITY_GROUPS` | Security group for ECS tasks |
| `STAGING_API_URL` | Backend API URL for tests |

### IAM Permissions (github-actions-deploy)

Required permissions for CI/CD:
- `ecr:*` (push images)
- `ecs:*` (deploy services, run tasks)
- `iam:PassRole` (for ECS task roles)

---

## Key Patterns

### API Response Format

```typescript
// Success
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human readable message",
    details: [...]
  }
}
```

### React Query Hooks

```typescript
// Query hook
export function useFiles() {
  return useQuery({
    queryKey: ['files'],
    queryFn: () => filesService.list(),
  });
}

// Mutation hook
export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => filesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}
```

### Express Route Pattern

```typescript
// routes/example.routes.ts
router.get('/', authenticate, validate(schema), controller.method.bind(controller));

// Static routes BEFORE parameterized routes
router.get('/stats', ...);
router.post('/bulk/delete', ...);
router.get('/:id', ...);  // Parameterized route last
```

---

## Common Issues & Solutions

### CORS Errors on Staging

- Check CloudFront Origin Request Policy is set to `CORS-S3Origin`
- Verify `corsOrigins` in backend config includes frontend domain

### WAF Blocking File Uploads

- **Symptom:** `403 Forbidden` with `x-cache: Error from cloudfront` on multipart uploads
- **Cause:** CloudFront WAF "Core protections" blocks multipart/form-data
- **Solution:** Use presigned S3 URLs for direct uploads (see PRESIGNED_S3_UPLOAD_DESIGN.md)

### Prisma Migration Issues

- **"Column does not exist":** Migration not applied to database
- **"No migrations found":** Need to baseline existing database
- **Drift detected:** Dev and staging databases out of sync

### ECS Task Failures

- Check CloudWatch logs: `/ecs/ninja-backend-task`
- Verify IAM permissions for the task execution role
- Check security group allows outbound traffic

---

## File-Specific Notes

### Files Page Features

1. ✅ Bulk Actions (select, delete, audit)
2. ✅ Click Row to View Details (modal)
3. 🔲 Pagination
4. 🔲 Filter/Search
5. 🔲 Download File

### EPUB Workflow

1. Upload EPUB file
2. Run accessibility audit (ACE)
3. View audit results with issues
4. Create remediation plan
5. Apply fixes (auto/manual)
6. **NEW: Review changes (Visual Comparison)**
7. Re-audit to verify fixes
8. Export remediated EPUB

---

## Useful Commands

### AWS CLI

```bash
# Tail backend logs
aws logs tail /ecs/ninja-backend-task --follow

# Check ECS service
aws ecs describe-services --cluster ninja-cluster --services ninja-backend-task-service

# Get network config
aws ecs describe-services --cluster ninja-cluster --services ninja-backend-task-service --query 'services[0].networkConfiguration'
```

### GitHub CLI

```bash
# List PRs
gh pr list

# Create PR
gh pr create --title "Title" --body "Body"

# Re-run failed workflow
gh run rerun --failed

# Set repository variable
gh variable set VAR_NAME --body "value"
```

---

## Related Documentation

- [Visual Comparison Design](./VISUAL_COMPARISON_DESIGN.md) - Feature design
- [Visual Comparison Prompts](./VISUAL_COMPARISON_IMPLEMENTATION_PROMPTS.md) - Implementation prompts
- [Visual Comparison Tests](./VISUAL_COMPARISON_TESTS.md) - Test specifications
- [Workflow Lineage Design](./WORKFLOW_LINEAGE_DESIGN.md) - Workflow tracking
- [Feedback Enhancement Design](./FEEDBACK_ENHANCEMENT_DESIGN.md) - Feedback features
- [EPUB User Guide](./EPUB_AUDIT_REMEDIATION_USER_GUIDE.md) - User documentation

---

*Last updated: February 19, 2026*

---

## Workflow Agent (Sprint 9-11)

### Architecture
- **Orchestration layer** — XState v5 state machine on backend, real-time UI on frontend
- 14 states, 4 phases, 4 HITL gates
- State persisted to PostgreSQL, cached in Redis
- Real-time updates via Socket.IO

### State Flow
```
UPLOAD_RECEIVED → PREPROCESSING → RUNNING_EPUBCHECK → RUNNING_ACE → RUNNING_AI_ANALYSIS
→ AWAITING_AI_REVIEW (Gate 1) → AUTO_REMEDIATION → AWAITING_REMEDIATION_REVIEW (Gate 2)
→ VERIFICATION_AUDIT → CONFORMANCE_MAPPING → AWAITING_CONFORMANCE_REVIEW (Gate 3)
→ ACR_GENERATION → AWAITING_ACR_SIGNOFF (Gate 4) → COMPLETED
```

### HITL Gates
- Gate 1 (AI Review): Conditionally skippable if all HIGH confidence
- Gate 2 (Remediation Review): NEVER skippable — manual fixes required
- Gate 3 (Conformance Review): NEVER skippable — legal requirement
- Gate 4 (ACR Sign-off): NEVER skippable — attestation required

### Key Directories (Frontend — T4 owns exclusively)
- `src/pages/Workflow*` — WorkflowStatusPage
- `src/components/workflow/` — PhaseProgressBar, WorkflowTimeline, StateIndicator, WorkflowStartDialog, WorkflowStartButton
- `src/hooks/useWorkflow.ts` — React Query hooks for all workflow + HITL endpoints
- `src/hooks/useWorkflowSocket.ts` — Socket.IO connection lifecycle hook
- `src/services/workflow.service.ts` — API service wrapping all backend endpoints
- `src/types/workflow.ts` — frontend re-exports from contracts

### Terminal Ownership (T4)
Branch: `feature/wf-frontend`
This is the only frontend terminal. T4 is allowed to modify ONE existing file: `src/App.tsx` (add workflow route).

### Backend API Endpoints (T4 consumes)
- `POST /api/v1/workflows` — start workflow
- `GET /api/v1/workflows/:id` — status
- `GET /api/v1/workflows/:id/timeline` — event history
- `POST /api/v1/workflows/:id/pause|resume|cancel|retry`
- `GET /api/v1/workflows/:id/hitl/pending` — pending review items
- `GET /api/v1/workflows/hitl/queue` — aggregated queue
- `POST /api/v1/workflows/:id/hitl/ai-review` — Gate 1 decisions
- `GET /api/v1/workflows/:id/hitl/remediation-items` — Gate 2 items
- `POST /api/v1/workflows/:id/hitl/remediation-fix` — manual fix
- `POST /api/v1/workflows/:id/hitl/remediation-complete` — complete Gate 2
- `POST /api/v1/workflows/:id/hitl/conformance-review` — Gate 3
- `POST /api/v1/workflows/:id/hitl/acr-signoff` — Gate 4 attestation

### WebSocket
- Namespace: `/workflow`
- Install: `npm install socket.io-client`
- Events: `workflow:state-change`, `workflow:hitl-required`, `workflow:remediation-progress`, `workflow:error`, `batch:progress`
- CSP headers already configured in `vite.config.ts` for `ws:`/`wss:`

### Service Pattern (functional, not class-based)
```typescript
export const workflowService = {
  async startWorkflow(fileId: string, options?: StartWorkflowRequest) { ... },
  async getWorkflow(id: string) { ... },
};
```

### Merge Order
T4 merges LAST — after T1 (state machine), T2 (HITL gateway), T3 (API + WebSocket) all merge to main.
