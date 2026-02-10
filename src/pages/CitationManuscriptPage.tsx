/**
 * Citation Intelligence Tool - Interactive Manuscript Editor
 * Features:
 * - Click citation → Jump to reference
 * - Click reference → Highlight all instances
 */

import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useManuscript } from '@/hooks/useCitationIntel';

export default function CitationManuscriptPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useManuscript(jobId);

  const manuscriptRef = useRef<HTMLDivElement>(null);

  // Handle citation click - scroll to reference
  const handleCitationClick = (citationNumber: number) => {
    const referenceElement = document.getElementById(`reference-${citationNumber}`);
    if (referenceElement) {
      referenceElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Highlight temporarily
      referenceElement.classList.add('reference-highlighted');
      setTimeout(() => {
        referenceElement.classList.remove('reference-highlighted');
      }, 2000);
    }
  };

  // Handle reference click - highlight all instances
  const handleReferenceClick = (refNumber: number) => {
    // Get all citation spans with this number
    const citationElements = manuscriptRef.current?.querySelectorAll(
      `[data-citation-number="${refNumber}"]`
    );

    if (citationElements && citationElements.length > 0) {
      // Scroll to first instance
      (citationElements[0] as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      // Add temporary highlight class to all instances
      citationElements.forEach((el) => {
        el.classList.add('citation-instance-highlighted');
      });

      // Clear after 5 seconds
      setTimeout(() => {
        citationElements.forEach((el) => {
          el.classList.remove('citation-instance-highlighted');
        });
      }, 5000);
    }
  };

  // Attach click handlers after HTML is rendered
  useEffect(() => {
    if (!data?.highlightedHtml || !manuscriptRef.current) return;

    const manuscript = manuscriptRef.current;

    // Citation click handlers
    const citationElements = manuscript.querySelectorAll('[data-citation-number]');
    citationElements.forEach((el) => {
      const citationNumber = parseInt(el.getAttribute('data-citation-number') || '0', 10);
      (el as HTMLElement).style.cursor = 'pointer';
      (el as HTMLElement).onclick = () => handleCitationClick(citationNumber);
    });

    // Reference click handlers
    const referenceElements = manuscript.querySelectorAll('[id^="reference-"]');
    referenceElements.forEach((el) => {
      const refNumber = parseInt((el.id || '').replace('reference-', ''), 10);
      (el as HTMLElement).style.cursor = 'pointer';
      (el as HTMLElement).onclick = () => handleReferenceClick(refNumber);
    });

    return () => {
      // Cleanup
      citationElements.forEach((el) => {
        (el as HTMLElement).onclick = null;
      });
      referenceElements.forEach((el) => {
        (el as HTMLElement).onclick = null;
      });
    };
  }, [data?.highlightedHtml]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Manuscript</h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error ? error.message : 'Failed to load manuscript content'}
          </p>
          <Button onClick={() => navigate(`/citation/analysis/${jobId}`)}>
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/citation/analysis/${jobId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Interactive Manuscript</h1>
              {data.filename && (
                <p className="text-gray-600">{data.filename}</p>
              )}
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">How to Use</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Click any citation (e.g., <span className="font-mono bg-blue-100 px-1 rounded">(1)</span>) to jump to its reference</li>
                <li>• Click any reference number to highlight all citations that reference it</li>
                <li>• Citations are color-coded: <span className="bg-green-200 px-1 rounded">matched</span> or <span className="bg-red-200 px-1 rounded">unmatched</span></li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Manuscript Content */}
        <Card className="p-8">
          <div
            ref={manuscriptRef}
            className="prose prose-sm max-w-none citation-manuscript"
            dangerouslySetInnerHTML={{ __html: data.highlightedHtml || '' }}
            onClick={(e) => {
              // Allow normal link behavior
              const target = e.target as HTMLElement;
              if (target.tagName === 'A' && target.getAttribute('href')) {
                e.stopPropagation();
                const href = target.getAttribute('href');
                if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
                  window.open(href, '_blank', 'noopener,noreferrer');
                  e.preventDefault();
                }
              }
            }}
          />
        </Card>
      </div>

      {/* Custom CSS for citations and references */}
      <style>{`
        .citation-manuscript [data-citation-number] {
          background-color: #86efac;
          padding: 2px 4px;
          border-radius: 4px;
          transition: all 0.2s;
          font-weight: 600;
        }

        .citation-manuscript [data-citation-number]:hover {
          background-color: #4ade80;
          transform: scale(1.05);
        }

        .citation-manuscript [data-citation-matched="false"] {
          background-color: #fca5a5;
        }

        .citation-manuscript [data-citation-matched="false"]:hover {
          background-color: #f87171;
        }

        .citation-manuscript [id^="reference-"] {
          transition: all 0.3s;
          padding: 8px;
          margin: 4px -8px;
          border-radius: 4px;
        }

        .citation-manuscript [id^="reference-"]:hover {
          background-color: #e0e7ff;
        }

        .citation-manuscript .reference-highlighted {
          background-color: #fef3c7 !important;
          border-left: 4px solid #f59e0b;
          animation: pulse 0.5s ease-in-out;
        }

        .citation-manuscript .citation-instance-highlighted {
          background-color: #fef3c7 !important;
          transform: scale(1.1);
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        /* Links in manuscript */
        .citation-manuscript a {
          color: #0066cc;
          text-decoration: underline;
          cursor: pointer;
        }

        .citation-manuscript a:hover {
          color: #0052a3;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
