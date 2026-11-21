import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import NinjaPlatformGuidePage from '../NinjaPlatformGuidePage';

function renderPage() {
  return render(
    <MemoryRouter>
      <NinjaPlatformGuidePage />
    </MemoryRouter>,
  );
}

describe('NinjaPlatformGuidePage', () => {
  it('renders the guide title from the bundled markdown', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: /Ninja Platform User Guide/i }),
    ).toBeInTheDocument();
  });

  it('renders the major section headings across all three roles', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 2, name: /Roles and Permissions/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /The Job Lifecycle at a Glance/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /QC and Team Review/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /Admin: Tenant Configuration Reference/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /Known Gaps and Notes/i }),
    ).toBeInTheDocument();
  });

  it('renders the job lifecycle diagram as a code block', () => {
    renderPage();
    expect(screen.getByText(/Upload -> Audit -> AI Review -> Remediate/)).toBeInTheDocument();
  });

  it('shows a Back link to the bootstrap console', () => {
    renderPage();
    const back = screen.getByRole('link', { name: /Back to Console/i });
    expect(back).toHaveAttribute('href', '/bootstrap');
  });

  it('Print button calls window.print', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Print/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});
