import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AnnotatorGuidePage from '../AnnotatorGuidePage';

function renderPage() {
  return render(
    <MemoryRouter>
      <AnnotatorGuidePage />
    </MemoryRouter>,
  );
}

describe('AnnotatorGuidePage', () => {
  it('renders the guide title from the bundled markdown', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: /Annotator's Guide/i }),
    ).toBeInTheDocument();
  });

  it('renders the major section headings the calibration team relies on', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 2, name: /Closing out a title/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /Status Tracker tab/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /FAQ/i })).toBeInTheDocument();
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
