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

      // Fetch the file
      const response = await fetch(remediatedFileUrl);
      if (!response.ok) throw new Error('Download failed');

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
      toast.error('Failed to download file');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={!remediatedFileUrl || isDownloading}
      variant="outline"
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
