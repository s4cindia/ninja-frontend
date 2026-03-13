import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, GripVertical, Pencil } from 'lucide-react';
import { TableStructureEditor } from './TableStructureEditor';
import type { TableData } from '@/types/zone.types';

export interface ZoneChild {
  id: string;
  zoneSubtype: string;
  rowCount: number;
  tableStructure: TableData;
}

export interface Zone {
  id: string;
  type: string;
  label?: string;
  readingOrder?: number;
  zoneSubtype?: string;
  rowCount?: number;
  tableStructure?: TableData;
  children?: ZoneChild[];
}

interface ZoneListProps {
  zones: Zone[];
  selectedZoneId?: string;
  onSelectZone: (id: string) => void;
  onReorder: (zones: Zone[]) => void;
}

export function ZoneList({ zones, selectedZoneId, onSelectZone, onReorder }: ZoneListProps) {
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const [editorState, setEditorState] = useState<{
    zoneId: string;
    initialData: TableData;
  } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const toggleExpand = useCallback((e: React.MouseEvent, zoneId: string) => {
    e.stopPropagation();
    setExpandedZones(prev => {
      const next = new Set(prev);
      if (next.has(zoneId)) {
        next.delete(zoneId);
      } else {
        next.add(zoneId);
      }
      return next;
    });
  }, []);

  const openEditor = useCallback((zone: Zone) => {
    if (!zone.tableStructure) return;
    setEditorState({ zoneId: zone.id, initialData: zone.tableStructure });
  }, []);

  const handleEditorSave = useCallback((data: TableData) => {
    if (!editorState) return;
    const updated = zones.map(z =>
      z.id === editorState.zoneId ? { ...z, tableStructure: data } : z,
    );
    onReorder(updated);
  }, [editorState, zones, onReorder]);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...zones];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    onReorder(reordered);
    setDragIndex(index);
  }, [dragIndex, zones, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  const isTableZone = (zone: Zone) =>
    zone.type.toUpperCase() === 'TABLE' || (zone.children && zone.children.length > 0);

  return (
    <>
      <div className="divide-y divide-gray-200">
        {zones.map((zone, index) => {
          const expanded = expandedZones.has(zone.id);
          const isTable = isTableZone(zone);
          const isSelected = zone.id === selectedZoneId;

          return (
            <div key={zone.id}>
              {/* Top-level zone row */}
              <div
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectZone(zone.id)}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-gray-50'
                }`}
              >
                {/* Drag handle */}
                <GripVertical className="w-4 h-4 text-gray-400 cursor-grab shrink-0" />

                {/* Chevron for TABLE zones */}
                {isTable ? (
                  <button
                    onClick={(e) => toggleExpand(e, zone.id)}
                    className="p-0.5 rounded hover:bg-gray-200 shrink-0"
                  >
                    {expanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                ) : (
                  <div className="w-5 shrink-0" />
                )}

                {/* Type badge */}
                <span className="bg-teal-600 text-white text-xs px-2 py-0.5 rounded shrink-0">
                  {zone.type}
                </span>

                {/* Label */}
                <span className="text-sm text-gray-800 truncate flex-1">
                  {zone.label || zone.type}
                </span>

                {/* Reading order */}
                {zone.readingOrder != null && (
                  <span className="text-xs text-gray-400 shrink-0">#{zone.readingOrder}</span>
                )}

                {/* Pencil icon — only for TABLE zones */}
                {isTable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditor(zone);
                    }}
                    className="p-1 rounded hover:bg-gray-200 shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                )}
              </div>

              {/* Expanded children for TABLE zones */}
              {isTable && expanded && zone.children && zone.children.length > 0 && (
                <div className="ml-6 border-l-2 border-teal-400 bg-gray-50">
                  {zone.children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center gap-2 px-3 py-2"
                    >
                      {/* No drag handle on children */}
                      <div className="w-4 shrink-0" />

                      {/* Child badge */}
                      <span className="text-xs font-medium text-gray-600 shrink-0">
                        {child.zoneSubtype === 'thead' ? 'THEAD' : 'TBODY'} ({child.rowCount} rows)
                      </span>

                      <span className="flex-1" />

                      {/* Child properties */}
                      <span className="text-xs text-gray-400 shrink-0">
                        Type: {child.zoneSubtype}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        Rows: {child.rowCount}
                      </span>

                      {/* Edit Structure button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditor(zone);
                        }}
                        className="text-xs px-2 py-0.5 rounded bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors shrink-0"
                      >
                        Edit Structure
                      </button>

                      {/* Pencil icon on child */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditor(zone);
                        }}
                        className="p-1 rounded hover:bg-gray-200 shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Table Structure Editor modal */}
      {editorState && (
        <TableStructureEditor
          zoneId={editorState.zoneId}
          initialData={editorState.initialData}
          onSave={handleEditorSave}
          onClose={() => setEditorState(null)}
        />
      )}
    </>
  );
}
