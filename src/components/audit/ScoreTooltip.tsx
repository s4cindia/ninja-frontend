import { useState } from 'react';
import { Info } from 'lucide-react';
import type { ScoreBreakdown } from '@/lib/score-utils';

interface ScoreTooltipProps {
  breakdown: ScoreBreakdown;
  children: React.ReactNode;
}

export function ScoreTooltip({ breakdown, children }: ScoreTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      
      {isVisible && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2">
          <div className="w-72 p-4 bg-gray-900 text-white text-sm rounded-lg shadow-xl">
            <div className="flex items-center gap-2 font-semibold mb-3">
              <Info className="w-4 h-4" />
              Score Calculation
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex justify-between">
                <span>Critical ({breakdown.deductions.critical.count} × {breakdown.weights.critical})</span>
                <span className="text-red-400">-{breakdown.deductions.critical.points}</span>
              </div>
              <div className="flex justify-between">
                <span>Serious ({breakdown.deductions.serious.count} × {breakdown.weights.serious})</span>
                <span className="text-orange-400">-{breakdown.deductions.serious.points}</span>
              </div>
              <div className="flex justify-between">
                <span>Moderate ({breakdown.deductions.moderate.count} × {breakdown.weights.moderate})</span>
                <span className="text-yellow-400">-{breakdown.deductions.moderate.points}</span>
              </div>
              <div className="flex justify-between">
                <span>Minor ({breakdown.deductions.minor.count} × {breakdown.weights.minor})</span>
                <span className="text-blue-400">-{breakdown.deductions.minor.points}</span>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-2 flex justify-between font-semibold">
              <span>Final Score</span>
              <span>100 - {breakdown.totalDeduction} = {breakdown.finalScore}</span>
            </div>

            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}

export default ScoreTooltip;
