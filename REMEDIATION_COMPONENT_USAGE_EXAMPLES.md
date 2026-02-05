# Remediation Components - Usage Examples

Quick reference guide for using the new remediation components.

---

## 1. RemediationSummary (Updated)

### Basic Usage

```tsx
import { RemediationSummary } from '@/components/remediation';

function MyPage() {
  return (
    <RemediationSummary
      contentType="epub"
      originalIssueCount={45}
      fixedIssueCount={40}
      remainingIssues={5}
      newIssues={0}
      jobId="job-123"
    />
  );
}
```

### With All New Features

```tsx
import { RemediationSummary } from '@/components/remediation';
import { useRemediationResults, useRunRemediationAgain } from '@/hooks';

function RemediationResultsPage({ jobId }: { jobId: string }) {
  const { data: results, isLoading } = useRemediationResults(jobId);
  const runAgainMutation = useRunRemediationAgain();

  if (isLoading) return <Spinner />;
  if (!results) return <Alert variant="error">Failed to load results</Alert>;

  return (
    <RemediationSummary
      contentType="epub"
      originalIssueCount={results.originalIssues}
      fixedIssueCount={results.fixedIssues}
      remainingIssues={results.remainingIssues}
      newIssues={results.newIssues}
      auditCoverage={results.auditCoverage}
      remainingIssuesList={results.remainingIssuesList}
      jobId={jobId}
      onViewDetails={() => navigate(`/jobs/${jobId}/details`)}
      onDownload={() => downloadFile(jobId)}
      onRunRemediationAgain={() => runAgainMutation.mutate(jobId)}
      onStartNew={() => navigate('/upload')}
    />
  );
}
```

### Alert Behavior Examples

**Scenario 1: Fully Compliant**
```tsx
<RemediationSummary
  originalIssueCount={45}
  fixedIssueCount={45}
  remainingIssues={0}
  newIssues={0}
  // Shows: ✅ "Fully Compliant! All accessibility issues have been resolved."
/>
```

**Scenario 2: New Issues Found**
```tsx
<RemediationSummary
  originalIssueCount={45}
  fixedIssueCount={45}
  remainingIssues={3}
  newIssues={3}
  // Shows: ⚠️ "New Issues Detected: All original issues were fixed, but 3 new issues were found during re-audit."
/>
```

**Scenario 3: Incomplete Remediation**
```tsx
<RemediationSummary
  originalIssueCount={45}
  fixedIssueCount={40}
  remainingIssues={8}
  newIssues={3}
  // Shows: ❌ "Remediation Incomplete: 8 issues remaining. This includes 3 new issues discovered during re-audit."
/>
```

---

## 2. AuditCoverageDisplay (New)

### Standalone Usage

```tsx
import { AuditCoverageDisplay } from '@/components/remediation';

function MyPage() {
  const coverage = {
    totalFiles: 24,
    filesScanned: 24,
    percentage: 100,
    fileCategories: {
      frontMatter: 3,
      chapters: 18,
      backMatter: 3,
    },
  };

  return <AuditCoverageDisplay coverage={coverage} />;
}
```

### With Incomplete Coverage (Shows Warning)

```tsx
const incompleteCoverage = {
  totalFiles: 24,
  filesScanned: 20,
  percentage: 83.33,
  fileCategories: {
    frontMatter: 3,
    chapters: 15,
    backMatter: 2,
  },
};

// Renders with orange progress bar and warning alert
<AuditCoverageDisplay coverage={incompleteCoverage} />
```

---

## 3. IssuesList (New)

### Basic Usage

```tsx
import { IssuesList } from '@/components/remediation';
import type { IssueWithNewFlag } from '@/types/remediation.types';

function MyPage() {
  const issues: IssueWithNewFlag[] = [
    {
      id: 'issue-1',
      code: 'WCAG2AA.Principle1.Guideline1_1.1_1_1.H37',
      message: 'Image missing alt attribute',
      severity: 'serious',
      filePath: 'OEBPS/chapter1.xhtml',
      location: 'line 42',
      isNew: true,
      wcagCriteria: ['1.1.1'],
    },
    {
      id: 'issue-2',
      code: 'WCAG2AA.Principle1.Guideline1_3.1_3_1.H49',
      message: 'Semantic markup not used for emphasis',
      severity: 'moderate',
      filePath: 'OEBPS/chapter1.xhtml',
      location: 'line 108',
      isNew: false,
      wcagCriteria: ['1.3.1'],
    },
  ];

  return <IssuesList issues={issues} />;
}
```

### Integrated with RemediationSummary

```tsx
// RemediationSummary automatically renders IssuesList when remainingIssuesList is provided
<RemediationSummary
  // ... other props
  remainingIssuesList={results.remainingIssuesList}
/>
```

---

## 4. ComparisonView (Updated)

### With Improvement Metrics

```tsx
import { ComparisonView } from '@/components/remediation';

function ComparisonPage({ jobId }: { jobId: string }) {
  const improvement = {
    scoreChange: 15,
    issuesFixed: 40,
    newIssuesFound: 3,
    beforeScore: 65,
    afterScore: 80,
    beforeIssueCount: 45,
    afterIssueCount: 8,
  };

  return (
    <ComparisonView
      jobId={jobId}
      contentType="epub"
      improvement={improvement}
      onBack={() => navigate(`/jobs/${jobId}`)}
    />
  );
}
```

### With Criterion Filter

```tsx
// Show only changes related to WCAG 1.1.1
<ComparisonView
  jobId={jobId}
  contentType="epub"
  criterionId="1.1.1"
  improvement={improvement}
/>
```

---

## 5. React Query Hooks

### useRemediationResults

```tsx
import { useRemediationResults } from '@/hooks';

function MyComponent({ jobId }: { jobId: string }) {
  const { data, isLoading, error, refetch } = useRemediationResults(jobId);

  if (isLoading) return <Spinner />;
  if (error) return <Alert variant="error">Error loading results</Alert>;

  return (
    <div>
      <p>Original Issues: {data.originalIssues}</p>
      <p>Fixed Issues: {data.fixedIssues}</p>
      <p>New Issues: {data.newIssues}</p>
      <p>Remaining Issues: {data.remainingIssues}</p>
      <Button onClick={() => refetch()}>Refresh</Button>
    </div>
  );
}
```

### useRunRemediationAgain

```tsx
import { useRunRemediationAgain } from '@/hooks';
import { toast } from 'react-hot-toast';

function MyComponent({ jobId }: { jobId: string }) {
  const runAgainMutation = useRunRemediationAgain();

  const handleRunAgain = () => {
    runAgainMutation.mutate(jobId, {
      onSuccess: () => {
        toast.success('Remediation restarted successfully');
      },
      onError: (error) => {
        toast.error(`Failed to restart remediation: ${error.message}`);
      },
    });
  };

  return (
    <Button
      onClick={handleRunAgain}
      disabled={runAgainMutation.isPending}
    >
      {runAgainMutation.isPending ? 'Starting...' : 'Run Remediation Again'}
    </Button>
  );
}
```

### useTriggerReAudit

```tsx
import { useTriggerReAudit } from '@/hooks';

function MyComponent({ jobId }: { jobId: string }) {
  const reAuditMutation = useTriggerReAudit();

  const handleReAudit = () => {
    reAuditMutation.mutate(jobId, {
      onSuccess: () => {
        toast.success('Re-audit triggered');
      },
    });
  };

  return (
    <Button onClick={handleReAudit}>
      Re-Audit Document
    </Button>
  );
}
```

---

## 6. Complete Page Example

```tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RemediationSummary, ComparisonView } from '@/components/remediation';
import { useRemediationResults, useRunRemediationAgain } from '@/hooks';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Tabs } from '@/components/ui/Tabs';
import { toast } from 'react-hot-toast';

export function RemediationResultsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'summary' | 'comparison'>('summary');

  const { data: results, isLoading, error } = useRemediationResults(jobId!);
  const runAgainMutation = useRunRemediationAgain();

  const handleRunAgain = () => {
    runAgainMutation.mutate(jobId!, {
      onSuccess: () => {
        toast.success('Remediation restarted');
        // Optionally redirect to progress page
        navigate(`/jobs/${jobId}/progress`);
      },
      onError: (err) => {
        toast.error(`Failed to restart: ${err.message}`);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error">
        Failed to load remediation results. Please try again.
      </Alert>
    );
  }

  const improvement = {
    scoreChange: (results.afterScore || 0) - (results.beforeScore || 0),
    issuesFixed: results.fixedIssues,
    newIssuesFound: results.newIssues,
    beforeScore: results.beforeScore,
    afterScore: results.afterScore,
    beforeIssueCount: results.originalIssues,
    afterIssueCount: results.remainingIssues,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Remediation Results</h1>

      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'summary' | 'comparison')}
        tabs={[
          { value: 'summary', label: 'Summary' },
          { value: 'comparison', label: 'Comparison' },
        ]}
      />

      {activeTab === 'summary' && (
        <RemediationSummary
          contentType="epub"
          originalIssueCount={results.originalIssues}
          fixedIssueCount={results.fixedIssues}
          remainingIssues={results.remainingIssues}
          newIssues={results.newIssues}
          auditCoverage={results.auditCoverage}
          remainingIssuesList={results.remainingIssuesList}
          jobId={jobId!}
          onViewDetails={() => navigate(`/jobs/${jobId}/details`)}
          onDownload={() => {
            // Download logic
            window.open(`/api/v1/jobs/${jobId}/download`, '_blank');
          }}
          onRunRemediationAgain={handleRunAgain}
          onStartNew={() => navigate('/upload')}
        />
      )}

      {activeTab === 'comparison' && (
        <ComparisonView
          jobId={jobId!}
          contentType="epub"
          improvement={improvement}
          onBack={() => setActiveTab('summary')}
        />
      )}
    </div>
  );
}
```

---

## 7. Type Imports

```tsx
// Import types for TypeScript
import type {
  AuditCoverage,
  RemediationResultsData,
  IssueWithNewFlag,
} from '@/types/remediation.types';

// Use in component props
interface MyComponentProps {
  coverage: AuditCoverage;
  results: RemediationResultsData;
  issues: IssueWithNewFlag[];
}
```

---

## 8. Conditional Rendering Patterns

### Show Coverage Only If Available

```tsx
{auditCoverage && (
  <AuditCoverageDisplay coverage={auditCoverage} />
)}
```

### Show Issues List Only If Has Issues

```tsx
{remainingIssuesList && remainingIssuesList.length > 0 && (
  <IssuesList issues={remainingIssuesList} />
)}
```

### Show Run Again Button Only If Not Compliant

```tsx
{remainingIssues > 0 && (
  <Button onClick={handleRunAgain}>
    Run Remediation Again
  </Button>
)}
```

---

## 9. Error Handling

```tsx
import { useRemediationResults } from '@/hooks';
import { getErrorMessage } from '@/services/api';

function MyComponent({ jobId }: { jobId: string }) {
  const { data, error } = useRemediationResults(jobId);

  if (error) {
    const errorMessage = getErrorMessage(error);
    return (
      <Alert variant="error">
        <div>
          <strong>Error loading remediation results</strong>
          <p className="text-sm mt-1">{errorMessage}</p>
        </div>
      </Alert>
    );
  }

  // ... rest of component
}
```

---

## 10. Loading States

```tsx
function MyComponent({ jobId }: { jobId: string }) {
  const { data, isLoading } = useRemediationResults(jobId);
  const runAgainMutation = useRunRemediationAgain();

  return (
    <div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
          <span className="ml-3 text-gray-600">Loading results...</span>
        </div>
      ) : (
        <RemediationSummary
          // ... props
          onRunRemediationAgain={() => runAgainMutation.mutate(jobId)}
        />
      )}

      {runAgainMutation.isPending && (
        <Alert variant="info">
          Restarting remediation process...
        </Alert>
      )}
    </div>
  );
}
```

---

## Quick Tips

1. **Always check for data before rendering:**
   ```tsx
   if (!results) return <Spinner />;
   ```

2. **Use optional chaining for nested data:**
   ```tsx
   coverage={results?.auditCoverage}
   ```

3. **Provide fallback values:**
   ```tsx
   newIssues={results?.newIssues ?? 0}
   ```

4. **Handle mutation states:**
   ```tsx
   disabled={mutation.isPending}
   ```

5. **Show toast notifications:**
   ```tsx
   onSuccess: () => toast.success('Success!')
   onError: (err) => toast.error(getErrorMessage(err))
   ```

---

*Quick Reference Guide - Last Updated: 2026-02-05*
