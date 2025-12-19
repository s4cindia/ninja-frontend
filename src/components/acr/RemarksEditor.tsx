import { useState, useEffect } from 'react';
import { Sparkles, Edit2, Check, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { validateRemarks } from '@/hooks/useAcrEditor';
import type { ConformanceLevel } from '@/types/acr.types';

interface RemarksEditorProps {
  remarks: string;
  conformanceLevel: ConformanceLevel;
  onSave: (remarks: string) => void;
  onGenerateAI: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export function RemarksEditor({
  remarks,
  conformanceLevel,
  onSave,
  onGenerateAI,
  isGenerating,
  disabled = false,
}: RemarksEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(remarks);
  
  useEffect(() => {
    if (!isEditing) {
      setEditValue(remarks);
    }
  }, [remarks, isEditing]);
  
  const validation = validateRemarks(isEditing ? editValue : remarks, conformanceLevel);
  
  const handleStartEdit = () => {
    setEditValue(remarks);
    setIsEditing(true);
  };
  
  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setEditValue(remarks);
    setIsEditing(false);
  };
  
  const handleGenerate = () => {
    onGenerateAI();
  };

  return (
    <div className="space-y-2">
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            placeholder="Enter remarks describing the conformance status..."
            disabled={disabled}
          />
          <div className="flex items-center justify-between">
            <span className={cn(
              'text-xs',
              validation.characterCount < 20 ? 'text-red-500' : 'text-gray-500'
            )}>
              {validation.characterCount} characters
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={disabled}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <p className={cn(
              'text-sm flex-1',
              remarks ? 'text-gray-700' : 'text-gray-400 italic'
            )}>
              {remarks || 'No remarks provided'}
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                disabled={disabled || isGenerating}
                isLoading={isGenerating}
                title="Generate AI remarks"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartEdit}
                disabled={disabled}
                title="Edit remarks"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {validation.warnings.length > 0 && (
        <div className="space-y-1">
          {validation.warnings.map((warning, idx) => (
            <div key={idx} className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
