import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUploader, UploadedFile } from '@/components/shared';

type AnalysisType = 'citations' | 'plagiarism' | 'style';

interface AnalysisOption {
  id: AnalysisType;
  label: string;
  description: string;
  available: boolean;
}

const ANALYSIS_OPTIONS: AnalysisOption[] = [
  {
    id: 'citations',
    label: 'Citation Analysis',
    description: 'Detect and validate all citations in the document',
    available: true,
  },
  {
    id: 'plagiarism',
    label: 'Plagiarism Check',
    description: 'Scan for potential plagiarism and paraphrased content',
    available: false,
  },
  {
    id: 'style',
    label: 'Style Validation',
    description: 'Check against Chicago, APA, or custom house style',
    available: false,
  },
];

export function EditorialUploadPage() {
  const navigate = useNavigate();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedAnalyses, setSelectedAnalyses] = useState<Set<AnalysisType>>(
    new Set(['citations'])
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFilesSelected = (files: UploadedFile[]) => {
    setUploadedFiles(files);
  };

  const toggleAnalysis = (id: AnalysisType) => {
    const option = ANALYSIS_OPTIONS.find(opt => opt.id === id);
    if (!option?.available) return;
    
    setSelectedAnalyses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0 || selectedAnalyses.size === 0) return;
    setIsSubmitting(true);

    try {
      console.log('Would submit:', uploadedFiles.map(f => f.name), Array.from(selectedAnalyses));
      navigate('/editorial');
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasUploadedFiles = uploadedFiles.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Upload Document
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Upload a document to run editorial analyses
        </p>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <FileUploader
          onFilesSelected={handleFilesSelected}
          acceptedFormats={['PDF', 'EPUB', 'DOCX', 'TXT', 'XML']}
          maxFiles={1}
        />
      </div>

      {hasUploadedFiles && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Select Analyses
          </h3>
          <div className="space-y-3">
            {ANALYSIS_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                  !option.available
                    ? 'opacity-50 cursor-not-allowed bg-gray-50'
                    : selectedAnalyses.has(option.id)
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedAnalyses.has(option.id)}
                  onChange={() => toggleAnalysis(option.id)}
                  disabled={!option.available}
                  className="mt-1 mr-3"
                  aria-label={option.label}
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {option.label}
                  </span>
                  {!option.available && (
                    <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                      Coming Soon
                    </span>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {option.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {hasUploadedFiles && (
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedAnalyses.size === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isSubmitting
              ? 'Processing...'
              : `Run ${selectedAnalyses.size} Analysis${selectedAnalyses.size !== 1 ? 'es' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
