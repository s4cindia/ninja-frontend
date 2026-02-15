import { useState } from 'react';
import { Check, X, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import type { ValidationViolation } from '@/types/citation-validation.types';

interface ViolationCardProps {
  violation: ValidationViolation;
  onAccept: () => void;
  onReject: () => void;
  onEdit: (text: string) => void;
  isLoading?: boolean;
}

export function ViolationCard({
  violation,
  onAccept,
  onReject,
  onEdit,
  isLoading
}: ViolationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(violation.suggestedFix);

  const handleSaveEdit = () => {
    onEdit(editText);
    setIsEditing(false);
  };

  return (
    <Card
      className={cn(
        'p-4 border-l-4',
        violation.severity === 'error' ? 'border-l-red-500' : 'border-l-yellow-500',
        violation.status !== 'pending' && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
              violation.severity === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            )}
          >
            {violation.severity.toUpperCase()}
          </span>
          <span className="ml-2 text-sm text-gray-500">{violation.ruleReference}</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-600"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <p className="font-medium text-gray-900 mb-2">{violation.ruleName}</p>

      <div className="bg-gray-50 rounded p-3 mb-3 font-mono text-sm">
        <div className="text-gray-600 mb-1">Original:</div>
        <div className="text-gray-900">
          {violation.citationText.split(violation.originalText).map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <mark className="bg-red-200 px-0.5">{violation.originalText}</mark>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-green-50 rounded p-3 mb-3 font-mono text-sm">
        <div className="text-gray-600 mb-1">Suggested:</div>
        <div className="text-green-800">{violation.correctedCitation}</div>
      </div>

      {isExpanded && (
        <div className="mb-3 p-3 bg-blue-50 rounded text-sm">
          <p className="font-medium text-blue-900 mb-1">Why this matters:</p>
          <p className="text-blue-800">{violation.explanation}</p>
        </div>
      )}

      {isEditing && (
        <div className="mb-3">
          <label htmlFor={`edit-${violation.id}`} className="sr-only">Edit correction</label>
          <textarea
            id={`edit-${violation.id}`}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
            rows={2}
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleSaveEdit}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {violation.status === 'pending' && !isEditing && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={onAccept}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-1" aria-hidden="true" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
          >
            <Edit2 className="h-4 w-4 mr-1" aria-hidden="true" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onReject}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-1" aria-hidden="true" />
            Ignore
          </Button>
        </div>
      )}

      {violation.status !== 'pending' && (
        <div
          className={cn(
            'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
            violation.status === 'accepted' && 'bg-green-100 text-green-800',
            violation.status === 'rejected' && 'bg-gray-100 text-gray-800',
            violation.status === 'edited' && 'bg-blue-100 text-blue-800'
          )}
        >
          {violation.status === 'accepted' && 'Corrected'}
          {violation.status === 'rejected' && 'Ignored'}
          {violation.status === 'edited' && 'Manually edited'}
        </div>
      )}
    </Card>
  );
}
