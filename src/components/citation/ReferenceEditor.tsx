/**
 * Reference Editor Component
 * Complete reference management with drag-drop, search, and batch operations
 */

import { useState } from 'react';
import { Search, SortAsc, SortDesc, Filter, Download, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import DraggableReferenceList from './DraggableReferenceList';
import { api } from '@/services/api';

interface Reference {
  id: string;
  position: number;
  number?: number;
  rawText: string;
  authors: string[];
  year?: string;
  title?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
  citationCount?: number;
}

interface ReferenceEditorProps {
  documentId: string;
  references: Reference[];
  citations?: any[];
  onReload: () => Promise<void>;
  onReorderComplete?: (oldCitations: any[], newCitations: any[]) => Promise<void>;
}

export default function ReferenceEditor({ documentId, references, citations, onReload, onReorderComplete }: ReferenceEditorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'with-doi' | 'without-doi'>('all');
  const [sortBy, setSortBy] = useState<'position' | 'author' | 'year'>('position');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter and sort references
  const filteredReferences = references
    .filter(ref => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableText = [
          ref.rawText,
          ref.title,
          ref.journal,
          ...ref.authors
        ].join(' ').toLowerCase();

        if (!searchableText.includes(query)) {
          return false;
        }
      }

      // DOI filter
      if (filterBy === 'with-doi' && !ref.doi) return false;
      if (filterBy === 'without-doi' && ref.doi) return false;

      return true;
    })
    .sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'position':
          compareValue = a.position - b.position;
          break;
        case 'author': {
          const authorA = a.authors[0] || '';
          const authorB = b.authors[0] || '';
          compareValue = authorA.localeCompare(authorB);
          break;
        }
        case 'year': {
          const yearA = parseInt(a.year || '0');
          const yearB = parseInt(b.year || '0');
          compareValue = yearA - yearB;
          break;
        }
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

  const handleReorder = async (referenceId: string, newPosition: number) => {
    try {
      // Keep track of old citations before reordering
      const oldCitations = citations ? [...citations] : [];
      console.log('[ReferenceEditor] Reordering - Old citations:', oldCitations.length);

      const response = await api.post(
        `/citation-management/document/${documentId}/reorder`,
        { referenceId, newPosition }
      );

      console.log('[ReferenceEditor] Reorder response:', response.data);

      if (response.data.success) {
        // Get new citations from response
        const newCitations = response.data.data.citations || [];
        console.log('[ReferenceEditor] New citations:', newCitations.length);
        console.log('[ReferenceEditor] Has callback?', !!onReorderComplete);

        // Call the callback with old and new citations for change tracking
        if (onReorderComplete && oldCitations.length > 0 && newCitations.length > 0) {
          console.log('[ReferenceEditor] Calling onReorderComplete callback');
          await onReorderComplete(oldCitations, newCitations);
        } else {
          console.log('[ReferenceEditor] Just reloading (no callback or no citations)');
          await onReload();
        }
      }
    } catch (error) {
      console.error('Failed to reorder:', error);
    }
  };

  const handleBatchSort = async (sortType: 'alphabetical' | 'year' | 'appearance') => {
    try {
      // Keep track of old citations before sorting
      const oldCitations = citations ? [...citations] : [];

      const response = await api.post(
        `/citation-management/document/${documentId}/reorder`,
        { sortBy: sortType }
      );

      if (response.data.success) {
        // Get new citations from response
        const newCitations = response.data.data.citations || [];

        // Call the callback with old and new citations for change tracking
        if (onReorderComplete && oldCitations.length > 0 && newCitations.length > 0) {
          await onReorderComplete(oldCitations, newCitations);
        } else {
          await onReload();
        }
      }
    } catch (error) {
      console.error('Failed to batch sort:', error);
    }
  };

  const handleUpdate = async (referenceId: string, updates: Partial<Reference>) => {
    try {
      // Keep track of old citations before update
      const oldCitations = citations ? [...citations] : [];
      console.log('[ReferenceEditor] Updating reference:', referenceId, updates);

      const response = await api.patch(
        `/citation-management/document/${documentId}/reference/${referenceId}`,
        updates
      );

      console.log('[ReferenceEditor] Update response:', response.data);

      if (response.data.success) {
        // Get new citations from response (may have been updated for author-year changes)
        const newCitations = response.data.data.citations || [];
        const citationUpdates = response.data.data.citationUpdates || [];

        console.log('[ReferenceEditor] Citation updates:', citationUpdates.length);

        // Call the callback with old and new citations for change tracking
        if (onReorderComplete && oldCitations.length > 0 && newCitations.length > 0) {
          console.log('[ReferenceEditor] Calling onReorderComplete callback after update');
          await onReorderComplete(oldCitations, newCitations);
        } else {
          await onReload();
        }

        // Show success message if inline citations were updated
        if (citationUpdates.length > 0) {
          alert(`Reference updated. ${citationUpdates.length} inline citation(s) also updated.`);
        }
      }
    } catch (error) {
      console.error('Failed to update reference:', error);
      alert('Failed to update reference. Please try again.');
    }
  };

  const handleDelete = async (referenceId: string) => {
    if (!confirm('Delete this reference? Citations that reference it will be marked in red and need manual fixing.')) {
      return;
    }

    try {
      // Keep track of old citations before deletion
      const oldCitations = citations ? [...citations] : [];
      console.log('[ReferenceEditor] Deleting reference:', referenceId);

      const response = await api.delete(
        `/citation-management/document/${documentId}/reference/${referenceId}`
      );

      console.log('[ReferenceEditor] Delete response:', response.data);

      if (response.data.success) {
        // Get new citations from response
        const newCitations = response.data.data.citations || [];
        const affectedCitationIds = response.data.data.affectedCitationIds || [];

        console.log('[ReferenceEditor] Affected citations:', affectedCitationIds.length);

        // Call the callback with old and new citations for change tracking
        if (onReorderComplete && oldCitations.length > 0 && newCitations.length > 0) {
          console.log('[ReferenceEditor] Calling onReorderComplete callback after deletion');
          await onReorderComplete(oldCitations, newCitations);
        } else {
          await onReload();
        }

        // Show success message
        alert(`Reference deleted successfully. ${affectedCitationIds.length} citation(s) marked for review.`);
      }
    } catch (error) {
      console.error('Failed to delete reference:', error);
      alert('Failed to delete reference. Please try again.');
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search references..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All References</option>
              <option value="with-doi">With DOI</option>
              <option value="without-doi">Without DOI</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="position">Position</option>
              <option value="author">Author</option>
              <option value="year">Year</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleSortOrder}
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Batch Actions */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
          <span className="text-sm text-gray-600 flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Quick Sort:
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBatchSort('alphabetical')}
          >
            Alphabetically
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBatchSort('year')}
          >
            By Year
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBatchSort('appearance')}
          >
            By Appearance
          </Button>
        </div>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredReferences.length} of {references.length} references
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Reference
          </Button>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export List
          </Button>
        </div>
      </div>

      {/* Uncited References Warning */}
      {references.filter(r => !r.citationCount || r.citationCount === 0).length > 0 && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-800 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">
                {references.filter(r => !r.citationCount || r.citationCount === 0).length} reference(s) not cited in text
              </p>
              <p className="text-sm mt-1">
                These references appear in the reference list but have no corresponding in-text citation in the document.
                Consider adding citations or removing unused references.
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Draggable List */}
      <DraggableReferenceList
        references={filteredReferences}
        onReorder={handleReorder}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      {/* Instructions */}
      {filteredReferences.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> Drag references by the grip handle to reorder them.
            All in-text citation numbers will be automatically updated!
          </p>
        </Card>
      )}
    </div>
  );
}
