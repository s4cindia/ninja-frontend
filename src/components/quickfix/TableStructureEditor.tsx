import { useState, useCallback } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import type { Cell, CellType, TableData, TableSection } from '@/types/zone.types';

interface TableStructureEditorProps {
  zoneId: string;
  initialData: { thead: TableSection; tbody: TableSection };
  onSave: (data: TableData) => void;
  onClose: () => void;
}

interface CellAddress {
  section: 'thead' | 'tbody';
  rowIndex: number;
  cellIndex: number;
}

function createCell(type: CellType, content = ''): Cell {
  return { type, content, colspan: 1, rowspan: 1, align: 'left' };
}

function cloneTableData(data: TableData): TableData {
  return JSON.parse(JSON.stringify(data));
}

export function TableStructureEditor({ zoneId, initialData, onSave, onClose }: TableStructureEditorProps) {
  const [tableData, setTableData] = useState<TableData>(() => cloneTableData(initialData));
  const [selected, setSelected] = useState<CellAddress | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSelectedCell = useCallback((): Cell | null => {
    if (!selected) return null;
    const section = tableData[selected.section];
    return section.rows[selected.rowIndex]?.cells[selected.cellIndex] ?? null;
  }, [selected, tableData]);

  const updateTable = useCallback((updater: (draft: TableData) => void) => {
    setTableData(prev => {
      const next = cloneTableData(prev);
      updater(next);
      return next;
    });
  }, []);

  const handleMergeRight = useCallback(() => {
    if (!selected) return;
    const { section, rowIndex, cellIndex } = selected;
    updateTable(draft => {
      const row = draft[section].rows[rowIndex];
      if (cellIndex + 1 >= row.cells.length) return;
      const current = row.cells[cellIndex];
      const next = row.cells[cellIndex + 1];
      current.colspan += next.colspan;
      current.content += ' ' + next.content;
      row.cells.splice(cellIndex + 1, 1);
    });
  }, [selected, updateTable]);

  const handleMergeDown = useCallback(() => {
    if (!selected) return;
    const { section, rowIndex, cellIndex } = selected;
    updateTable(draft => {
      const rows = draft[section].rows;
      if (rowIndex + 1 >= rows.length) return;
      const current = rows[rowIndex].cells[cellIndex];
      if (!current) return;
      const belowRow = rows[rowIndex + 1];
      if (cellIndex >= belowRow.cells.length) return;
      const below = belowRow.cells[cellIndex];
      // Only merge if colspan matches to keep table rectangular
      if (current.colspan !== below.colspan) return;
      current.rowspan += below.rowspan;
      current.content += ' ' + below.content;
      belowRow.cells.splice(cellIndex, 1);
    });
  }, [selected, updateTable]);

  const handleAddCol = useCallback(() => {
    updateTable(draft => {
      const addToSection = (sec: TableSection, type: CellType) => {
        sec.rows.forEach(row => {
          row.cells.push(createCell(type));
        });
      };
      addToSection(draft.thead, 'TH');
      addToSection(draft.tbody, 'TD');
    });
  }, [updateTable]);

  const handleRemoveCol = useCallback(() => {
    setTableData(prev => {
      const next = cloneTableData(prev);
      const removeFromSection = (sec: TableSection) => {
        sec.rows.forEach(row => {
          if (row.cells.length > 1) {
            row.cells.pop();
          }
        });
      };
      removeFromSection(next.thead);
      removeFromSection(next.tbody);
      // Clear selection if the selected cell no longer exists
      if (selected) {
        const maxCells = Math.max(
          ...next.thead.rows.map(r => r.cells.length),
          ...next.tbody.rows.map(r => r.cells.length),
        );
        if (selected.cellIndex >= maxCells) {
          setSelected(null);
        }
      }
      return next;
    });
  }, [selected]);

  const handleAddRow = useCallback(() => {
    if (!selected) {
      updateTable(draft => {
        const colCount = Math.max(
          ...draft.tbody.rows.map(r => r.cells.length),
          ...draft.thead.rows.map(r => r.cells.length),
          1,
        );
        draft.tbody.rows.push({ cells: Array.from({ length: colCount }, () => createCell('TD')) });
      });
      return;
    }
    const { section } = selected;
    updateTable(draft => {
      const colCount = Math.max(
        ...draft[section].rows.map(r => r.cells.length),
        1,
      );
      const type: CellType = section === 'thead' ? 'TH' : 'TD';
      draft[section].rows.push({ cells: Array.from({ length: colCount }, () => createCell(type)) });
    });
  }, [selected, updateTable]);

  const handleRemoveRow = useCallback(() => {
    if (!selected) return;
    const { section, rowIndex } = selected;
    updateTable(draft => {
      if (draft[section].rows.length > 1) {
        draft[section].rows.splice(rowIndex, 1);
      }
    });
    setSelected(null);
  }, [selected, updateTable]);

  const handleToggleCellType = useCallback(() => {
    if (!selected) return;
    const { section, rowIndex, cellIndex } = selected;
    updateTable(draft => {
      const cell = draft[section].rows[rowIndex]?.cells[cellIndex];
      if (cell) {
        cell.type = cell.type === 'TH' ? 'TD' : 'TH';
      }
    });
  }, [selected, updateTable]);

  const handleAlign = useCallback((align: 'left' | 'center' | 'right') => {
    if (!selected) return;
    const { section, rowIndex, cellIndex } = selected;
    updateTable(draft => {
      const cell = draft[section].rows[rowIndex]?.cells[cellIndex];
      if (cell) {
        cell.align = align;
      }
    });
  }, [selected, updateTable]);

  const handleDeleteCell = useCallback(() => {
    if (!selected) return;
    const { cellIndex } = selected;
    updateTable(draft => {
      // Delete the entire column across both sections to keep the table rectangular
      const removeCol = (sec: TableSection) => {
        sec.rows.forEach(row => {
          if (row.cells.length > 1 && cellIndex < row.cells.length) {
            row.cells.splice(cellIndex, 1);
          }
        });
      };
      removeCol(draft.thead);
      removeCol(draft.tbody);
    });
    setSelected(null);
  }, [selected, updateTable]);

  const handleEditContent = useCallback(() => {
    if (!selected) return;
    const cell = getSelectedCell();
    if (!cell) return;
    const newContent = window.prompt('Edit cell content:', cell.content);
    if (newContent === null) return;
    const { section, rowIndex, cellIndex } = selected;
    updateTable(draft => {
      const c = draft[section].rows[rowIndex]?.cells[cellIndex];
      if (c) c.content = newContent;
    });
  }, [selected, getSelectedCell, updateTable]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/zones/${zoneId}/table-structure`, {
        thead: tableData.thead,
        tbody: tableData.tbody,
      });
      onSave(tableData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save table structure');
    } finally {
      setSaving(false);
    }
  }, [zoneId, tableData, onSave, onClose]);

  const selectedCell = getSelectedCell();

  const renderSection = (section: 'thead' | 'tbody', sectionData: TableSection) => (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
            section === 'thead' ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white'
          }`}
        >
          {section === 'thead' ? 'TH' : 'TD'}
        </span>
        <span className="text-sm text-gray-500 uppercase tracking-wide">{section}</span>
      </div>
      <table className="border-collapse w-full">
        <tbody>
          {sectionData.rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {row.cells.map((cell, cellIdx) => {
                const isSelected =
                  selected?.section === section &&
                  selected.rowIndex === rowIdx &&
                  selected.cellIndex === cellIdx;
                return (
                  <td
                    key={cellIdx}
                    colSpan={cell.colspan}
                    rowSpan={cell.rowspan}
                    onClick={() => setSelected({ section, rowIndex: rowIdx, cellIndex: cellIdx })}
                    className={`border border-gray-300 px-3 py-2 cursor-pointer select-none text-sm ${
                      cell.type === 'TH'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-gray-100 text-gray-800'
                    } ${isSelected ? 'ring-2 ring-orange-500' : ''}`}
                    style={{ textAlign: cell.align }}
                  >
                    {cell.content || '\u00A0'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <div className="bg-white rounded-lg shadow-2xl w-[95vw] h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#1B3A6B] text-white px-6 py-3 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold">Edit Table Structure</h2>
          <div className="flex items-center gap-3">
            {error && <span className="text-red-300 text-sm mr-2">{error}</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — page thumbnail placeholder */}
          <div className="w-1/4 border-r border-gray-200 bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full h-full bg-gray-300 rounded flex items-center justify-center text-gray-500 text-sm font-medium">
              Page Preview
            </div>
          </div>

          {/* Right panel — table grid editor */}
          <div className="w-3/4 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
              <ToolbarButton onClick={handleMergeRight} disabled={!selected}>Merge Right</ToolbarButton>
              <ToolbarButton onClick={handleMergeDown} disabled={!selected}>Merge Down</ToolbarButton>
              <ToolbarDivider />
              <ToolbarButton onClick={handleAddCol}>Add Col</ToolbarButton>
              <ToolbarButton onClick={handleRemoveCol}>Remove Col</ToolbarButton>
              <ToolbarButton onClick={handleAddRow}>Add Row</ToolbarButton>
              <ToolbarButton onClick={handleRemoveRow} disabled={!selected}>Remove Row</ToolbarButton>
              <ToolbarDivider />
              <ToolbarButton onClick={handleToggleCellType} disabled={!selected}>
                TH/TD Toggle{selectedCell ? ` (${selectedCell.type})` : ''}
              </ToolbarButton>
              <ToolbarDivider />
              <ToolbarButton onClick={() => handleAlign('left')} disabled={!selected}>Left</ToolbarButton>
              <ToolbarButton onClick={() => handleAlign('center')} disabled={!selected}>Center</ToolbarButton>
              <ToolbarButton onClick={() => handleAlign('right')} disabled={!selected}>Right</ToolbarButton>
              <ToolbarDivider />
              <ToolbarButton onClick={handleDeleteCell} disabled={!selected}>Delete Cell</ToolbarButton>
              <ToolbarButton onClick={handleEditContent} disabled={!selected}>Edit Content</ToolbarButton>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto p-4">
              {renderSection('thead', tableData.thead)}
              {renderSection('tbody', tableData.tbody)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2.5 py-1 text-xs font-medium rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-300 mx-1" />;
}
