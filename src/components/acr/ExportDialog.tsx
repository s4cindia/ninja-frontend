import { useState, useEffect } from 'react';
import { X, FileText, FileType, Globe, Check, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useMockExport } from '@/hooks/useAcrExport';
import type { ExportFormat, ExportOptions } from '@/types/acr.types';

interface ExportDialogProps {
  acrId: string;
  isOpen: boolean;
  onClose: () => void;
}

const FORMAT_OPTIONS: {
  value: ExportFormat;
  label: string;
  description: string;
  icon: typeof FileText;
}[] = [
  {
    value: 'docx',
    label: 'Word (.docx)',
    description: 'Editable document, ITI VPAT 2.5 template',
    icon: FileText,
  },
  {
    value: 'pdf',
    label: 'PDF',
    description: 'Accessible tagged PDF, suitable for distribution',
    icon: FileType,
  },
  {
    value: 'html',
    label: 'HTML',
    description: 'Web-ready, WCAG compliant',
    icon: Globe,
  },
];

export function ExportDialog({ acrId, isOpen, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('docx');
  const [includeMethodology, setIncludeMethodology] = useState(true);
  const [includeAttributionTags, setIncludeAttributionTags] = useState(true);
  const [includeLegalDisclaimer, setIncludeLegalDisclaimer] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [footerText, setFooterText] = useState('');
  const [showBranding, setShowBranding] = useState(false);

  const { exportAcr, isExporting, downloadUrl, filename, reset } = useMockExport();

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  useEffect(() => {
    reset();
  }, [format, reset]);

  if (!isOpen) return null;

  const handleExport = async () => {
    const options: ExportOptions = {
      format,
      includeMethodology,
      includeAttributionTags,
      includeLegalDisclaimer,
      branding: showBranding ? {
        companyName: companyName || undefined,
        primaryColor,
        footerText: footerText || undefined,
      } : undefined,
    };

    await exportAcr(acrId, options);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const previewSections = [
    'Product Information',
    'VPAT Version and Standards',
    ...(includeMethodology ? ['Methodology Section'] : []),
    'Conformance Results Table',
    ...(includeAttributionTags ? ['Attribution Tags'] : []),
    ...(includeLegalDisclaimer ? ['Legal Disclaimer'] : []),
    ...(showBranding && companyName ? ['Company Branding'] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Export ACR Document</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Export Format</h3>
            <div className="space-y-2">
              {FORMAT_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      format === option.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={option.value}
                      checked={format === option.value}
                      onChange={() => setFormat(option.value)}
                      className="mt-1"
                    />
                    <Icon className={cn(
                      'h-5 w-5 flex-shrink-0 mt-0.5',
                      format === option.value ? 'text-primary-600' : 'text-gray-400'
                    )} />
                    <div>
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Export Options</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMethodology}
                  onChange={(e) => setIncludeMethodology(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Include Methodology Section</span>
              </label>
              <label className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAttributionTags}
                  onChange={(e) => setIncludeAttributionTags(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Include Attribution Tags</span>
              </label>
              <label className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLegalDisclaimer}
                  onChange={(e) => setIncludeLegalDisclaimer(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Include Legal Disclaimer</span>
              </label>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowBranding(!showBranding)}
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              {showBranding ? '− Hide Branding Options' : '+ Add Branding Options'}
            </button>
            
            {showBranding && (
              <div className="mt-3 space-y-4 p-4 bg-gray-50 rounded-lg">
                <Input
                  label="Company Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                <Input
                  label="Custom Footer Text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Enter custom footer text"
                />
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Preview: Document Contents</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              {previewSections.map((section, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  {section}
                </li>
              ))}
            </ul>
          </div>

          {downloadUrl && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">Export Complete!</p>
                  <p className="text-sm text-green-700">{filename}</p>
                  <p className="text-xs text-green-600 mt-1">File downloaded automatically. Check your downloads folder.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || !!downloadUrl}
            isLoading={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : downloadUrl ? (
              'Exported'
            ) : (
              'Export Document'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
