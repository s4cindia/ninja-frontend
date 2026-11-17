import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdministratorGuidePage from '../AdministratorGuidePage';

function renderPage() {
  return render(
    <MemoryRouter>
      <AdministratorGuidePage />
    </MemoryRouter>,
  );
}

describe('AdministratorGuidePage', () => {
  it('renders the guide title from the bundled markdown', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: /Ninja Platform.*Administrator Guide/i }),
    ).toBeInTheDocument();
  });

  it('renders the major section headings admins rely on', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 2, name: /PDF AI Remediation Defaults/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /User Management/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /Team Management/i }),
    ).toBeInTheDocument();
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
