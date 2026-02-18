/**
 * Reference Editor Component
 * Full-featured reference editor with drag-drop reordering, delete, and edit
 *
 * Performance: Uses debounced auto-save with optimistic UI updates
 * - UI updates immediately for responsive feel
 * - Changes are batched and saved after 1.5s of inactivity
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/services/api';
import { Trash2, GripVertical, Edit2, Check, X, ChevronUp, ChevronDown, ExternalLink, Loader2, Cloud, CloudOff } from 'lucide-react';
import toast from 'react-hot-toast';

// Debounce delay for auto-save (ms)
const DEBOUNCE_DELAY = 1500;

// Pending change types
type PendingChange =
  | { type: 'reorder'; referenceId: string; newPosition: number }
  | { type: 'delete'; referenceId: string }
  | { type: 'edit'; referenceId: string; data: Partial<Reference> };

interface Reference {
  id: string;
  number: number;
  authors: string[];
  year: string;
  title: string;
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
  citationCount?: number;
}

interface Citation {
  id: string;
  rawText: string;
  referenceId?: string;
}

interface ReferenceEditorProps {
  documentId: string;
  references: Reference[];
  citations?: Citation[];
  onReload?: () => void;
  onReorderComplete?: () => void;
  onReorder?: (referenceId: string, newPosition: number) => void;
  onEdit?: (referenceId: string, data: Partial<Reference>) => void;
  onDelete?: (referenceId: string) => void;
}

export default function ReferenceEditor({
  documentId,
  references,
  citations,
  onReload,
  onReorderComplete,
}: ReferenceEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Reference>>({});
  // Keep isDeleting for UI feedback during batch save
  const [isDeleting] = useState<string | null>(null);
  // Keep isReordering for disabling buttons during save
  const isReordering = false; // Replaced with isSaving in batch mode

  // Optimistic state - local copy of references that updates immediately
  const [localReferences, setLocalReferences] = useState<Reference[]>(references);

  // Pending changes queue for batched saving
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Debounce timer ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local references when props change (after server reload)
  useEffect(() => {
    if (!isSaving && pendingChanges.length === 0) {
      setLocalReferences(references);
    }
  }, [references, isSaving, pendingChanges.length]);

  // Batch save function - saves all pending changes
  const executeBatchSave = useCallback(async (changes: PendingChange[]) => {
    if (changes.length === 0) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Execute all changes in parallel
      const promises = changes.map(async (change) => {
        switch (change.type) {
          case 'reorder':
            return api.post(`/citation-management/document/${documentId}/reorder`, {
              referenceId: change.referenceId,
              newPosition: change.newPosition
            });
          case 'delete':
            return api.delete(`/citation-management/document/${documentId}/reference/${change.referenceId}`);
          case 'edit':
            return api.patch(`/citation-management/document/${documentId}/reference/${change.referenceId}`, change.data);
        }
      });

      const results = await Promise.allSettled(promises);

      // Check for failures
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.error('Some changes failed:', failures);
        setSaveError(`${failures.length} change(s) failed to save`);
        toast.error(`${failures.length} change(s) failed to save`);
      } else {
        toast.success(`${changes.length} change(s) saved`);
      }

      // Clear pending changes and reload from server
      setPendingChanges([]);
      onReorderComplete?.();
      onReload?.();
    } catch (err: unknown) {
      console.error('Batch save error:', err);
      setSaveError('Failed to save changes');
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [documentId, onReload, onReorderComplete]);

  // Debounced save - queues a change and schedules batch save
  const queueChange = useCallback((change: PendingChange) => {
    // Add to pending changes
    setPendingChanges(prev => {
      // Remove any existing change for the same reference (replace with latest)
      const filtered = prev.filter(c =>
        !(c.referenceId === change.referenceId && c.type === change.type)
      );
      return [...filtered, change];
    });

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule batch save after debounce delay
    saveTimeoutRef.current = setTimeout(() => {
      setPendingChanges(currentChanges => {
        if (currentChanges.length > 0) {
          executeBatchSave(currentChanges);
        }
        return currentChanges;
      });
    }, DEBOUNCE_DELAY);
  }, [executeBatchSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Count citations for each reference
  const getCitationCount = (refId: string) => {
    return citations?.filter(c => c.referenceId === refId).length || 0;
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  // Handle drop - reorder references (optimistic + debounced save)
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const sourceRef = localReferences[draggedIndex];
    const newPosition = targetIndex + 1; // 1-indexed

    // Optimistic update - reorder locally immediately
    setLocalReferences(prev => {
      const newRefs = [...prev];
      const [removed] = newRefs.splice(draggedIndex, 1);
      newRefs.splice(targetIndex, 0, removed);
      // Update numbers
      return newRefs.map((ref, i) => ({ ...ref, number: i + 1 }));
    });

    // Queue the change for batched save
    queueChange({ type: 'reorder', referenceId: sourceRef.id, newPosition });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Move reference up/down (optimistic + debounced save)
  const handleMove = (refId: string, direction: 'up' | 'down') => {
    const currentIndex = localReferences.findIndex(r => r.id === refId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= localReferences.length) return;

    const newPosition = targetIndex + 1; // 1-indexed

    // Optimistic update
    setLocalReferences(prev => {
      const newRefs = [...prev];
      const [removed] = newRefs.splice(currentIndex, 1);
      newRefs.splice(targetIndex, 0, removed);
      return newRefs.map((ref, i) => ({ ...ref, number: i + 1 }));
    });

    // Queue the change
    queueChange({ type: 'reorder', referenceId: refId, newPosition });
  };

  // Delete reference (optimistic + debounced save)
  const handleDelete = (refId: string) => {
    const citationCount = getCitationCount(refId);
    if (citationCount > 0) {
      const confirm = window.confirm(
        `This reference is cited ${citationCount} time(s) in the document. ` +
        `Deleting it will mark those citations as orphaned (shown in red). Continue?`
      );
      if (!confirm) return;
    }

    // Optimistic update - remove locally immediately
    setLocalReferences(prev => {
      const newRefs = prev.filter(r => r.id !== refId);
      return newRefs.map((ref, i) => ({ ...ref, number: i + 1 }));
    });

    // Queue the change
    queueChange({ type: 'delete', referenceId: refId });
  };

  // Start editing
  const startEdit = (ref: Reference) => {
    setEditingId(ref.id);
    setEditForm({
      authors: ref.authors,
      year: ref.year,
      title: ref.title,
      journalName: ref.journalName,
      volume: ref.volume,
      issue: ref.issue,
      pages: ref.pages,
      doi: ref.doi,
      url: ref.url,
      publisher: ref.publisher,
    });
  };

  // Save edit (optimistic + debounced)
  const handleSaveEdit = () => {
    if (!editingId) return;

    // Optimistic update
    setLocalReferences(prev =>
      prev.map(ref =>
        ref.id === editingId
          ? { ...ref, ...editForm }
          : ref
      )
    );

    // Queue the change
    queueChange({ type: 'edit', referenceId: editingId, data: editForm });

    setEditingId(null);
    setEditForm({});
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Determine save status
  const hasPendingChanges = pendingChanges.length > 0;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">References ({localReferences.length})</h3>
          {/* Save status indicator */}
          {isSaving && (
            <span className="flex items-center text-sm text-blue-600">
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Saving...
            </span>
          )}
          {!isSaving && hasPendingChanges && (
            <span className="flex items-center text-sm text-orange-600">
              <Cloud className="h-4 w-4 mr-1" />
              {pendingChanges.length} unsaved
            </span>
          )}
          {!isSaving && !hasPendingChanges && saveError && (
            <span className="flex items-center text-sm text-red-600">
              <CloudOff className="h-4 w-4 mr-1" />
              {saveError}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const response = await api.post(
                  `/citation-management/document/${documentId}/resequence`
                );
                if (response.data.success) {
                  toast.success('References resequenced by appearance order');
                  onReorderComplete?.();
                  onReload?.();
                }
              } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to resequence';
                toast.error(errorMessage);
              }
            }}
          >
            Sort by Appearance
          </Button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Drag references to reorder • Use arrows for precise positioning • Changes auto-save after 1.5s
      </p>

      <div className="space-y-2">
        {localReferences.map((ref, index) => {
          const isEditing = editingId === ref.id;
          const citationCount = getCitationCount(ref.id);
          const isDragOver = dragOverIndex === index;
          const isDragging = draggedIndex === index;

          return (
            <div
              key={ref.id}
              id={`ref-${ref.number || index + 1}`}
              draggable={!isEditing}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={() => {
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              className={`
                reference-item p-3 border rounded-lg transition-all
                ${isDragging ? 'opacity-50 border-blue-400 bg-blue-50' : ''}
                ${isDragOver ? 'border-blue-500 border-2 bg-blue-50' : 'border-gray-200'}
                ${isEditing ? 'bg-yellow-50 border-yellow-400' : 'hover:bg-gray-50'}
                ${isReordering || isDeleting === ref.id ? 'opacity-50 pointer-events-none' : ''}
              `}
            >
              {isEditing ? (
                // Edit mode
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Authors (comma-separated)</label>
                      <input
                        type="text"
                        className="w-full px-2 py-1 text-sm border rounded"
                        value={editForm.authors?.join(', ') || ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          authors: e.target.value.split(',').map(a => a.trim())
                        })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Year</label>
                      <input
                        type="text"
                        className="w-full px-2 py-1 text-sm border rounded"
                        value={editForm.year || ''}
                        onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Title</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1 text-sm border rounded"
                      value={editForm.title || ''}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Journal</label>
                      <input
                        type="text"
                        className="w-full px-2 py-1 text-sm border rounded"
                        value={editForm.journalName || ''}
                        onChange={(e) => setEditForm({ ...editForm, journalName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Volume/Issue</label>
                      <input
                        type="text"
                        className="w-full px-2 py-1 text-sm border rounded"
                        placeholder="e.g., 15(3)"
                        value={`${editForm.volume || ''}${editForm.issue ? `(${editForm.issue})` : ''}`}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Handle empty input - clear both volume and issue
                          if (!value.trim()) {
                            setEditForm({ ...editForm, volume: '', issue: '' });
                            return;
                          }
                          // Parse volume and optional issue from format like "15(3)"
                          const match = value.match(/^(\d+)(?:\((\d+)\))?$/);
                          if (match) {
                            setEditForm({
                              ...editForm,
                              volume: match[1] || '',
                              issue: match[2] || ''
                            });
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Pages</label>
                      <input
                        type="text"
                        className="w-full px-2 py-1 text-sm border rounded"
                        value={editForm.pages || ''}
                        onChange={(e) => setEditForm({ ...editForm, pages: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">DOI</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1 text-sm border rounded"
                      value={editForm.doi || ''}
                      onChange={(e) => setEditForm({ ...editForm, doi: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={cancelEdit}>
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit}>
                      <Check className="h-3 w-3 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="flex items-start gap-3">
                  {/* Drag handle */}
                  <div className="flex flex-col items-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                    <GripVertical className="h-5 w-5" />
                  </div>

                  {/* Reference number */}
                  <span className="text-sm font-bold text-blue-600 w-8 flex-shrink-0">
                    [{ref.number || index + 1}]
                  </span>

                  {/* Reference content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{ref.authors?.join(', ') || 'Unknown'}</span>
                      {ref.year && <span className="text-gray-600"> ({ref.year})</span>}
                      {'. '}
                      <span className="italic">{ref.title || 'Untitled'}</span>
                      {ref.journalName && <span className="text-gray-700">. {ref.journalName}</span>}
                      {ref.volume && <span>, {ref.volume}</span>}
                      {ref.issue && <span>({ref.issue})</span>}
                      {ref.pages && <span>, {ref.pages}</span>}
                    </p>
                    {ref.doi && (
                      <a
                        href={`https://doi.org/${ref.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline inline-flex items-center mt-1"
                      >
                        DOI: {ref.doi}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    )}
                  </div>

                  {/* Citation count badge */}
                  {citationCount > 0 && (
                    <Badge variant="default" className="flex-shrink-0">
                      {citationCount} cite{citationCount !== 1 ? 's' : ''}
                    </Badge>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Move up/down */}
                    <button
                      onClick={() => handleMove(ref.id, 'up')}
                      disabled={index === 0 || isReordering}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleMove(ref.id, 'down')}
                      disabled={index === localReferences.length - 1 || isReordering}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => startEdit(ref)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Edit reference"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(ref.id)}
                      disabled={isDeleting === ref.id}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete reference"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {localReferences.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No references found in this document.
        </div>
      )}
    </Card>
  );
}
