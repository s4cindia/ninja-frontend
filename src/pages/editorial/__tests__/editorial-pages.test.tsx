import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { EditorialLayout } from '@/components/editorial';
import {
  EditorialDashboardPage,
  EditorialUploadPage,
  CitationsPage,
  PlagiarismPage,
  StylePage,
  ReportsPage,
} from '@/pages/editorial';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithRouter = (initialRoute: string) => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/editorial" element={<EditorialLayout />}>
          <Route index element={<EditorialDashboardPage />} />
          <Route path="upload" element={<EditorialUploadPage />} />
          <Route path="citations" element={<CitationsPage />} />
          <Route path="citations/:jobId" element={<CitationsPage />} />
          <Route path="plagiarism" element={<PlagiarismPage />} />
          <Route path="plagiarism/:jobId" element={<PlagiarismPage />} />
          <Route path="style" element={<StylePage />} />
          <Route path="style/:jobId" element={<StylePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/:jobId" element={<ReportsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('Editorial Services Shell', () => {
  it('renders editorial layout with section header', () => {
    renderWithRouter('/editorial');
    expect(screen.getByText('Editorial Services')).toBeInTheDocument();
  });

  it('renders all navigation tabs', () => {
    renderWithRouter('/editorial');
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Citations')).toBeInTheDocument();
    expect(screen.getByText('Plagiarism')).toBeInTheDocument();
    expect(screen.getByText('Style')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('renders dashboard at /editorial', () => {
    renderWithRouter('/editorial');
    expect(screen.getByText('Citation Management')).toBeInTheDocument();
    expect(screen.getByText('Plagiarism Detection')).toBeInTheDocument();
    expect(screen.getByText('Style Validation')).toBeInTheDocument();
  });

  it('renders upload page at /editorial/upload', () => {
    renderWithRouter('/editorial/upload');
    expect(screen.getByText('Upload Document')).toBeInTheDocument();
  });

  it('renders citations page with jobId', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/editorial/citations/job-abc-123']}>
          <Routes>
            <Route path="/editorial" element={<EditorialLayout />}>
              <Route path="citations/:jobId" element={<CitationsPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText('Loading citation analysis, please wait...')).toBeInTheDocument();
  });

  it('renders citations job list without jobId', () => {
    renderWithRouter('/editorial/citations');
    expect(screen.getByText('Citation Analyses')).toBeInTheDocument();
  });

  it('renders plagiarism placeholder with sprint info', () => {
    renderWithRouter('/editorial/plagiarism/job-xyz-789');
    expect(screen.getByText('Plagiarism Detection')).toBeInTheDocument();
    expect(screen.getByText(/Sprint E1/)).toBeInTheDocument();
  });

  it('renders style placeholder with sprint info', () => {
    renderWithRouter('/editorial/style/job-xyz-789');
    expect(screen.getByText('Style Validation')).toBeInTheDocument();
    expect(screen.getByText(/Sprint E3/)).toBeInTheDocument();
  });

  it('renders reports page with jobId', () => {
    renderWithRouter('/editorial/reports/job-report-456');
    expect(screen.getByText('Editorial Report')).toBeInTheDocument();
    expect(screen.getByText('job-report-456')).toBeInTheDocument();
  });
});
