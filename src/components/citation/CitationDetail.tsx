import { useState } from 'react';
import {
  X,
  Quote,
  Wand2,
  History,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { ParsedComponentsView } from './ParsedComponentsView';
import { useCitationComponents, useParseCitation } from '@/hooks/useCitation';
import { cn } from '@/utils/cn';
import type { Citation } from '@/types/citation.types';

interface CitationDetailProps {
  citation: Citation;
  onClose: () => void;
}

export function CitationDetail({ citation, onClose }: CitationDetailProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  const {
    data: components,
    isLoading: isLoadingHistory
  } = useCitationComponents(citation.id);

  const parseMutation = useParseCitation();

  const handleParse = () => {
    parseMutation.mutate(citation.id);
  };

  const hasParsedComponent = !!citation.primaryComponent;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Quote className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Citation Details
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-64px)] space-y-6">
          {/* Raw Citation Text */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Original Citation
            </h3>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border">
              {citation.rawText}
            </p>

            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge className="bg-blue-100 text-blue-800">
                {citation.citationType.toLowerCase().replace('_', ' ')}
              </Badge>
              {citation.detectedStyle && (
                <Badge className="bg-green-100 text-green-800">
                  {citation.detectedStyle}
                </Badge>
              )}
              <Badge className={cn(
                citation.confidence >= 80 ? 'bg-green-100 text-green-800' :
                citation.confidence >= 50 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              )}>
                {citation.confidence}% confidence
              </Badge>
            </div>

            {/* Location info */}
            <div className="text-xs text-gray-500 mt-3 flex gap-4">
              {citation.pageNumber && (
                <span>Page: {citation.pageNumber}</span>
              )}
              {citation.paragraphIndex !== null && (
                <span>Paragraph: {citation.paragraphIndex + 1}</span>
              )}
              <span>
                Position: {citation.startOffset}-{citation.endOffset}
              </span>
            </div>
          </Card>

          {/* Parsed Components Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                {hasParsedComponent ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Parsed Components
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    Not Yet Parsed
                  </>
                )}
              </h3>
              <Button
                size="sm"
                onClick={handleParse}
                disabled={parseMutation.isPending}
              >
                {parseMutation.isPending ? (
                  <>
                    <Spinner className="h-4 w-4 mr-1" />
                    Parsing...
                  </>
                ) : hasParsedComponent ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Re-parse
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-1" />
                    Parse Citation
                  </>
                )}
              </Button>
            </div>

            {/* Success message */}
            {parseMutation.isSuccess && (
              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                Citation parsed successfully!
              </div>
            )}

            {/* Error message */}
            {parseMutation.isError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                Failed to parse citation. Please try again.
              </div>
            )}

            {hasParsedComponent ? (
              <Tabs
                defaultValue="current"
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as 'current' | 'history')}
              >
                <Tabs.List>
                  <Tabs.Trigger value="current">
                    Current Parse
                  </Tabs.Trigger>
                  <Tabs.Trigger value="history" className="flex items-center gap-1">
                    <History className="h-4 w-4" />
                    History
                    {components && components.length > 1 && (
                      <Badge className="ml-1 bg-gray-100 text-gray-800 border border-gray-300">
                        {components.length}
                      </Badge>
                    )}
                  </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="current" className="mt-4">
                  {citation.primaryComponent && (
                    <ParsedComponentsView
                      component={citation.primaryComponent}
                      isPrimary={true}
                    />
                  )}
                </Tabs.Content>

                <Tabs.Content value="history" className="mt-4">
                  {isLoadingHistory ? (
                    <div className="flex justify-center py-8">
                      <Spinner className="h-6 w-6" />
                    </div>
                  ) : components && components.length > 0 ? (
                    <div className="space-y-4">
                      {components.map((comp) => (
                        <div key={comp.id}>
                          <div className="text-xs text-gray-500 mb-2">
                            {comp.parseVariant || 'Unknown style'}
                            {' - '}
                            {new Date(comp.createdAt).toLocaleDateString()}
                          </div>
                          <ParsedComponentsView
                            component={comp}
                            isPrimary={citation.primaryComponentId === comp.id}
                            showConfidence={true}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      No parse history available
                    </p>
                  )}
                </Tabs.Content>
              </Tabs>
            ) : (
              <Card className="p-8 text-center">
                <Wand2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  Click "Parse Citation" to extract structured components
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  This will identify authors, year, title, and other metadata
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
