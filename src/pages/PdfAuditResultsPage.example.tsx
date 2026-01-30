/**
 * Example usage of PdfAuditResultsPage
 *
 * This file demonstrates how to integrate and use the PdfAuditResultsPage
 * in your application routing.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { PdfAuditResultsPage } from './PdfAuditResultsPage';

// Example 1: Basic routing setup
export const BasicRoutingExample: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/pdf/audit/:jobId" element={<PdfAuditResultsPage />} />
      </Routes>
    </BrowserRouter>
  );
};

// Example 2: With navigation from upload page
export const WithNavigationExample: React.FC = () => {
  const handleUploadComplete = (jobId: string) => {
    // After upload completes, navigate to audit results
    window.location.href = `/pdf/audit/${jobId}`;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">PDF Upload</h1>
      <button
        onClick={() => handleUploadComplete('job-123')}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Simulate Upload Complete
      </button>
    </div>
  );
};

// Example 3: Complete routing with multiple pages
export const CompleteAppExample: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200 p-4">
          <div className="flex gap-4">
            <Link to="/" className="text-blue-600 hover:underline">
              Home
            </Link>
            <Link to="/pdf" className="text-blue-600 hover:underline">
              PDF Upload
            </Link>
            <Link to="/pdf/audit/demo-123" className="text-blue-600 hover:underline">
              View Demo Results
            </Link>
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pdf" element={<PdfUploadPage />} />
          <Route path="/pdf/audit/:jobId" element={<PdfAuditResultsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

const HomePage: React.FC = () => (
  <div className="p-6 max-w-4xl mx-auto">
    <h1 className="text-3xl font-bold mb-4">PDF Accessibility Tool</h1>
    <p className="text-gray-600 mb-6">
      Upload PDF files to audit their accessibility and get detailed reports with Matterhorn
      Protocol compliance.
    </p>
    <Link
      to="/pdf"
      className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Upload PDF
    </Link>
  </div>
);

const PdfUploadPage: React.FC = () => (
  <div className="p-6 max-w-4xl mx-auto">
    <h1 className="text-2xl font-bold mb-4">Upload PDF</h1>
    <p className="text-gray-600 mb-4">Upload your PDF to begin accessibility audit</p>
    <Link
      to="/pdf/audit/demo-123"
      className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      View Demo Results
    </Link>
  </div>
);

// Example 4: Programmatic navigation with React Router hook
export const ProgrammaticNavigationExample: React.FC = () => {
  const [jobId, setJobId] = React.useState('');

  return (
    <BrowserRouter>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Enter Job ID</h2>
        <input
          type="text"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          placeholder="Enter job ID"
          className="px-3 py-2 border border-gray-300 rounded mr-2"
        />
        <Link
          to={`/pdf/audit/${jobId}`}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          View Results
        </Link>

        <Routes>
          <Route path="/pdf/audit/:jobId" element={<PdfAuditResultsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

// Example 5: With error boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-red-800 font-bold mb-2">Something went wrong</h2>
            <p className="text-red-600">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const WithErrorBoundaryExample: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/pdf/audit/:jobId" element={<PdfAuditResultsPage />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

// Example 6: Integration with state management (Redux/Zustand)
interface AuditState {
  currentJobId: string | null;
  setCurrentJobId: (jobId: string) => void;
}

// Simulated state store
const useAuditStore = (() => {
  let state: AuditState = {
    currentJobId: null,
    setCurrentJobId: (jobId: string) => {
      state.currentJobId = jobId;
    },
  };

  return () => state;
})();

export const WithStateManagementExample: React.FC = () => {
  const store = useAuditStore();

  const handleJobComplete = (jobId: string) => {
    store.setCurrentJobId(jobId);
  };

  return (
    <BrowserRouter>
      <div className="p-6">
        <button
          onClick={() => handleJobComplete('job-456')}
          className="px-4 py-2 bg-blue-600 text-white rounded mb-4"
        >
          Start Audit
        </button>

        {store.currentJobId && (
          <Link
            to={`/pdf/audit/${store.currentJobId}`}
            className="block text-blue-600 hover:underline"
          >
            View Current Audit Results
          </Link>
        )}

        <Routes>
          <Route path="/pdf/audit/:jobId" element={<PdfAuditResultsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

// Example 7: URL sharing and deep linking
export const DeepLinkingExample: React.FC = () => {
  const shareResults = (jobId: string) => {
    const url = `${window.location.origin}/pdf/audit/${jobId}`;

    // Copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    } else {
      prompt('Copy this link:', url);
    }
  };

  return (
    <BrowserRouter>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Share Audit Results</h2>
        <button
          onClick={() => shareResults('job-789')}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Share Results Link
        </button>

        <div className="mt-6">
          <p className="text-sm text-gray-600 mb-2">Example shareable link:</p>
          <code className="block bg-gray-100 p-2 rounded text-sm">
            https://example.com/pdf/audit/job-789
          </code>
        </div>

        <Routes>
          <Route path="/pdf/audit/:jobId" element={<PdfAuditResultsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

// Example 8: Protected route with authentication
const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const isAuthenticated = true; // Replace with actual auth check

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-yellow-800 font-bold mb-2">Authentication Required</h2>
          <p className="text-yellow-700 mb-4">Please log in to view audit results</p>
          <button className="px-4 py-2 bg-yellow-600 text-white rounded">Log In</button>
        </div>
      </div>
    );
  }

  return children;
};

export const ProtectedRouteExample: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/pdf/audit/:jobId"
          element={
            <RequireAuth>
              <PdfAuditResultsPage />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

// Example 9: Multiple audit comparison
export const ComparisonExample: React.FC = () => {
  const [jobIds, setJobIds] = React.useState<string[]>([]);
  const [inputValue, setInputValue] = React.useState('');

  const addJobId = () => {
    if (inputValue && !jobIds.includes(inputValue)) {
      setJobIds([...jobIds, inputValue]);
      setInputValue('');
    }
  };

  return (
    <BrowserRouter>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Compare Multiple Audits</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter job ID"
            className="px-3 py-2 border border-gray-300 rounded"
          />
          <button
            onClick={addJobId}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Add
          </button>
        </div>

        <div className="space-y-2">
          {jobIds.map((jobId) => (
            <Link
              key={jobId}
              to={`/pdf/audit/${jobId}`}
              className="block px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
            >
              View Audit: {jobId}
            </Link>
          ))}
        </div>

        <Routes>
          <Route path="/pdf/audit/:jobId" element={<PdfAuditResultsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

// Example 10: API integration notes
/**
 * API Integration Requirements:
 *
 * The PdfAuditResultsPage expects the following API endpoint to be available:
 *
 * GET /pdf/job/:jobId/audit/result
 *
 * Expected response format:
 * {
 *   "data": {
 *     "id": "audit-123",
 *     "jobId": "job-123",
 *     "fileName": "document.pdf",
 *     "fileSize": 1024000,
 *     "pageCount": 10,
 *     "score": 75,
 *     "status": "completed",
 *     "createdAt": "2024-01-15T10:00:00Z",
 *     "completedAt": "2024-01-15T10:05:00Z",
 *     "issues": [...],
 *     "matterhornSummary": {...},
 *     "metadata": {...}
 *   }
 * }
 *
 * Status values: "pending" | "processing" | "completed" | "failed"
 *
 * The page will automatically poll every 5 seconds if status is "pending" or "processing"
 * until the audit is completed.
 *
 * Additional endpoints used:
 * - GET /pdf/job/:jobId/report?format=json|pdf|docx - Download report
 * - GET /pdf/job/:jobId/file - Get PDF file for preview
 */
