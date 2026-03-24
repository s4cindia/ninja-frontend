import { Component, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import ZoneReviewWorkspace from '../../components/bootstrap/ZoneReviewWorkspace';

class ZoneReviewErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 text-gray-600">
          <h2 className="text-lg font-semibold text-red-600">Zone Review crashed</h2>
          <pre className="max-w-xl text-sm bg-gray-100 p-4 rounded overflow-auto">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ZoneReviewPage() {
  const { documentId } = useParams<{ documentId: string }>();
  if (!documentId) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Invalid document ID
      </div>
    );
  }
  return (
    <ZoneReviewErrorBoundary>
      <ZoneReviewWorkspace documentId={documentId} runId="" />
    </ZoneReviewErrorBoundary>
  );
}
