import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import OperatorGuidePage from '../OperatorGuidePage';

function renderPage() {
  return render(
    <MemoryRouter>
      <OperatorGuidePage />
    </MemoryRouter>,
  );
}

describe('OperatorGuidePage', () => {
  it('renders the guide title from the bundled markdown', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: /PDF AI Remediation.*Operator Guide/i }),
    ).toBeInTheDocument();
  });

  it('renders the major section headings operators rely on', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 2, name: /How This Platform Is Organized/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /Complete Operator Workflow/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /Feedback.*Defect Reporting/i }),
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
