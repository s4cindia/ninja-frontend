import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { ExportOptions, ExportResult, ExportFormat } from '@/types/acr.types';

async function exportAcr(acrId: string, options: ExportOptions): Promise<ExportResult> {
  const response = await api.post<ExportResult>(`/acr/${acrId}/export`, options);
  return response.data;
}

export function useExportAcr() {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ acrId, options }: { acrId: string; options: ExportOptions }) =>
      exportAcr(acrId, options),
    onSuccess: (data) => {
      setDownloadUrl(data.downloadUrl);
      setFilename(data.filename);
    },
  });

  const doExport = async (acrId: string, options: ExportOptions): Promise<ExportResult> => {
    return mutation.mutateAsync({ acrId, options });
  };

  const reset = useCallback(() => {
    setDownloadUrl(null);
    setFilename(null);
    mutation.reset();
  }, [mutation]);

  return {
    exportAcr: doExport,
    isExporting: mutation.isPending,
    downloadUrl,
    filename,
    error: mutation.error,
    reset,
  };
}

export function useMockExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  const exportAcr = async (_acrId: string, options: ExportOptions): Promise<ExportResult> => {
    setIsExporting(true);
    setDownloadUrl(null);
    setFilename(null);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const formatExtensions: Record<ExportFormat, string> = {
      docx: '.docx',
      pdf: '.pdf',
      html: '.html',
    };

    const result: ExportResult = {
      downloadUrl: `#mock-download-${options.format}`,
      filename: `ACR_Report_${new Date().toISOString().split('T')[0]}${formatExtensions[options.format]}`,
      format: options.format,
      generatedAt: new Date().toISOString(),
    };

    setDownloadUrl(result.downloadUrl);
    setFilename(result.filename);
    setIsExporting(false);

    return result;
  };

  const reset = useCallback(() => {
    setDownloadUrl(null);
    setFilename(null);
    setIsExporting(false);
  }, []);

  return {
    exportAcr,
    isExporting,
    downloadUrl,
    filename,
    error: null,
    reset,
  };
}
