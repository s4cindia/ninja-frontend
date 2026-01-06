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

## Key Directories

### Backend (`ninja-backend`)

```
src/
├── controllers/     # Route handlers
├── services/        # Business logic
├── routes/          # Express route definitions
├── middleware/      # Auth, validation, error handling
├── schemas/         # Zod validation schemas
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
│   └── acr/         # ACR workflow components
├── pages/           # Route pages
├── services/        # API service functions
├── hooks/           # React Query hooks
├── utils/           # Helper functions
├── types/           # TypeScript types
.github/
└── workflows/       # CI/CD pipelines
```

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

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `chore`, `ci`, `refactor`, `docs`, `test`

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

### Staging Database

- **Host:** `ep-falling-hall-a16iblwt-pooler.ap-southeast-1.aws.neon.tech`
- **Database:** `neondb`
- **Credentials:** Stored in Bitwarden and AWS Secrets Manager

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

## Common Issues & Solutions

### CORS Errors on Staging

- Check CloudFront Origin Request Policy is set to `CORS-S3Origin`
- Verify `corsOrigins` in backend config includes frontend domain

### Prisma Migration Issues

- **"Column does not exist":** Migration not applied to database
- **"No migrations found":** Need to baseline existing database
- **Drift detected:** Dev and staging databases out of sync

### ECS Task Failures

- Check CloudWatch logs: `/ecs/ninja-backend-task`
- Verify IAM permissions for the task execution role
- Check security group allows outbound traffic

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
6. Re-audit to verify fixes
7. Export remediated EPUB

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

## Related Documentation

- [Workflow Lineage Design](./WORKFLOW_LINEAGE_DESIGN.md) - Design for tracking document audit/remediation cycles
