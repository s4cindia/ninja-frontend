/**
 * RulesListTab Component
 *
 * Search bar, category filter, and JSON import controls for the rules tab.
 * Renders in the header area. Hidden when the rule form is open.
 */

import { Search, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { categoryOptions } from './constants';
import type { StyleCategory } from '@/types/style';

interface RulesListTabProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryFilter: StyleCategory | '';
  onCategoryFilterChange: (category: StyleCategory | '') => void;
  importFile: File | null;
  onImportFileChange: (file: File | null) => void;
  onImport: () => void;
  isImporting: boolean;
  showForm: boolean;
}

export function RulesListTab({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  importFile,
  onImportFileChange,
  onImport,
  isImporting,
  showForm,
}: RulesListTabProps) {
  if (showForm) return null;

  return (
    <>
      {/* Search and Filter */}
      <div className="mt-4 flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search rules..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value as StyleCategory | '')}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Categories</option>
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Import JSON */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="file"
          accept=".json"
          onChange={(e) => onImportFileChange(e.target.files?.[0] || null)}
          className="text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
        {importFile && (
          <Button
            size="sm"
            variant="outline"
            onClick={onImport}
            isLoading={isImporting}
            leftIcon={<Upload className="h-4 w-4" />}
          >
            Import JSON
          </Button>
        )}
        <a
          href="/house-rules-template.json"
          download="house-rules-template.json"
          className="text-sm text-primary-600 hover:text-primary-700 underline ml-2"
        >
          Download Sample Template
        </a>
      </div>
    </>
  );
}
