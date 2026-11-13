import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TeamLeaderGuidePage from '../TeamLeaderGuidePage';

function renderPage() {
  return render(
    <MemoryRouter>
      <TeamLeaderGuidePage />
    </MemoryRouter>,
  );
}

describe('TeamLeaderGuidePage', () => {
  it('renders the guide title from the bundled markdown', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: /Team Leader Guide/i }),
    ).toBeInTheDocument();
  });

  it('renders the major section headings Team Leaders rely on', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 2, name: /Platform Role vs\. Team Role/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /Assigning a Title to an Executive/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /QC Shipment Gate/i }),
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
