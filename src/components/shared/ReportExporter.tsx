import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { Download, FileText, FileSpreadsheet, Globe, Link2, ChevronDown, Loader2, Braces, FileType } from 'lucide-react';

export type ExportFormat = 'json' | 'pdf' | 'docx' | 'csv' | 'html';

export interface ExportOption {
  format: ExportFormat;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  description?: string;
}

export interface ReportExporterProps {
  reportId: string;
  reportTitle: string;
  formats?: ExportFormat[];
  options?: ExportOption[];
  onExport: (format: ExportFormat) => Promise<string | Blob>;
  onShare?: (format: ExportFormat) => Promise<void>;
  variant?: 'button' | 'dropdown' | 'card';
  className?: string;
  disabled?: boolean;
}

const getFormatIcon = (format: ExportFormat): React.ReactNode => {
  switch (format) {
    case 'json':
      return <Braces className="w-5 h-5" />;
    case 'pdf':
      return <FileText className="w-5 h-5" />;
    case 'docx':
      return <FileType className="w-5 h-5" />;
    case 'csv':
      return <FileSpreadsheet className="w-5 h-5" />;
    case 'html':
      return <Globe className="w-5 h-5" />;
    default:
      return <FileText className="w-5 h-5" />;
  }
};

const DEFAULT_OPTIONS: Record<ExportFormat, { label: string; description: string }> = {
  json: { label: 'JSON', description: 'Raw data format' },
  pdf: { label: 'PDF', description: 'Printable document' },
  docx: { label: 'Word', description: 'Editable document' },
  csv: { label: 'CSV', description: 'Spreadsheet data' },
  html: { label: 'HTML', description: 'Web page' },
};

export const ReportExporter: React.FC<ReportExporterProps> = ({
  reportTitle,
  formats = ['pdf', 'json'],
  options,
  onExport,
  onShare,
  variant = 'dropdown',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const exportOptions: ExportOption[] = options || formats.map(format => ({
    format,
    label: DEFAULT_OPTIONS[format].label,
    description: DEFAULT_OPTIONS[format].description,
    icon: getFormatIcon(format),
    enabled: true,
  }));

  const getFilename = (format: ExportFormat): string => {
    const sanitizedTitle = reportTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitizedTitle}-${timestamp}.${format}`;
  };

  const handleExport = async (format: ExportFormat) => {
    if (disabled || exporting) return;
    
    setExporting(format);
    setError(null);
    
    try {
      const result = await onExport(format);
      
      const link = document.createElement('a');
      link.download = getFilename(format);
      link.setAttribute('rel', 'noopener noreferrer');
      
      if (typeof result === 'string') {
        link.href = result;
      } else {
        const url = URL.createObjectURL(result);
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsOpen(false);
        return;
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsOpen(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Export failed';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setExporting(null);
    }
  };

  const handleShare = async (format: ExportFormat) => {
    if (!onShare || disabled) return;
    
    setExporting(format);
    setError(null);
    
    try {
      await onShare(format);
      setIsOpen(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Share failed';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setExporting(null);
    }
  };

  const ButtonVariant = () => (
    <div className={clsx('flex flex-wrap gap-2', className)} role="group" aria-label="Export options">
      {exportOptions.filter(o => o.enabled).map(option => (
        <button
          key={option.format}
          type="button"
          onClick={() => handleExport(option.format)}
          disabled={disabled || !!exporting}
          aria-busy={exporting === option.format}
          className={clsx(
            'px-4 py-2 rounded-lg border flex items-center gap-2',
            'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50',
            exporting === option.format ? 'bg-blue-50 border-blue-300' : 'border-gray-300'
          )}
        >
          {exporting === option.format ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <span aria-hidden="true">{option.icon}</span>
          )}
          <span>{exporting === option.format ? 'Exporting...' : option.label}</span>
        </button>
      ))}
    </div>
  );

  const DropdownVariant = () => (
    <div className={clsx('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={clsx(
          'px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center gap-2',
          'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
        )}
      >
        <Download className="w-4 h-4" aria-hidden="true" />
        <span>Export Report</span>
        <ChevronDown className={clsx('w-4 h-4 transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
      </button>
      
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-20"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1">
            {exportOptions.filter(o => o.enabled).map(option => (
              <button
                key={option.format}
                type="button"
                onClick={() => handleExport(option.format)}
                disabled={!!exporting}
                role="menuitem"
                className={clsx(
                  'w-full px-4 py-2 text-left flex items-center gap-3',
                  'hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-100',
                  exporting === option.format && 'bg-blue-50'
                )}
              >
                {exporting === option.format ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" aria-hidden="true" />
                ) : (
                  <span className="text-gray-600" aria-hidden="true">{option.icon}</span>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {exporting === option.format ? 'Exporting...' : option.label}
                  </p>
                  {option.description && (
                    <p className="text-xs text-gray-500">{option.description}</p>
                  )}
                </div>
              </button>
            ))}
            
            {onShare && (
              <>
                <div className="border-t my-1" role="separator" />
                <button
                  type="button"
                  onClick={() => handleShare(exportOptions[0]?.format || 'pdf')}
                  role="menuitem"
                  className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50 focus:outline-none focus:bg-gray-100"
                >
                  <Link2 className="w-5 h-5 text-gray-600" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-gray-900">Share Link</p>
                    <p className="text-xs text-gray-500">Copy shareable link</p>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}
      
      {error && (
        <p className="mt-2 text-sm text-red-500" role="alert">{error}</p>
      )}
    </div>
  );

  const CardVariant = () => (
    <div className={clsx('p-4 bg-white rounded-lg border', className)}>
      <h3 className="font-medium text-gray-900 mb-3">Export Report</h3>
      <p className="text-sm text-gray-500 mb-4">
        Download "{reportTitle}" in your preferred format
      </p>
      
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Export format options">
        {exportOptions.filter(o => o.enabled).map(option => (
          <button
            key={option.format}
            type="button"
            onClick={() => handleExport(option.format)}
            disabled={disabled || !!exporting}
            aria-busy={exporting === option.format}
            className={clsx(
              'p-3 rounded-lg border text-center',
              'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 hover:border-blue-300',
              exporting === option.format ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
            )}
          >
            <div className="flex justify-center mb-1" aria-hidden="true">
              {exporting === option.format ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              ) : (
                <span className="text-gray-600">{option.icon}</span>
              )}
            </div>
            <div className="text-sm font-medium">
              {exporting === option.format ? 'Exporting...' : option.label}
            </div>
          </button>
        ))}
      </div>
      
      {error && (
        <p className="mt-3 text-sm text-red-500" role="alert">{error}</p>
      )}
    </div>
  );

  return (
    <>
      {variant === 'button' && <ButtonVariant />}
      {variant === 'dropdown' && <DropdownVariant />}
      {variant === 'card' && <CardVariant />}
    </>
  );
};
