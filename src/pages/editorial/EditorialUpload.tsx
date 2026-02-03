import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, BookOpen, Search, CheckSquare } from 'lucide-react';
import { FileUploader, UploadedFile } from '@/components/shared';
import { Button } from '@/components/ui/Button';

type AnalysisType = 'citations' | 'plagiarism' | 'style' | 'all';

const analysisOptions = [
  { 
    id: 'citations' as const, 
    label: 'Citations', 
    description: 'Validate references and bibliography',
    icon: BookOpen 
  },
  { 
    id: 'plagiarism' as const, 
    label: 'Plagiarism', 
    description: 'Check for content originality',
    icon: Search 
  },
  { 
    id: 'style' as const, 
    label: 'Style', 
    description: 'Validate against style guides',
    icon: CheckSquare 
  },
  { 
    id: 'all' as const, 
    label: 'Full Analysis', 
    description: 'Run all checks',
    icon: FileText 
  },
];

export function EditorialUpload() {
  const navigate = useNavigate();
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisType>('all');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleFilesSelected = (files: UploadedFile[]) => {
    setUploadedFiles(files);
  };

  const handleStartAnalysis = () => {
    if (uploadedFiles.length === 0) return;
    
    if (selectedAnalysis === 'citations' || selectedAnalysis === 'all') {
      navigate('/editorial/citations');
    } else if (selectedAnalysis === 'plagiarism') {
      navigate('/editorial/plagiarism');
    } else if (selectedAnalysis === 'style') {
      navigate('/editorial/style');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Upload Document
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Upload a document to analyze. Supported formats: DOCX, PDF, EPUB, TXT
        </p>

        <FileUploader
          onFilesSelected={handleFilesSelected}
          acceptedFormats={['DOCX', 'PDF', 'EPUB', 'TXT']}
          maxFiles={5}
        />
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Select Analysis Type
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {analysisOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedAnalysis === option.id;
            
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedAnalysis(option.id)}
                className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                    {option.label}
                  </div>
                  <div className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                    {option.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/editorial')}>
          Cancel
        </Button>
        <Button 
          variant="primary"
          onClick={handleStartAnalysis}
          disabled={uploadedFiles.length === 0}
        >
          <Upload className="w-4 h-4 mr-2" />
          Start Analysis
        </Button>
      </div>
    </div>
  );
}

export default EditorialUpload;
