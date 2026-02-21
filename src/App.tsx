import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Dashboard } from '@/pages/Dashboard';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Products } from '@/pages/Products';
import { Jobs } from '@/pages/Jobs';
import { JobDetails } from '@/pages/JobDetails';
import { Files } from '@/pages/Files';
import { NotFound } from '@/pages/NotFound';
import { Unauthorized } from '@/pages/Unauthorized';
import { ValidationResults } from '@/pages/ValidationResults';
import { Section508Page } from '@/pages/compliance/Section508Page';
import { FpcPage } from '@/pages/compliance/FpcPage';
import { TestEditionSelector } from '@/pages/test/TestEditionSelector';
import { TestConfidenceDashboard } from '@/pages/test/TestConfidenceDashboard';
import { TestVerificationQueue } from '@/pages/test/TestVerificationQueue';
import { TestAcrEditor } from '@/pages/test/TestAcrEditor';
import TestExportDialog from '@/pages/test/TestExportDialog';
import TestVersionHistory from '@/pages/test/TestVersionHistory';
import TestAcrWorkflow from '@/pages/test/TestAcrWorkflow';
import { TestAltTextGenerator } from '@/pages/test/TestAltTextGenerator';
import { TestAltTextReviewQueue } from '@/pages/test/TestAltTextReviewQueue';
import { TestImagePreviewCard } from '@/pages/test/TestImagePreviewCard';
import { TestBatchApprovalPanel } from '@/pages/test/TestBatchApprovalPanel';
import { TestChartDescriptionViewer } from '@/pages/test/TestChartDescriptionViewer';
import { TestLongDescriptionEditor } from '@/pages/test/TestLongDescriptionEditor';
import { TestCitationComponents } from '@/test-pages/TestCitationComponents';
import { VerificationQueuePage } from '@/pages/acr/VerificationQueuePage';
import { AcrEditorPage } from '@/pages/acr/AcrEditorPage';
import { AcrWorkflowPage } from '@/pages/acr/AcrWorkflowPage';
import AcrAnalysisPage from '@/pages/acr/AcrAnalysisPage';
import { AcrReportReviewPage } from '@/pages/acr/AcrReportReviewPage';
import { EPUBAccessibility } from '@/pages/EPUBAccessibility';
import { EPUBRemediation } from '@/pages/EPUBRemediation';
import { EPUBComparison } from '@/pages/EPUBComparison';
import { PdfAccessibilityPage } from '@/pages/PdfAccessibilityPage';
import { PdfAuditResultsPage } from '@/pages/PdfAuditResultsPage';
import { PdfRemediationPlanPage } from '@/pages/PdfRemediationPlanPage';
import { FeedbackDashboard } from '@/pages/FeedbackDashboard';
import { RemediationPage } from '@/pages/Remediation';
import { ComparisonPage } from '@/pages/ComparisonPage';
import BatchRemediationPage from '@/pages/BatchRemediation';
import BatchAcrListPage from '@/pages/BatchAcrListPage';
import BatchCreationPage from '@/pages/BatchCreationPage';
import BatchProcessingPage from '@/pages/BatchProcessingPage';
import BatchResultsPage from '@/pages/BatchResultsPage';
import BatchFileDetailsPage from '@/pages/BatchFileDetailsPage';
import BatchListPage from '@/pages/BatchListPage';
import Settings from '@/pages/Settings';
import { EditorialLayout } from '@/components/editorial';
import {
  EditorialDashboardPage,
  EditorialUploadPage,
  PlagiarismPage,
  StylePage,
  ReportsPage,
  EditorialDocumentsPage,
  EditorialDocumentOverviewPage,
} from '@/pages/editorial';
import CitationUploadPage from '@/pages/CitationUploadPage';
import CitationAnalysisPage from '@/pages/CitationAnalysisPage';
import CitationManuscriptPage from '@/pages/CitationManuscriptPage';
import CitationEditorPage from '@/pages/CitationEditorPage';
import TestEditorPage from '@/pages/TestEditorPage';
import FullEditorPage from '@/pages/FullEditorPage';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 3,
    },
  },
});

queryClient.setQueryDefaults(['visual-comparison'], {
  staleTime: 0,
  gcTime: 30000,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  retry: 1,
});

function VisualQueryCacheCleaner() {
  useEffect(() => {
    const intervalId = setInterval(() => {
      const queryCache = queryClient.getQueryCache();
      const allQueries = queryCache.getAll();

      const visualQueries = allQueries.filter(q =>
        Array.isArray(q.queryKey) && q.queryKey[0] === 'visual-comparison'
      );

      const sortedQueries = visualQueries.sort((a, b) =>
        (b.state.dataUpdatedAt || 0) - (a.state.dataUpdatedAt || 0)
      );

      const queriesToRemove = sortedQueries.slice(2);

      if (queriesToRemove.length > 0) {
        if (import.meta.env.DEV) {
          console.log(`[Cache Cleanup] Removing ${queriesToRemove.length} old visual queries`);
        }
        queriesToRemove.forEach(query => {
          queryClient.removeQueries({ queryKey: query.queryKey, exact: true });
        });
      }

      if (import.meta.env.DEV) {
        const remainingVisualQueries = queryCache.getAll().filter(q =>
          Array.isArray(q.queryKey) && q.queryKey[0] === 'visual-comparison'
        ).length;
        console.log(`[Cache Cleanup] Visual queries remaining: ${remainingVisualQueries}`);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  return null;
}

function SessionExpiryHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleSessionExpired = () => {
      navigate('/login', { state: { message: 'Your session has expired. Please log in again.' } });
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [navigate]);

  return null;
}

// Redirect component that preserves jobId parameter for citation routes
function RedirectCitationWithJobId() {
  const { jobId } = useParams<{ jobId: string }>();
  // Redirect to the citation editor with the jobId as documentId
  return <Navigate to={jobId ? `/citation/editor/${jobId}` : '/citation/upload'} replace />;
}

function AppRoutes() {
  return (
    <>
      <SessionExpiryHandler />
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:jobId" element={<JobDetails />} />
          <Route path="/files" element={<Files />} />
          <Route path="/validation/:fileId" element={<ValidationResults />} />
          <Route path="/compliance/section508/:fileId" element={<Section508Page />} />
          <Route path="/compliance/fpc/:fileId" element={<FpcPage />} />
          <Route path="/acr/verification/:jobId" element={<VerificationQueuePage />} />
          <Route path="/acr/editor/:jobId" element={<AcrEditorPage />} />
          <Route path="/acr/analysis/:jobId" element={<AcrAnalysisPage />} />
          <Route path="/acr/workflow" element={<AcrWorkflowPage />} />
          <Route path="/acr/workflow/:jobId" element={<AcrWorkflowPage />} />
          <Route path="/acr/report/review/:jobId" element={<AcrReportReviewPage />} />
          <Route path="/epub" element={<EPUBAccessibility />} />
          <Route path="/epub/remediate/:jobId" element={<EPUBRemediation />} />
          <Route path="/epub/compare/:jobId" element={<EPUBComparison />} />
          <Route path="/pdf" element={
            <ErrorBoundary>
              <PdfAccessibilityPage />
            </ErrorBoundary>
          } />
          <Route path="/pdf/audit/:jobId" element={
            <ErrorBoundary>
              <PdfAuditResultsPage />
            </ErrorBoundary>
          } />
          <Route path="/pdf/:jobId/remediation" element={
            <ErrorBoundary>
              <PdfRemediationPlanPage />
            </ErrorBoundary>
          } />
          <Route path="/feedback" element={<FeedbackDashboard />} />
          <Route path="/remediation" element={<RemediationPage />} />
          <Route path="/remediation/batch" element={<BatchRemediationPage />} />
          <Route path="/remediation/batch/:batchId" element={<BatchRemediationPage />} />
          <Route path="/remediation/:jobId" element={<RemediationPage />} />
          <Route path="/remediation/:jobId/comparison" element={<ComparisonPage />} />
          <Route path="/acr/batch/:batchId/list" element={<BatchAcrListPage />} />
          <Route path="/batch/new" element={<BatchCreationPage />} />
          <Route path="/batch/:batchId" element={<BatchProcessingPage />} />
          <Route path="/batch/:batchId/results" element={<BatchResultsPage />} />
          <Route path="/batch/:batchId/file/:fileId" element={<BatchFileDetailsPage />} />
          <Route path="/batches" element={<BatchListPage />} />
          <Route path="/batches/new" element={<BatchCreationPage />} />
          <Route path="/settings" element={<Settings />} />

          {/* Editorial Services Routes */}
          <Route path="/editorial" element={<EditorialLayout />}>
            <Route index element={<EditorialDashboardPage />} />
            <Route path="upload" element={<EditorialUploadPage />} />
            <Route path="documents" element={<EditorialDocumentsPage />} />
            <Route path="documents/:documentId" element={<EditorialDocumentOverviewPage />} />
            {/* Redirect old citations to new Citation Intelligence Tool */}
            <Route path="citations" element={<Navigate to="/citation/upload" replace />} />
            <Route path="citations/:jobId" element={<RedirectCitationWithJobId />} />
            <Route path="plagiarism" element={<PlagiarismPage />} />
            <Route path="plagiarism/:jobId" element={<PlagiarismPage />} />
            <Route path="style" element={<StylePage />} />
            <Route path="style/:jobId" element={<StylePage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/:jobId" element={<ReportsPage />} />
          </Route>

          {/* Citation Intelligence Tool Routes */}
          <Route path="/citation/upload" element={<CitationUploadPage />} />
          <Route path="/citation/analysis/:documentId" element={<CitationAnalysisPage />} />
          <Route path="/citation/manuscript/:documentId" element={<CitationManuscriptPage />} />
          <Route path="/citation/editor/:documentId" element={<CitationEditorPage />} />

          {/* Test Editor Page (protected) */}
          <Route path="/test/editor" element={<TestEditorPage />} />
        </Route>

        {/* Full-screen editor (no layout wrapper, opens in new tab) */}
        <Route
          path="/editor/:documentId"
          element={
            <ProtectedRoute>
              <FullEditorPage />
            </ProtectedRoute>
          }
        />

        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route path="/test/edition-selector" element={<TestEditionSelector />} />
        <Route path="/test/confidence-dashboard" element={<TestConfidenceDashboard />} />
        <Route path="/test/verification-queue" element={<TestVerificationQueue />} />
        <Route path="/test/acr-editor" element={<TestAcrEditor />} />
        <Route path="/test/export-dialog" element={<TestExportDialog />} />
        <Route path="/test/version-history" element={<TestVersionHistory />} />
        <Route path="/test/acr-workflow" element={<TestAcrWorkflow />} />
        <Route path="/test/alt-text-generator" element={<TestAltTextGenerator />} />
        <Route path="/test/alt-text-review" element={<TestAltTextReviewQueue />} />
        <Route path="/test/image-preview" element={<TestImagePreviewCard />} />
        <Route path="/test/batch-approval" element={<TestBatchApprovalPanel />} />
        <Route path="/test/chart-description" element={<TestChartDescriptionViewer />} />
        <Route path="/test/long-description" element={<TestLongDescriptionEditor />} />
        <Route path="/test/citations" element={<TestCitationComponents />} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <VisualQueryCacheCleaner />
        <AppRoutes />
        <Toaster position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
