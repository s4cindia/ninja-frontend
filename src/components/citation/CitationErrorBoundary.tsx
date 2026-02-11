import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CitationErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface CitationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary for Citation Module
 * Catches React errors and displays user-friendly error message with retry
 */
export class CitationErrorBoundary extends Component<
  CitationErrorBoundaryProps,
  CitationErrorBoundaryState
> {
  constructor(props: CitationErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<CitationErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging
    console.error('[CitationErrorBoundary] Error caught:', error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          className="flex items-center justify-center h-full bg-red-50 border-2 border-red-200 rounded-lg p-8"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md text-center">
            {/* Error Icon */}
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden="true" />
              </div>
            </div>

            {/* Error Message */}
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-600 mb-6">
              An unexpected error occurred while displaying citations. This has been logged and
              we'll look into it.
            </p>

            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-white border border-red-200 rounded-lg text-left">
                <p className="text-xs font-mono text-red-800 mb-2">
                  <strong>Error:</strong> {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <details className="text-xs font-mono text-gray-600">
                    <summary className="cursor-pointer hover:text-gray-900 mb-2">
                      Stack trace
                    </summary>
                    <pre className="overflow-auto max-h-40 text-xs">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2"
                aria-label="Try again"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                aria-label="Reload page"
              >
                Reload Page
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 mt-6">
              If this problem persists, please contact support with the error details above.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
