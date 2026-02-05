import { useState } from 'react';
import { Edit2, Check, X, ExternalLink, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import type { ReferenceEntry } from '@/types/reference-list.types';

interface ReferenceEntryCardProps {
  entry: ReferenceEntry;
  index: number;
  onEdit: (updates: Partial<ReferenceEntry>) => void;
}

export function ReferenceEntryCard({ entry, index, onEdit }: ReferenceEntryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEntry, setEditedEntry] = useState(entry);

  const handleSave = () => {
    onEdit(editedEntry);
    setIsEditing(false);
  };

  const formatWithItalics = (text: string) => {
    return text.split(/\*([^*]+)\*/).map((part, i) =>
      i % 2 === 1 ? <em key={i}>{part}</em> : part
    );
  };

  return (
    <Card className={cn(
      'p-4',
      entry.needsReview && 'border-l-4 border-l-yellow-500'
    )}>
      <div className="flex items-start gap-4">
        <span className="text-gray-400 font-mono text-sm">{index + 1}.</span>

        <div className="flex-1">
          {!isEditing ? (
            <p className="text-gray-900">{formatWithItalics(entry.formatted)}</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Authors</label>
                  <input
                    type="text"
                    value={editedEntry.authors.map(a => `${a.lastName}, ${a.firstName || ''}`).join('; ')}
                    onChange={(e) => {
                      const authors = e.target.value.split(';').map(a => {
                        const [lastName, firstName] = a.trim().split(',').map(s => s.trim());
                        return { lastName: lastName || '', firstName };
                      });
                      setEditedEntry({ ...editedEntry, authors });
                    }}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Year</label>
                  <input
                    type="text"
                    value={editedEntry.year || ''}
                    onChange={(e) => setEditedEntry({ ...editedEntry, year: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Title</label>
                <input
                  type="text"
                  value={editedEntry.title}
                  onChange={(e) => setEditedEntry({ ...editedEntry, title: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Journal</label>
                  <input
                    type="text"
                    value={editedEntry.journalName || ''}
                    onChange={(e) => setEditedEntry({ ...editedEntry, journalName: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Volume(Issue)</label>
                  <input
                    type="text"
                    value={`${editedEntry.volume || ''}${editedEntry.issue ? `(${editedEntry.issue})` : ''}`}
                    onChange={(e) => {
                      const match = e.target.value.match(/^(\d+)(?:\((\d+)\))?$/);
                      if (match) {
                        setEditedEntry({
                          ...editedEntry,
                          volume: match[1],
                          issue: match[2]
                        });
                      }
                    }}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Pages</label>
                  <input
                    type="text"
                    value={editedEntry.pages || ''}
                    onChange={(e) => setEditedEntry({ ...editedEntry, pages: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">DOI</label>
                <input
                  type="text"
                  value={editedEntry.doi || ''}
                  onChange={(e) => setEditedEntry({ ...editedEntry, doi: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span className={cn(
              'text-xs px-2 py-0.5 rounded',
              entry.enrichmentSource === 'crossref' && 'bg-green-100 text-green-700',
              entry.enrichmentSource === 'pubmed' && 'bg-blue-100 text-blue-700',
              entry.enrichmentSource === 'manual' && 'bg-gray-100 text-gray-700',
              entry.enrichmentSource === 'ai' && 'bg-purple-100 text-purple-700'
            )}>
              {entry.enrichmentSource}
            </span>
            <span className="text-xs text-gray-500">
              {Math.round(entry.enrichmentConfidence * 100)}% confidence
            </span>
            {entry.doi && (
              <a
                href={`https://doi.org/${entry.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                DOI
              </a>
            )}
            {entry.needsReview && (
              <span className="text-xs text-yellow-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                {entry.reviewReason || 'Needs review'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isEditing ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              aria-label="Edit reference"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={handleSave} aria-label="Save changes">
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditedEntry(entry);
                  setIsEditing(false);
                }}
                aria-label="Cancel editing"
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
