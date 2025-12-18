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
import { VerificationQueuePage } from '@/pages/acr/VerificationQueuePage';

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
        </Route>

        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route path="/test/edition-selector" element={<TestEditionSelector />} />
        <Route path="/test/confidence-dashboard" element={<TestConfidenceDashboard />} />
        <Route path="/test/verification-queue" element={<TestVerificationQueue />} />

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
