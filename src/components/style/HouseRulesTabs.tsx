/**
 * HouseRulesTabs Component
 *
 * Tab bar rendering for the 4 tabs: Rule Sets, Individual Rules, Upload, Best Practices
 */

import { Filter, FileText, BookOpen, FolderOpen } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { TabType } from './houseRulesTypes';

interface HouseRulesTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  ruleSetsCount: number;
  rulesCount: number;
}

export function HouseRulesTabs({
  activeTab,
  onTabChange,
  ruleSetsCount,
  rulesCount,
}: HouseRulesTabsProps) {
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'rule-sets',
      label: `Rule Sets (${ruleSetsCount})`,
      icon: <FolderOpen className="inline h-4 w-4 mr-2" />,
    },
    {
      id: 'rules',
      label: `Individual Rules (${rulesCount})`,
      icon: <Filter className="inline h-4 w-4 mr-2" />,
    },
    {
      id: 'upload',
      label: 'Upload Style Guide',
      icon: <FileText className="inline h-4 w-4 mr-2" />,
    },
    {
      id: 'best-practices',
      label: 'Best Practices',
      icon: <BookOpen className="inline h-4 w-4 mr-2" />,
    },
  ];

  return (
    <div className="mt-4 flex border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === tab.id
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
