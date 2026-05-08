import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { Printer } from 'lucide-react';
import { renderMarkdown } from '@/lib/markdown';
// Vite bundles the docs/ markdown as a raw string at build time. The ambient
// module declaration in src/types/markdown-raw.d.ts gives this import a type.
import guideMarkdown from '../../../docs/ANNOTATORS_GUIDE.md?raw';

export default function AnnotatorGuidePage() {
  const html = useMemo(
    () => DOMPurify.sanitize(renderMarkdown(guideMarkdown)),
    [],
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link
          to="/bootstrap"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to Console
        </Link>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>
      </div>

      <article
        className="prose prose-sm max-w-none [&_table]:w-full [&_table]:border-collapse [&_tr]:border-b [&_tr]:border-gray-100 [&_pre]:bg-gray-50 [&_pre]:p-3 [&_pre]:rounded [&_code]:text-xs"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
