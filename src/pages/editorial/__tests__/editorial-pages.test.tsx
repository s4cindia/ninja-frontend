import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { EditorialLayout } from '@/components/editorial';
import { EditorialDashboardPage } from '@/pages/editorial';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithRouter = (initialRoute: string) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/editorial" element={<EditorialLayout />}>
            <Route index element={<EditorialDashboardPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Editorial Services Dashboard', () => {
  it('renders editorial layout with section header', () => {
    renderWithRouter('/editorial');
    expect(screen.getByText('Editorial Services')).toBeInTheDocument();
  });

  it('renders Citation Management card', () => {
    renderWithRouter('/editorial');
    expect(screen.getByText('Citation Management')).toBeInTheDocument();
  });

  it('renders Validator card', () => {
    renderWithRouter('/editorial');
    expect(screen.getByText('Validator')).toBeInTheDocument();
  });

  it('renders Recent Activity section', () => {
    renderWithRouter('/editorial');
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('shows upload buttons for both modules', () => {
    renderWithRouter('/editorial');
    const uploadButtons = screen.getAllByText('Upload Document');
    expect(uploadButtons).toHaveLength(2);
  });
});
