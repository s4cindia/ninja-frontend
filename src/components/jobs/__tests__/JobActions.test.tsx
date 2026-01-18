import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { JobActions } from '../JobActions';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('JobActions', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
  };

  it('renders all three action buttons', () => {
    renderWithRouter(<JobActions jobId="test-123" />);

    expect(screen.getByText(/start remediation/i)).toBeInTheDocument();
    expect(screen.getByText(/download report/i)).toBeInTheDocument();
    expect(screen.getByText(/re-audit/i)).toBeInTheDocument();
  });

  it('navigates to remediation page on Start Remediation click', () => {
    renderWithRouter(<JobActions jobId="test-123" />);

    fireEvent.click(screen.getByText(/start remediation/i));

    expect(mockNavigate).toHaveBeenCalledWith('/remediation/test-123');
  });

  it('disables all buttons when loading is true', () => {
    renderWithRouter(<JobActions jobId="test-123" loading={true} />);

    expect(screen.getByText(/start remediation/i).closest('button')).toBeDisabled();
  });

  it('disables Download Report when no handler provided', () => {
    renderWithRouter(<JobActions jobId="test-123" />);

    const downloadBtn = screen.getByText(/download report/i).closest('button');
    expect(downloadBtn).toBeDisabled();
  });

  it('enables Download Report when handler is provided', () => {
    const mockHandler = vi.fn();
    renderWithRouter(<JobActions jobId="test-123" onDownloadReport={mockHandler} />);

    const downloadBtn = screen.getByText(/download report/i).closest('button');
    expect(downloadBtn).not.toBeDisabled();

    fireEvent.click(downloadBtn!);
    expect(mockHandler).toHaveBeenCalled();
  });
});
