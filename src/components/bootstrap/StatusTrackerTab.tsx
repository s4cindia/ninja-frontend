import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import {
  STATUS_LABELS,
  type AnnotationStatus,
  type CorpusStatusRow,
} from '@/services/corpus-status.service';
import {
  useCorpusStatus,
  useUpdateCorpusStatus,
} from '@/hooks/useCorpusStatus';
import { StatusPill } from './StatusPill';
import { downloadCsv } from '@/lib/csv-export';

type SortKey =
  | 'serialNumber'
  | 'filename'
  | 'pages'
  | 'status'
  | 'annotator'
  | 'hours'
  | 'lastUpdated';
type SortDir = 'asc' | 'desc';

interface StatusFilter {
  status: AnnotationStatus | 'ALL';
  annotator: string | 'ALL';
  search: string;
}

const DEFAULT_FILTER: StatusFilter = {
  status: 'ALL',
  annotator: 'ALL',
  search: '',
};

function cmp(a: number | string, b: number | string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function rowSortValue(row: CorpusStatusRow, key: SortKey): string | number {
  switch (key) {
    case 'serialNumber':
      return row.serialNumber;
    case 'filename':
      return row.filename.toLowerCase();
    case 'pages':
      return row.pageCount > 0 ? row.pagesAnnotated / row.pageCount : 0;
    case 'status':
      return row.status;
    case 'annotator':
      return row.primaryAnnotator?.displayName.toLowerCase() ?? '';
    case 'hours':
      return row.hoursSpent;
    case 'lastUpdated':
      return row.lastUpdatedAt ?? '';
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function formatHours(hours: number): string {
  if (hours === 0) return '0';
  if (hours < 0.1) return '<0.1';
  return hours.toFixed(1);
}

export function StatusTrackerTab() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useCorpusStatus();
  const updateMutation = useUpdateCorpusStatus();

  const [filter, setFilter] = useState<StatusFilter>(DEFAULT_FILTER);
  const [sortKey, setSortKey] = useState<SortKey>('serialNumber');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [pendingDocId, setPendingDocId] = useState<string | null>(null);

  const rows = useMemo(() => data?.rows ?? [], [data]);

  const annotatorOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      if (row.primaryAnnotator?.displayName) {
        set.add(row.primaryAnnotator.displayName);
      }
    }
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const search = filter.search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter.status !== 'ALL' && row.status !== filter.status) return false;
      if (
        filter.annotator !== 'ALL' &&
        row.primaryAnnotator?.displayName !== filter.annotator
      ) {
        return false;
      }
      if (search && !row.filename.toLowerCase().includes(search)) return false;
      return true;
    });
  }, [rows, filter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const result = cmp(rowSortValue(a, sortKey), rowSortValue(b, sortKey));
      return sortDir === 'asc' ? result : -result;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleStatusChange = (
    documentId: string,
    next: AnnotationStatus,
  ) => {
    setPendingDocId(documentId);
    updateMutation.mutate(
      { documentId, payload: { statusOverride: next } },
      {
        onSettled: () => setPendingDocId(null),
      },
    );
  };

  const handleNoteSave = (documentId: string, note: string) => {
    setPendingDocId(documentId);
    updateMutation.mutate(
      { documentId, payload: { statusNote: note } },
      {
        onSettled: () => setPendingDocId(null),
      },
    );
  };

  const handleDownload = () => {
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv({
      filename: `annotation-status-${today}.csv`,
      columns: [
        { label: '#', value: (r: CorpusStatusRow) => r.serialNumber },
        { label: 'Title', value: (r: CorpusStatusRow) => r.filename },
        { label: 'Total Pages', value: (r: CorpusStatusRow) => r.pageCount },
        {
          label: 'Pages Annotated',
          value: (r: CorpusStatusRow) => r.pagesAnnotated,
        },
        {
          label: 'Status',
          value: (r: CorpusStatusRow) => STATUS_LABELS[r.status],
        },
        {
          label: 'Primary Annotator',
          value: (r: CorpusStatusRow) =>
            r.primaryAnnotator?.displayName ?? '',
        },
        {
          label: 'Hours Spent',
          value: (r: CorpusStatusRow) => Number(r.hoursSpent.toFixed(2)),
        },
        {
          label: 'Last Updated',
          value: (r: CorpusStatusRow) =>
            r.lastUpdatedAt
              ? new Date(r.lastUpdatedAt).toISOString().slice(0, 10)
              : '',
        },
        {
          label: 'Notes',
          value: (r: CorpusStatusRow) => r.statusNote ?? '',
        },
      ],
      rows: sorted,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading corpus status…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-8 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
        Failed to load corpus status:{' '}
        {error instanceof Error ? error.message : 'Unknown error'}.{' '}
        <button
          type="button"
          onClick={() => refetch()}
          className="ml-2 text-red-800 underline hover:text-red-900"
        >
          Retry
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg">
        No documents in the corpus yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filter.status}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                status: e.target.value as StatusFilter['status'],
              }))
            }
            className="text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            aria-label="Filter by status"
          >
            <option value="ALL">All statuses</option>
            {(
              Object.keys(STATUS_LABELS) as AnnotationStatus[]
            ).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          <select
            value={filter.annotator}
            onChange={(e) =>
              setFilter((f) => ({ ...f, annotator: e.target.value }))
            }
            className="text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            aria-label="Filter by annotator"
          >
            <option value="ALL">All annotators</option>
            {annotatorOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search title…"
            value={filter.search}
            onChange={(e) =>
              setFilter((f) => ({ ...f, search: e.target.value }))
            }
            className="text-xs border border-gray-300 rounded px-2 py-1.5 w-48 focus:outline-none focus:ring-1 focus:ring-blue-400"
            aria-label="Search title"
          />

          {(filter.status !== 'ALL' ||
            filter.annotator !== 'ALL' ||
            filter.search !== '') && (
            <button
              type="button"
              onClick={() => setFilter(DEFAULT_FILTER)}
              className="text-xs text-blue-600 hover:underline"
            >
              Reset
            </button>
          )}

          <span className="text-xs text-gray-500 ml-1">
            Showing {sorted.length} of {rows.length} titles
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            title="Refresh data"
          >
            <RefreshCw
              className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded bg-[#006B6B] text-white hover:bg-[#005858] transition-colors"
            title="Download visible rows as CSV"
          >
            <Download className="h-3 w-3" />
            Download CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortHeader
                label="#"
                sortKey="serialNumber"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={toggleSort}
                className="w-12"
              />
              <SortHeader
                label="Title"
                sortKey="filename"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={toggleSort}
              />
              <SortHeader
                label="Pages"
                sortKey="pages"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={toggleSort}
                className="w-32"
              />
              <SortHeader
                label="Status"
                sortKey="status"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={toggleSort}
                className="w-40"
              />
              <SortHeader
                label="Annotator"
                sortKey="annotator"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={toggleSort}
                className="w-36"
              />
              <SortHeader
                label="Hours"
                sortKey="hours"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={toggleSort}
                className="w-20 text-right"
                align="right"
              />
              <SortHeader
                label="Last Updated"
                sortKey="lastUpdated"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={toggleSort}
                className="w-28"
              />
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sorted.map((row) => (
              <StatusRow
                key={row.documentId}
                row={row}
                isPending={pendingDocId === row.documentId}
                onStatusChange={(next) =>
                  handleStatusChange(row.documentId, next)
                }
                onNoteSave={(note) => handleNoteSave(row.documentId, note)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {data?.generatedAt && (
        <div className="text-[11px] text-gray-400">
          Last refreshed: {new Date(data.generatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
  align?: 'left' | 'right';
}

function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className,
  align,
}: SortHeaderProps) {
  const isActive = sortKey === currentKey;
  const arrow = isActive ? (currentDir === 'asc' ? '▲' : '▼') : '';
  return (
    <th
      scope="col"
      className={`px-3 py-2 text-${align ?? 'left'} text-xs font-semibold text-gray-700 ${className ?? ''}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-gray-900"
      >
        {label}
        <span className="text-[9px] text-gray-400 w-2 inline-block">
          {arrow}
        </span>
      </button>
    </th>
  );
}

interface StatusRowProps {
  row: CorpusStatusRow;
  isPending: boolean;
  onStatusChange: (next: AnnotationStatus) => void;
  onNoteSave: (note: string) => void;
}

function StatusRow({
  row,
  isPending,
  onStatusChange,
  onNoteSave,
}: StatusRowProps) {
  const pct =
    row.pageCount > 0 ? Math.round((row.pagesAnnotated / row.pageCount) * 100) : 0;
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2 text-xs text-gray-500">{row.serialNumber}</td>
      <td
        className="px-3 py-2 text-xs font-medium text-gray-900 truncate max-w-md"
        title={row.filename}
      >
        {row.filename}
      </td>
      <td className="px-3 py-2 text-xs text-gray-700">
        <span className="font-mono">
          {row.pagesAnnotated} / {row.pageCount}
        </span>
        <span className="text-gray-400 ml-1">({pct}%)</span>
      </td>
      <td className="px-3 py-2">
        <StatusPill
          status={row.status}
          isOverride={row.statusOverride !== null}
          isSaving={isPending}
          onChange={onStatusChange}
        />
      </td>
      <td className="px-3 py-2 text-xs text-gray-700">
        {row.primaryAnnotator ? (
          <span title={row.primaryAnnotator.email ?? undefined}>
            {row.primaryAnnotator.displayName}
            {row.otherAnnotatorCount > 0 && (
              <span
                className="ml-1 inline-flex items-center px-1 py-0.5 text-[10px] rounded bg-gray-100 text-gray-500"
                title={`${row.otherAnnotatorCount} additional annotator(s)`}
              >
                +{row.otherAnnotatorCount}
              </span>
            )}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-gray-700 text-right tabular-nums">
        {formatHours(row.hoursSpent)}
      </td>
      <td className="px-3 py-2 text-xs text-gray-500">
        {formatDate(row.lastUpdatedAt)}
      </td>
      <td className="px-3 py-2 text-xs text-gray-700">
        <NotesCell
          initial={row.statusNote ?? ''}
          onSave={onNoteSave}
          disabled={isPending}
        />
      </td>
    </tr>
  );
}

interface NotesCellProps {
  initial: string;
  onSave: (note: string) => void;
  disabled?: boolean;
}

const MAX_NOTE_LENGTH = 500;

function NotesCell({ initial, onSave, disabled }: NotesCellProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed === initial.trim()) return;
    onSave(trimmed);
  };

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        value={value}
        maxLength={MAX_NOTE_LENGTH}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setValue(initial);
            setEditing(false);
          } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            commit();
          }
        }}
        rows={2}
        className="w-full text-xs border border-blue-400 rounded px-2 py-1 resize-y focus:outline-none focus:ring-1 focus:ring-blue-400"
        aria-label="Notes"
      />
    );
  }

  const preview = initial.length > 100 ? `${initial.slice(0, 100)}…` : initial;

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      title={initial || 'Click to add notes'}
      className={`w-full text-left text-xs px-1 py-0.5 rounded transition-colors ${
        initial
          ? 'text-gray-700'
          : 'text-gray-400 italic hover:text-gray-600'
      } ${disabled ? 'cursor-default' : 'hover:bg-gray-50 cursor-text'}`}
    >
      {preview || 'Add notes…'}
    </button>
  );
}
