import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface IssueNavigatorProps {
  currentIndex: number;
  totalCount: number;
  onPrevious: () => void;
  onNext: () => void;
}

export const IssueNavigator: React.FC<IssueNavigatorProps> = ({
  currentIndex,
  totalCount,
  onPrevious,
  onNext,
}) => {
  return (
    <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={currentIndex === 0}
        aria-label="Previous change"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">
        Change {currentIndex + 1} of {totalCount}
      </span>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={currentIndex >= totalCount - 1}
        aria-label="Next change"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
