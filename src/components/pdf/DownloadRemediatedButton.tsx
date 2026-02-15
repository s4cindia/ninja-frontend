import { Button } from '../ui/Button';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface DownloadRemediatedButtonProps {
  jobId: string;
  fileName: string;
  remediatedFileUrl?: string;
}

export function DownloadRemediatedButton({
  jobId,
  fileName,
  remediatedFileUrl,
}: DownloadRemediatedButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!remediatedFileUrl) {
      toast.error('Remediated file not available');
      return;
    }

    try {
      setIsDownloading(true);

      // Use the backend API endpoint to download the file
      const apiUrl = `/api/v1/pdf/${jobId}/remediation/download`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error?.message || 'Download failed');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace('.pdf', '_remediated.pdf');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Download started');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download file';
      toast.error(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={!remediatedFileUrl || isDownloading}
      variant="primary"
      size="lg"
    >
      {isDownloading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Downloading...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Download Remediated PDF
        </>
      )}
    </Button>
  );
}
