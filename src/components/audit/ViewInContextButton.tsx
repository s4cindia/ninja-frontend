import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Eye } from 'lucide-react';
import { EpubViewer } from './EpubViewer';

interface ViewInContextButtonProps {
  jobId: string;
  location?: string;
  issueCode: string;
  cssSelector?: string;
  isManual?: boolean;
}

export function ViewInContextButton({ 
  jobId, 
  location, 
  issueCode, 
  cssSelector, 
  isManual 
}: ViewInContextButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!location || !isManual) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-xs"
      >
        <Eye className="w-3 h-3 mr-1" />
        View in Context
      </Button>

      <EpubViewer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        jobId={jobId}
        filePath={location}
        issueCode={issueCode}
        cssSelector={cssSelector}
      />
    </>
  );
}

export default ViewInContextButton;
