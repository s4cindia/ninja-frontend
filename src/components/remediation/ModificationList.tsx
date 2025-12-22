import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Filter, FolderOpen, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ComparisonDiff, Modification } from './ComparisonDiff';

type CategoryFilter = 'all' | 'metadata' | 'content' | 'structure' | 'accessibility';
type GroupBy = 'category' | 'file';

interface ModificationListProps {
  modifications: Modification[];
  className?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  metadata: 'Metadata',
  content: 'Content',
  structure: 'Structure',
  accessibility: 'Accessibility',
};

export const ModificationList: React.FC<ModificationListProps> = ({
  modifications,
  className = '',
}) => {
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const filteredModifications = useMemo(() => {
    if (filter === 'all') return modifications;
    return modifications.filter(m => m.category === filter);
  }, [modifications, filter]);

  const groupedModifications = useMemo(() => {
    const groups: Record<string, Modification[]> = {};
    
    filteredModifications.forEach(mod => {
      const key = groupBy === 'category' ? mod.category : mod.filePath;
      if (!groups[key]) groups[key] = [];
      groups[key].push(mod);
    });

    return groups;
  }, [filteredModifications, groupBy]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleItem = (index: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(Object.keys(groupedModifications)));
    setExpandedItems(new Set(modifications.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
    setExpandedItems(new Set());
  };

  const categories: CategoryFilter[] = ['all', 'metadata', 'content', 'structure', 'accessibility'];

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <div className="flex gap-1" role="group" aria-label="Filter by category">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={filter === cat ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFilter(cat)}
                aria-pressed={filter === cat}
              >
                {cat === 'all' ? 'All' : CATEGORY_LABELS[cat] || cat}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Group by:</span>
          <Button
            variant={groupBy === 'category' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setGroupBy('category')}
            aria-pressed={groupBy === 'category'}
          >
            <Layers className="h-4 w-4 mr-1" aria-hidden="true" />
            Category
          </Button>
          <Button
            variant={groupBy === 'file' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setGroupBy('file')}
            aria-pressed={groupBy === 'file'}
          >
            <FolderOpen className="h-4 w-4 mr-1" aria-hidden="true" />
            File
          </Button>
          <span className="mx-2 text-gray-300">|</span>
          <Button variant="ghost" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {filteredModifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No modifications found matching the filter.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedModifications).map(([groupKey, mods]) => {
            const isExpanded = expandedGroups.has(groupKey);
            const groupLabel = groupBy === 'category' 
              ? CATEGORY_LABELS[groupKey] || groupKey 
              : groupKey;

            return (
              <div key={groupKey} className="border rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  onClick={() => toggleGroup(groupKey)}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" aria-hidden="true" />
                    )}
                    <span className="font-medium text-gray-900">{groupLabel}</span>
                    <span className="text-sm text-gray-500">({mods.length} changes)</span>
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="p-4 space-y-3">
                    {mods.map((mod, idx) => {
                      const globalIdx = modifications.indexOf(mod);
                      const isItemExpanded = expandedItems.has(globalIdx);
                      
                      return (
                        <div key={idx}>
                          {mod.before || mod.after ? (
                            <div>
                              <button
                                className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                                onClick={() => toggleItem(globalIdx)}
                                aria-expanded={isItemExpanded}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900">{mod.description}</p>
                                    <p className="text-sm text-gray-500">{mod.filePath}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {mod.wcagCriteria && (
                                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                        {mod.wcagCriteria}
                                      </span>
                                    )}
                                    {isItemExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-500" aria-hidden="true" />
                                    )}
                                  </div>
                                </div>
                              </button>
                              {isItemExpanded && (
                                <div className="mt-2">
                                  <ComparisonDiff modification={mod} viewMode="inline" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 border rounded-lg">
                              <p className="font-medium text-gray-900">{mod.description}</p>
                              <p className="text-sm text-gray-500">{mod.filePath}</p>
                              {mod.wcagCriteria && (
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded mt-2 inline-block">
                                  {mod.wcagCriteria}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
