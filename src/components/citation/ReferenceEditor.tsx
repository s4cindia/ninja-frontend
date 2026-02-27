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
import { Trash2, GripVertical, Edit2, Check, X, ChevronUp, ChevronDown, ExternalLink, Loader2, Cloud, CloudOff, ShieldCheck, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// Debounce delay for auto-save (ms)
const DEBOUNCE_DELAY = 1500;

// Field display labels
const FIELD_LABELS: Record<string, string> = {
  authors: 'Authors',
  year: 'Year',
  title: 'Title',
  journalName: 'Journal',
  volume: 'Volume',
  issue: 'Issue',
  pages: 'Pages',
  publisher: 'Publisher',
  doi: 'DOI',
};

interface ValidationDiscrepancy {
  field: string;
  currentValue: string;
  correctValue: string;
}

interface ValidationResult {
  status: 'verified' | 'discrepancies_found' | 'not_found';
  message?: string;
  referenceId: string;
  lookupMethod?: 'doi' | 'search';
  confidence?: number;
  discrepancies?: ValidationDiscrepancy[];
  suggestedDoi?: string;
  crossrefMetadata?: {
    authors: string[];
    title: string;
    year?: string;
    journalName?: string;
    volume?: string;
    issue?: string;
    pages?: string;
    doi?: string;
    url?: string;
    publisher?: string;
    sourceType?: string;
  };
}

// Pending change types
type PendingChange =
  | { type: 'reorder'; referenceId: string; newPosition: number }
  | { type: 'delete'; referenceId: string }
  | { type: 'edit'; referenceId: string; data: Partial<Reference> };

// Source type labels for display
const SOURCE_TYPE_LABELS: Record<string, string> = {
  'journal_article': 'Journal Article',
  'book': 'Book',
  'book_chapter': 'Book Chapter',
  'conference_paper': 'Conference Paper',
  'preprint': 'Preprint',
  'website': 'Website',
  'thesis': 'Thesis',
  'report': 'Report',
  'newspaper': 'Newspaper',
  'magazine': 'Magazine',
  'unknown': 'Unknown'
};

interface Reference {
  id: string;
  number: number;
  authors: string[];
  year: string;
  title: string;
  sourceType?: string;
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
  citationCount?: number;
  formattedText?: string;
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

  // Validation state
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const [validatingId, setValidatingId] = useState<string | null>(null);

  // Debounce timer ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref to track pending changes for the debounce timer (avoids side effects in state updaters)
  const pendingChangesRef = useRef<PendingChange[]>([]);

  // Use refs for callbacks to avoid stale closures in debounce timer
  const onReloadRef = useRef(onReload);
  const onReorderCompleteRef = useRef(onReorderComplete);
  useEffect(() => { onReloadRef.current = onReload; }, [onReload]);
  useEffect(() => { onReorderCompleteRef.current = onReorderComplete; }, [onReorderComplete]);

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
      pendingChangesRef.current = [];

      // Use refs to get latest callback references (avoids stale closures)
      if (onReorderCompleteRef.current) {
        await onReorderCompleteRef.current();
      } else if (onReloadRef.current) {
        await onReloadRef.current();
      }
    } catch (err: unknown) {
      console.error('Batch save error:', err);
      setSaveError('Failed to save changes');
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [documentId]);

  // Debounced save - queues a change and schedules batch save
  const queueChange = useCallback((change: PendingChange) => {
    // Add to pending changes
    setPendingChanges(prev => {
      // Remove any existing change for the same reference (replace with latest)
      const filtered = prev.filter(c =>
        !(c.referenceId === change.referenceId && c.type === change.type)
      );
      const updated = [...filtered, change];
      pendingChangesRef.current = updated;
      return updated;
    });

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule batch save after debounce delay
    // Use ref to read current pending changes (no side effects in state updaters)
    saveTimeoutRef.current = setTimeout(() => {
      const current = pendingChangesRef.current;
      if (current.length > 0) {
        executeBatchSave(current);
      }
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
  // Use ref.citationCount from backend (correct) or fallback to counting linkedReferenceIds
  const getCitationCount = (refId: string, ref?: Reference) => {
    // Backend already calculates correct citationCount including linkedReferenceIds
    if (ref?.citationCount !== undefined) {
      return ref.citationCount;
    }
    // Fallback: count citations that link to this reference via linkedReferenceIds
    return citations?.filter(c =>
      c.referenceId === refId ||
      ((c as unknown as { linkedReferenceIds?: string[] }).linkedReferenceIds?.includes(refId))
    ).length || 0;
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
  const handleDelete = (refId: string, ref?: Reference) => {
    const citationCount = getCitationCount(refId, ref);
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
      sourceType: ref.sourceType,
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

  // Validate a reference against CrossRef
  const handleValidate = async (refId: string) => {
    setValidatingId(refId);
    // Clear previous result for this reference
    setValidationResults(prev => {
      const updated = { ...prev };
      delete updated[refId];
      return updated;
    });

    try {
      const response = await api.post(
        `/citation-management/document/${documentId}/reference/${refId}/validate`
      );
      if (response.data.success) {
        setValidationResults(prev => ({
          ...prev,
          [refId]: response.data.data as ValidationResult
        }));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Validation failed';
      toast.error(errorMessage);
    } finally {
      setValidatingId(null);
    }
  };

  // Accept all corrections from CrossRef validation
  const handleAcceptAllCorrections = (refId: string) => {
    const result = validationResults[refId];
    if (!result?.discrepancies?.length && !result?.suggestedDoi) return;

    const corrections: Partial<Reference> = {};

    // Apply discrepancies
    for (const d of result.discrepancies || []) {
      if (d.field === 'authors') {
        corrections.authors = d.correctValue.split(', ');
      } else {
        (corrections as Record<string, string>)[d.field] = d.correctValue;
      }
    }

    // Add suggested DOI
    if (result.suggestedDoi) {
      corrections.doi = result.suggestedDoi;
    }

    // Optimistic update
    setLocalReferences(prev =>
      prev.map(ref => ref.id === refId ? { ...ref, ...corrections } : ref)
    );

    // Queue the edit
    queueChange({ type: 'edit', referenceId: refId, data: corrections });

    // Clear validation result
    setValidationResults(prev => {
      const updated = { ...prev };
      delete updated[refId];
      return updated;
    });

    toast.success('Corrections applied');
  };

  // Accept a single field correction
  const handleAcceptField = (refId: string, field: string, correctValue: string) => {
    const corrections: Partial<Reference> = {};
    if (field === 'authors') {
      corrections.authors = correctValue.split(', ');
    } else {
      (corrections as Record<string, string>)[field] = correctValue;
    }

    // Optimistic update
    setLocalReferences(prev =>
      prev.map(ref => ref.id === refId ? { ...ref, ...corrections } : ref)
    );

    // Queue the edit
    queueChange({ type: 'edit', referenceId: refId, data: corrections });

    // Remove this discrepancy from validation results
    setValidationResults(prev => {
      const result = prev[refId];
      if (!result) return prev;
      const remaining = (result.discrepancies || []).filter(d => d.field !== field);
      const suggestedDoi = field === 'doi' ? undefined : result.suggestedDoi;
      if (remaining.length === 0 && !suggestedDoi) {
        const updated = { ...prev };
        delete updated[refId];
        return updated;
      }
      return { ...prev, [refId]: { ...result, discrepancies: remaining, suggestedDoi } };
    });

    toast.success(`${FIELD_LABELS[field] || field} updated`);
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
          const citationCount = getCitationCount(ref.id, ref);
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
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs text-gray-600">Title</label>
                      <input
                        type="text"
                        className="w-full px-2 py-1 text-sm border rounded"
                        value={editForm.title || ''}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Source Type</label>
                      <select
                        className="w-full px-2 py-1 text-sm border rounded bg-white"
                        value={editForm.sourceType || 'journal_article'}
                        onChange={(e) => setEditForm({ ...editForm, sourceType: e.target.value })}
                      >
                        <option value="journal_article">Journal Article</option>
                        <option value="book">Book</option>
                        <option value="book_chapter">Book Chapter</option>
                        <option value="conference_paper">Conference Paper</option>
                        <option value="preprint">Preprint</option>
                        <option value="website">Website</option>
                        <option value="thesis">Thesis</option>
                        <option value="report">Report</option>
                        <option value="newspaper">Newspaper</option>
                        <option value="magazine">Magazine</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Journal/Conference</label>
                      <input
                        type="text"
                        className="w-full px-2 py-1 text-sm border rounded"
                        value={editForm.journalName || ''}
                        onChange={(e) => setEditForm({ ...editForm, journalName: e.target.value })}
                        placeholder={editForm.sourceType === 'book' || editForm.sourceType === 'book_chapter' ? 'N/A for books' : ''}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Publisher</label>
                      <input
                        type="text"
                        className="w-full px-2 py-1 text-sm border rounded"
                        value={editForm.publisher || ''}
                        onChange={(e) => setEditForm({ ...editForm, publisher: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
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
                    <div>
                      <label className="text-xs text-gray-600">URL</label>
                      <input
                        type="text"
                        className="w-full px-2 py-1 text-sm border rounded"
                        value={editForm.url || ''}
                        onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
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
                    {ref.formattedText ? (
                      <p className="text-sm text-gray-900">{ref.formattedText}</p>
                    ) : (
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{ref.authors?.join(', ') || 'Unknown'}</span>
                        {ref.year && <span className="text-gray-600"> ({ref.year})</span>}
                        {'. '}
                        <span className="italic">{ref.title || 'Untitled'}</span>
                        {ref.journalName && <span className="text-gray-700">. {ref.journalName}</span>}
                        {ref.publisher && <span className="text-gray-700">. {ref.publisher}</span>}
                        {ref.volume && <span>, {ref.volume}</span>}
                        {ref.issue && <span>({ref.issue})</span>}
                        {ref.pages && <span>, {ref.pages}</span>}
                        {'.'}
                      </p>
                    )}
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

                  {/* Source type badge */}
                  {ref.sourceType && (
                    <span
                      className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border ${
                        ref.sourceType === 'book' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        ref.sourceType === 'conference_paper' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        ref.sourceType === 'preprint' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        ref.sourceType === 'thesis' ? 'bg-green-50 text-green-700 border-green-200' :
                        ref.sourceType === 'website' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {SOURCE_TYPE_LABELS[ref.sourceType] || ref.sourceType}
                    </span>
                  )}

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

                    {/* Validate against CrossRef */}
                    <button
                      onClick={() => handleValidate(ref.id)}
                      disabled={validatingId === ref.id}
                      className={`p-1 ${
                        validationResults[ref.id]?.status === 'verified'
                          ? 'text-green-500'
                          : validationResults[ref.id]?.status === 'discrepancies_found'
                          ? 'text-orange-500'
                          : 'text-gray-400 hover:text-indigo-600'
                      }`}
                      title="Validate against CrossRef"
                    >
                      {validatingId === ref.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
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
                      onClick={() => handleDelete(ref.id, ref)}
                      disabled={isDeleting === ref.id}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete reference"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Validation result panel */}
              {validationResults[ref.id] && (
                <div className="mt-2 ml-8">
                  {validationResults[ref.id].status === 'verified' && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-green-800">
                        Verified — All fields match CrossRef
                        {validationResults[ref.id].confidence && (
                          <span className="text-green-600 ml-1">
                            ({Math.round((validationResults[ref.id].confidence || 0) * 100)}% confidence)
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => setValidationResults(prev => {
                          const updated = { ...prev };
                          delete updated[ref.id];
                          return updated;
                        })}
                        className="ml-auto p-0.5 text-green-400 hover:text-green-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {validationResults[ref.id].status === 'discrepancies_found' && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-orange-800">
                            Discrepancies found
                            {validationResults[ref.id].lookupMethod === 'search' && (
                              <span className="font-normal text-orange-600 ml-1">
                                (via search, {Math.round((validationResults[ref.id].confidence || 0) * 100)}% match)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {((validationResults[ref.id].discrepancies?.length || 0) > 0 || validationResults[ref.id].suggestedDoi) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAcceptAllCorrections(ref.id)}
                              className="text-xs h-7"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Accept All
                            </Button>
                          )}
                          <button
                            onClick={() => setValidationResults(prev => {
                              const updated = { ...prev };
                              delete updated[ref.id];
                              return updated;
                            })}
                            className="p-0.5 text-orange-400 hover:text-orange-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Discrepancies table */}
                      {(validationResults[ref.id].discrepancies?.length || 0) > 0 && (
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-orange-200">
                              <th className="text-left py-1 pr-2 text-orange-700 font-medium w-20">Field</th>
                              <th className="text-left py-1 pr-2 text-orange-700 font-medium">Current</th>
                              <th className="text-left py-1 pr-2 text-orange-700 font-medium">CrossRef</th>
                              <th className="w-16"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {validationResults[ref.id].discrepancies?.map((d) => (
                              <tr key={d.field} className="border-b border-orange-100">
                                <td className="py-1 pr-2 text-orange-800 font-medium">{FIELD_LABELS[d.field] || d.field}</td>
                                <td className="py-1 pr-2 text-gray-600 max-w-[200px] truncate" title={d.currentValue}>
                                  {d.currentValue || <span className="italic text-gray-400">empty</span>}
                                </td>
                                <td className="py-1 pr-2 text-gray-900 font-medium max-w-[200px] truncate" title={d.correctValue}>
                                  {d.correctValue}
                                </td>
                                <td className="py-1 text-right">
                                  <button
                                    onClick={() => handleAcceptField(ref.id, d.field, d.correctValue)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                  >
                                    Accept
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {/* Suggested DOI */}
                      {validationResults[ref.id].suggestedDoi && (
                        <div className="mt-2 flex items-center gap-2 p-1.5 bg-blue-50 border border-blue-200 rounded">
                          <ExternalLink className="h-3 w-3 text-blue-600 flex-shrink-0" />
                          <span className="text-xs text-blue-800">
                            DOI found: <span className="font-mono">{validationResults[ref.id].suggestedDoi}</span>
                          </span>
                          <button
                            onClick={() => handleAcceptField(ref.id, 'doi', validationResults[ref.id].suggestedDoi!)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-auto"
                          >
                            Add DOI
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {validationResults[ref.id].status === 'not_found' && (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
                      <Info className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600">
                        {validationResults[ref.id].message || 'Reference not found in CrossRef database'}
                      </span>
                      <button
                        onClick={() => setValidationResults(prev => {
                          const updated = { ...prev };
                          delete updated[ref.id];
                          return updated;
                        })}
                        className="ml-auto p-0.5 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
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
