import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Dashboard } from '@/pages/Dashboard';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Products } from '@/pages/Products';
import { Jobs } from '@/pages/Jobs';
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
import { VerificationQueuePage } from '@/pages/acr/VerificationQueuePage';
import { AcrEditorPage } from '@/pages/acr/AcrEditorPage';
import { AcrWorkflowPage } from '@/pages/acr/AcrWorkflowPage';
import { EPUBAccessibility } from '@/pages/EPUBAccessibility';
import { EPUBRemediation } from '@/pages/EPUBRemediation';
import { EPUBComparison } from '@/pages/EPUBComparison';
import { FeedbackDashboard } from '@/pages/FeedbackDashboard';
import { RemediationPage } from '@/pages/Remediation';
import { ComparisonPage } from '@/pages/ComparisonPage';
import BatchRemediationPage from '@/pages/BatchRemediation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

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
          <Route path="/files" element={<Files />} />
          <Route path="/validation/:fileId" element={<ValidationResults />} />
          <Route path="/compliance/section508/:fileId" element={<Section508Page />} />
          <Route path="/compliance/fpc/:fileId" element={<FpcPage />} />
          <Route path="/acr/verification/:jobId" element={<VerificationQueuePage />} />
          <Route path="/acr/editor/:jobId" element={<AcrEditorPage />} />
          <Route path="/acr/workflow" element={<AcrWorkflowPage />} />
          <Route path="/acr/workflow/:jobId" element={<AcrWorkflowPage />} />
          <Route path="/epub" element={<EPUBAccessibility />} />
          <Route path="/epub/remediate/:jobId" element={<EPUBRemediation />} />
          <Route path="/epub/compare/:jobId" element={<EPUBComparison />} />
          <Route path="/feedback" element={<FeedbackDashboard />} />
          <Route path="/remediation" element={<RemediationPage />} />
          <Route path="/remediation/batch" element={<BatchRemediationPage />} />
          <Route path="/remediation/:jobId" element={<RemediationPage />} />
          <Route path="/remediation/:jobId/comparison" element={<ComparisonPage />} />
        </Route>

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
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
