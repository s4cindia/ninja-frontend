import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { 
  FileText, Code, Eye, Edit2, Check, X, Copy, 
  Sparkles, RefreshCw, ChevronDown,
  ChevronUp, Info, CheckCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '@/utils/cn';
import { LongDescription, AriaMarkup } from '@/types/alt-text.types';

interface LongDescriptionEditorProps {
  description?: LongDescription;
  shortAlt?: string;
  imageId?: string;
  imageUrl?: string;
  onSave?: (content: { plainText: string; markdown: string; html: string }) => Promise<void>;
  onApprove?: () => Promise<void>;
  onGenerate?: () => Promise<void>;
  isGenerating?: boolean;
  readOnly?: boolean;
}

type ViewMode = 'plainText' | 'markdown' | 'html' | 'preview';

const TRIGGER_LABELS: Record<string, string> = {
  COMPLEX_CHART: 'Complex Chart',
  MANY_COMPONENTS: 'Many Components',
  DENSE_INFORMATION: 'Dense Information',
  DATA_TABLE: 'Data Table',
  FLOWCHART: 'Flowchart',
  MANUAL_REQUEST: 'Manual Request',
};

export const LongDescriptionEditor: React.FC<LongDescriptionEditorProps> = ({
  description,
  shortAlt,
  imageId,
  imageUrl,
  onSave,
  onApprove,
  onGenerate,
  isGenerating = false,
  readOnly = false,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('plainText');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState({
    plainText: description?.content.plainText || '',
    markdown: description?.content.markdown || '',
    html: description?.content.html || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showAriaMarkup, setShowAriaMarkup] = useState(false);

  useEffect(() => {
    if (description) {
      setEditContent({
        plainText: description.content.plainText,
        markdown: description.content.markdown,
        html: description.content.html,
      });
    }
  }, [description]);

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(editContent);
      setIsEditing(false);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (description) {
      setEditContent({
        plainText: description.content.plainText,
        markdown: description.content.markdown,
        html: description.content.html,
      });
    }
    setIsEditing(false);
  };

  const wordCount = editContent.plainText.split(/\s+/).filter(w => w.length > 0).length;

  const generateAriaMarkup = (): AriaMarkup => {
    const descId = `desc-${imageId || 'image'}`;
    return {
      imgTag: `<img src="..." alt="${shortAlt || ''}" aria-describedby="${descId}" />`,
      descriptionDiv: `<div id="${descId}" class="sr-only">\n${editContent.html || editContent.plainText}\n</div>`,
    };
  };

  if (!description && !isGenerating) {
    return (
      <div className="border rounded-lg p-6 bg-gray-50 text-center">
        <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
        <h3 className="font-medium text-gray-900 mb-2">No Long Description</h3>
        <p className="text-sm text-gray-600 mb-4">
          Complex images like charts, diagrams, and infographics benefit from detailed descriptions beyond the standard alt text.
        </p>
        {onGenerate && (
          <Button variant="primary" onClick={onGenerate}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Long Description
          </Button>
        )}
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="border rounded-lg p-6 bg-gray-50 text-center">
        <RefreshCw className="h-12 w-12 mx-auto text-primary-500 mb-3 animate-spin" />
        <h3 className="font-medium text-gray-900 mb-2">Generating Long Description</h3>
        <p className="text-sm text-gray-600">
          Analyzing image content and generating detailed description...
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">Long Description</h3>
          {description?.trigger && (
            <Badge variant="default" className="text-xs">
              {TRIGGER_LABELS[description.trigger] || description.trigger}
            </Badge>
          )}
          {description?.status && (
            <Badge 
              variant={
                description.status === 'approved' ? 'success' :
                description.status === 'edited' ? 'info' : 'default'
              }
              className="text-xs"
            >
              {description.status}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{wordCount} words</span>
          {!readOnly && !isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {imageUrl && (
        <div className="p-3 bg-gray-100 border-b flex justify-center">
          <img 
            src={imageUrl} 
            alt={shortAlt || ''} 
            className="max-h-32 object-contain rounded"
          />
        </div>
      )}

      <div className="flex border-b">
        {(['plainText', 'markdown', 'html', 'preview'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={cn(
              'flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 -mb-px',
              viewMode === mode
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {mode === 'plainText' && <FileText className="h-4 w-4" />}
            {mode === 'markdown' && <span className="font-mono text-xs">MD</span>}
            {mode === 'html' && <Code className="h-4 w-4" />}
            {mode === 'preview' && <Eye className="h-4 w-4" />}
            {mode === 'plainText' && 'Plain Text'}
            {mode === 'markdown' && 'Markdown'}
            {mode === 'html' && 'HTML'}
            {mode === 'preview' && 'Preview'}
          </button>
        ))}
      </div>

      <div className="p-4">
        {viewMode === 'preview' ? (
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(editContent.html || editContent.plainText) 
            }}
          />
        ) : isEditing ? (
          <textarea
            value={editContent[viewMode]}
            onChange={(e) => setEditContent(prev => ({ ...prev, [viewMode]: e.target.value }))}
            className="w-full h-64 p-3 border rounded-lg font-mono text-sm resize-y"
            placeholder={`Enter ${viewMode} content...`}
          />
        ) : (
          <div className="relative">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-3 rounded-lg max-h-64 overflow-y-auto">
              {editContent[viewMode] || '(empty)'}
            </pre>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => handleCopy(editContent[viewMode], viewMode)}
            >
              {copied === viewMode ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {description?.sections && description.sections.length > 0 && viewMode === 'plainText' && !isEditing && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-gray-500">Structured Sections</p>
            {description.sections.map((section, i) => (
              <div key={i} className="p-2 bg-gray-50 rounded">
                <p className="text-xs font-medium text-gray-700">{section.heading}</p>
                <p className="text-sm text-gray-600 mt-1">{section.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {isEditing && (
        <div className="flex justify-end gap-2 p-3 border-t bg-gray-50">
          <Button variant="ghost" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}

      <div className="border-t">
        <button
          onClick={() => setShowAriaMarkup(!showAriaMarkup)}
          className="flex items-center justify-between w-full p-3 text-sm text-gray-600 hover:bg-gray-50"
        >
          <span className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            aria-describedby Markup
          </span>
          {showAriaMarkup ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        {showAriaMarkup && (
          <div className="p-3 pt-0 space-y-3">
            <div className="flex items-start gap-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Use aria-describedby to link the image to its long description. 
                The description div can be hidden with sr-only class for screen readers.
              </span>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500">Image Tag</label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => handleCopy(generateAriaMarkup().imgTag, 'imgTag')}
                >
                  {copied === 'imgTag' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                {generateAriaMarkup().imgTag}
              </pre>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500">Description Div</label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => handleCopy(generateAriaMarkup().descriptionDiv, 'descDiv')}
                >
                  {copied === 'descDiv' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                {generateAriaMarkup().descriptionDiv}
              </pre>
            </div>
          </div>
        )}
      </div>

      {!readOnly && !isEditing && description?.status !== 'approved' && (
        <div className="flex justify-between items-center p-3 border-t bg-gray-50">
          <div className="text-xs text-gray-500">
            {description?.aiModel && `Generated by ${description.aiModel}`}
          </div>
          <div className="flex gap-2">
            {onGenerate && (
              <Button variant="outline" size="sm" onClick={onGenerate}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            )}
            {onApprove && (
              <Button variant="primary" size="sm" onClick={onApprove}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const LongDescriptionIndicator: React.FC<{
  needed: boolean;
  exists: boolean;
  status?: string;
  onClick?: () => void;
}> = ({ needed, exists, status, onClick }) => {
  if (!needed && !exists) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors',
        exists && status === 'approved' && 'bg-green-100 text-green-700',
        exists && status !== 'approved' && 'bg-blue-100 text-blue-700',
        needed && !exists && 'bg-yellow-100 text-yellow-700'
      )}
    >
      <FileText className="h-3 w-3" />
      {exists ? (status === 'approved' ? 'Long Desc ✓' : 'Long Desc') : 'Needs Long Desc'}
    </button>
  );
};
