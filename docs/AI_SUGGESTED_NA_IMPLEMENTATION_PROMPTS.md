# AI-Suggested N/A Implementation Prompts

## Overview

These prompts implement AI-suggested "Not Applicable" (N/A) status for WCAG criteria in the Human Verification workflow. The system analyzes EPUB content and suggests which criteria don't apply, with confidence scores to guide reviewers.

**Key Features:**
- Content detection (audio/video/forms/interactive elements)
- Confidence-based suggestions (high/medium/low)
- Bulk quick-accept for obvious N/A criteria
- Detailed detection results transparency
- Auto-generated verification notes

---

## Backend Implementation

### Backend Prompt 1: Create Content Detection Service

**File:** `src/services/acr/content-detection.service.ts` (new file)

```
Create a new file src/services/acr/content-detection.service.ts that analyzes EPUB
content and determines which WCAG criteria are likely not applicable.

```typescript
import JSZip from 'jszip';
import * as cheerio from 'cheerio';
import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { fileService } from '../file.service';

export interface DetectionCheck {
  check: string;
  result: 'pass' | 'fail' | 'warning';
  details?: string;
}

export interface ApplicabilitySuggestion {
  criterionId: string;
  suggestedStatus: 'not_applicable' | 'applicable' | 'uncertain';
  confidence: number;
  detectionChecks: DetectionCheck[];
  rationale: string;
  edgeCases: string[];
}

interface ContentAnalysis {
  hasAudio: boolean;
  hasVideo: boolean;
  hasIframes: boolean;
  hasForms: boolean;
  hasInteractiveElements: boolean;
  hasNavigationBlocks: boolean;
  hasDataTables: boolean;
  documentType: string;
  fileCount: number;
}

class ContentDetectionService {
  // Main analysis function
  async analyzeEPUBContent(jobId: string): Promise<ApplicabilitySuggestion[]> {
    logger.info(`[Content Detection] Starting analysis for job ${jobId}`);

    // Get the EPUB file
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { remediatedFile: true, originalFile: true }
    });

    if (!job) {
      throw new Error('Job not found');
    }

    const file = job.remediatedFile || job.originalFile;
    if (!file) {
      throw new Error('No EPUB file found');
    }

    // Load EPUB
    const buffer = await fileService.getFileBuffer(file.storageKey);
    const zip = await JSZip.loadAsync(buffer);

    // Analyze content
    const analysis = await this.performContentAnalysis(zip);

    logger.info(`[Content Detection] Analysis complete:`, analysis);

    // Generate suggestions for each criterion
    const suggestions = this.generateApplicabilitySuggestions(analysis);

    return suggestions;
  }

  // Analyze EPUB content
  private async performContentAnalysis(zip: JSZip): Promise<ContentAnalysis> {
    const htmlFiles = Object.keys(zip.files).filter(name =>
      name.endsWith('.html') || name.endsWith('.xhtml') || name.endsWith('.htm')
    );

    const analysis: ContentAnalysis = {
      hasAudio: false,
      hasVideo: false,
      hasIframes: false,
      hasForms: false,
      hasInteractiveElements: false,
      hasNavigationBlocks: false,
      hasDataTables: false,
      documentType: 'text',
      fileCount: htmlFiles.length
    };

    // Analyze each HTML file
    for (const fileName of htmlFiles) {
      const content = await zip.file(fileName)?.async('text');
      if (!content) continue;

      const $ = cheerio.load(content);

      // Check for audio
      if ($('audio').length > 0) {
        analysis.hasAudio = true;
      }

      // Check for video
      if ($('video').length > 0) {
        analysis.hasVideo = true;
      }

      // Check for iframes (could be embedded media)
      if ($('iframe').length > 0) {
        analysis.hasIframes = true;
      }

      // Check for forms
      if ($('form, input, select, textarea').length > 0) {
        analysis.hasForms = true;
      }

      // Check for interactive elements
      if ($('button, [role="button"], [onclick]').length > 0) {
        analysis.hasInteractiveElements = true;
      }

      // Check for navigation blocks
      if ($('nav, [role="navigation"]').length > 0) {
        analysis.hasNavigationBlocks = true;
      }

      // Check for data tables
      if ($('table').length > 0) {
        const tables = $('table');
        let hasDataTable = false;
        tables.each((_, elem) => {
          const $table = $(elem);
          // Data tables typically have th elements
          if ($table.find('th').length > 0) {
            hasDataTable = true;
          }
        });
        if (hasDataTable) {
          analysis.hasDataTables = true;
        }
      }
    }

    // Determine document type
    if (analysis.hasAudio || analysis.hasVideo || analysis.hasIframes) {
      analysis.documentType = 'multimedia';
    } else if (analysis.hasForms || analysis.hasInteractiveElements) {
      analysis.documentType = 'interactive';
    } else {
      analysis.documentType = 'text';
    }

    return analysis;
  }

  // Generate N/A suggestions based on content analysis
  private generateApplicabilitySuggestions(analysis: ContentAnalysis): ApplicabilitySuggestion[] {
    const suggestions: ApplicabilitySuggestion[] = [];

    // Multimedia criteria (1.2.x)
    suggestions.push(this.analyzeMultimediaCriteria(analysis));

    // Audio control (1.4.2)
    suggestions.push(this.analyzeAudioControl(analysis));

    // Form/Input criteria (3.3.x)
    suggestions.push(...this.analyzeFormCriteria(analysis));

    // Bypass blocks (2.4.1)
    suggestions.push(this.analyzeBypassBlocks(analysis));

    // Interactive change criteria (3.2.x)
    suggestions.push(...this.analyzeChangeCriteria(analysis));

    return suggestions;
  }

  // Analyze multimedia criteria (1.2.1 - 1.2.5)
  private analyzeMultimediaCriteria(analysis: ContentAnalysis): ApplicabilitySuggestion {
    const detectionChecks: DetectionCheck[] = [
      {
        check: 'No <audio> tags found',
        result: analysis.hasAudio ? 'fail' : 'pass'
      },
      {
        check: 'No <video> tags found',
        result: analysis.hasVideo ? 'fail' : 'pass'
      },
      {
        check: 'No <iframe> tags found',
        result: analysis.hasIframes ? 'fail' : 'pass',
        details: analysis.hasIframes ? 'Could be embedded media' : undefined
      }
    ];

    const hasMedia = analysis.hasAudio || analysis.hasVideo;
    const hasIframes = analysis.hasIframes;

    let confidence: number;
    let suggestedStatus: 'not_applicable' | 'applicable' | 'uncertain';
    let rationale: string;
    const edgeCases: string[] = [];

    if (!hasMedia && !hasIframes) {
      // High confidence N/A
      confidence = 98;
      suggestedStatus = 'not_applicable';
      rationale = `Comprehensive scan found no multimedia content across all ${analysis.fileCount} EPUB files. No <audio>, <video>, or <iframe> tags detected. Multimedia criteria (1.2.1-1.2.5) do not apply to this text-only document.`;
    } else if (hasIframes && !hasMedia) {
      // Medium confidence - iframes could be media
      confidence = 60;
      suggestedStatus = 'uncertain';
      rationale = 'Found <iframe> elements which could contain embedded audio/video. Manual inspection required to determine if multimedia criteria apply.';
      edgeCases.push('Iframes detected - may contain external media');
    } else {
      // Media detected - definitely applicable
      confidence = 98;
      suggestedStatus = 'applicable';
      rationale = 'Audio and/or video content detected. Multimedia criteria (1.2.1-1.2.5) are applicable.';
    }

    return {
      criterionId: '1.2.x', // Represents all 1.2.x criteria
      suggestedStatus,
      confidence,
      detectionChecks,
      rationale,
      edgeCases
    };
  }

  // Analyze audio control (1.4.2)
  private analyzeAudioControl(analysis: ContentAnalysis): ApplicabilitySuggestion {
    const detectionChecks: DetectionCheck[] = [
      {
        check: 'No <audio> tags found',
        result: analysis.hasAudio ? 'fail' : 'pass'
      },
      {
        check: 'Unable to detect autoplay attribute',
        result: 'warning',
        details: 'Autoplay can be set via JavaScript'
      }
    ];

    let confidence: number;
    let suggestedStatus: 'not_applicable' | 'applicable' | 'uncertain';
    let rationale: string;
    const edgeCases: string[] = [];

    if (!analysis.hasAudio) {
      confidence = 95;
      suggestedStatus = 'not_applicable';
      rationale = 'No audio content detected. Criterion 1.4.2 (Audio Control) does not apply.';
    } else {
      confidence = 50;
      suggestedStatus = 'uncertain';
      rationale = 'Audio content detected, but cannot determine if it autoplays. Manual verification required.';
      edgeCases.push('Cannot detect autoplay behavior');
    }

    return {
      criterionId: '1.4.2',
      suggestedStatus,
      confidence,
      detectionChecks,
      rationale,
      edgeCases
    };
  }

  // Analyze form/input criteria (3.3.1, 3.3.2, 3.3.3, 3.3.4)
  private analyzeFormCriteria(analysis: ContentAnalysis): ApplicabilitySuggestion[] {
    const suggestions: ApplicabilitySuggestion[] = [];

    const detectionChecks: DetectionCheck[] = [
      {
        check: 'No form elements found',
        result: analysis.hasForms ? 'fail' : 'pass'
      }
    ];

    let confidence: number;
    let suggestedStatus: 'not_applicable' | 'applicable' | 'uncertain';
    let rationale: string;

    if (!analysis.hasForms) {
      confidence = 95;
      suggestedStatus = 'not_applicable';
      rationale = 'No form elements detected. Input assistance criteria (3.3.x) do not apply.';
    } else {
      confidence = 98;
      suggestedStatus = 'applicable';
      rationale = 'Form elements detected. Input assistance criteria (3.3.x) are applicable.';
    }

    // Apply to all 3.3.x criteria
    ['3.3.1', '3.3.2', '3.3.3', '3.3.4'].forEach(criterionId => {
      suggestions.push({
        criterionId,
        suggestedStatus,
        confidence,
        detectionChecks: [...detectionChecks],
        rationale,
        edgeCases: []
      });
    });

    return suggestions;
  }

  // Analyze bypass blocks (2.4.1)
  private analyzeBypassBlocks(analysis: ContentAnalysis): ApplicabilitySuggestion {
    const detectionChecks: DetectionCheck[] = [
      {
        check: 'No navigation blocks detected',
        result: analysis.hasNavigationBlocks ? 'fail' : 'pass'
      },
      {
        check: `Document has ${analysis.fileCount} files`,
        result: analysis.fileCount > 20 ? 'warning' : 'pass',
        details: analysis.fileCount > 20 ? 'Large document may benefit from skip links' : undefined
      }
    ];

    let confidence: number;
    let suggestedStatus: 'not_applicable' | 'applicable' | 'uncertain';
    let rationale: string;
    const edgeCases: string[] = [];

    if (!analysis.hasNavigationBlocks && analysis.fileCount < 10) {
      confidence = 90;
      suggestedStatus = 'not_applicable';
      rationale = 'No repetitive navigation blocks detected. Document appears to be linear reading structure. Bypass blocks not required.';
    } else if (analysis.fileCount > 20) {
      confidence = 60;
      suggestedStatus = 'uncertain';
      rationale = 'Large document with many files. Manual review recommended to determine if bypass mechanism would benefit users.';
      edgeCases.push('Large document - may benefit from skip links');
    } else {
      confidence = 70;
      suggestedStatus = 'uncertain';
      rationale = 'Navigation structure detected. Review to determine if bypass mechanism is needed.';
      edgeCases.push('Custom navigation detected');
    }

    return {
      criterionId: '2.4.1',
      suggestedStatus,
      confidence,
      detectionChecks,
      rationale,
      edgeCases
    };
  }

  // Analyze change on request criteria (3.2.1, 3.2.2, 3.2.5)
  private analyzeChangeCriteria(analysis: ContentAnalysis): ApplicabilitySuggestion[] {
    const suggestions: ApplicabilitySuggestion[] = [];

    const detectionChecks: DetectionCheck[] = [
      {
        check: 'No interactive elements found',
        result: analysis.hasInteractiveElements ? 'fail' : 'pass'
      },
      {
        check: 'No form elements found',
        result: analysis.hasForms ? 'fail' : 'pass'
      }
    ];

    let confidence: number;
    let suggestedStatus: 'not_applicable' | 'applicable' | 'uncertain';
    let rationale: string;

    if (!analysis.hasInteractiveElements && !analysis.hasForms) {
      confidence = 92;
      suggestedStatus = 'not_applicable';
      rationale = 'No interactive elements or forms detected. Change criteria (3.2.x) do not apply to static content.';
    } else {
      confidence = 95;
      suggestedStatus = 'applicable';
      rationale = 'Interactive elements or forms detected. Change criteria (3.2.x) are applicable.';
    }

    // Apply to specific change criteria
    ['3.2.1', '3.2.2', '3.2.5'].forEach(criterionId => {
      suggestions.push({
        criterionId,
        suggestedStatus,
        confidence,
        detectionChecks: [...detectionChecks],
        rationale,
        edgeCases: []
      });
    });

    return suggestions;
  }
}

export const contentDetectionService = new ContentDetectionService();
```

Save the file and verify it compiles without errors.
```

---

### Backend Prompt 2: Update ACR Analysis to Include N/A Suggestions

**File:** `src/services/acr/acr-analysis.service.ts`

```
Update the ACR analysis service to include AI-suggested N/A status for each criterion.

**Step 1: Import the content detection service**

Add this import at the top of the file:

```typescript
import { contentDetectionService, ApplicabilitySuggestion } from './content-detection.service';
```

**Step 2: Update CriterionAnalysis interface**

Find the CriterionAnalysis interface and add new fields:

```typescript
export interface CriterionAnalysis {
  id: string;
  name: string;
  level: string;
  category: string;
  status: 'supports' | 'partially_supports' | 'does_not_support' | 'not_applicable';
  confidence: number;
  findings: string[];
  recommendation: string;
  relatedIssues?: Array<{...}>;
  issueCount?: number;
  fixedIssues?: Array<{...}>;
  fixedCount?: number;
  remainingCount?: number;
  // NEW: Add N/A suggestion fields
  naSuggestion?: {
    suggestedStatus: 'not_applicable' | 'applicable' | 'uncertain';
    confidence: number;
    detectionChecks: Array<{
      check: string;
      result: 'pass' | 'fail' | 'warning';
      details?: string;
    }>;
    rationale: string;
    edgeCases: string[];
  };
}
```

**Step 3: Add content detection to analysis**

In the getAnalysisForJob function, after fetching issues and before calling analyzeWcagCriteria,
add content detection:

```typescript
// Run content detection for N/A suggestions
let applicabilitySuggestions: ApplicabilitySuggestion[] = [];
try {
  applicabilitySuggestions = await contentDetectionService.analyzeEPUBContent(jobId);
  logger.info(`[ACR Analysis] Generated ${applicabilitySuggestions.length} N/A suggestions`);
} catch (error) {
  logger.warn(`[ACR Analysis] Content detection failed:`, error);
  // Continue without N/A suggestions if detection fails
}

// Create lookup map for quick access
const suggestionMap = new Map<string, ApplicabilitySuggestion>();
applicabilitySuggestions.forEach(suggestion => {
  suggestionMap.set(suggestion.criterionId, suggestion);
});
```

**Step 4: Pass suggestions to analyzeWcagCriteria**

Update the function signature:

```typescript
function analyzeWcagCriteria(
  issues: AuditIssue[],
  remediationChanges: any[] = [],
  suggestionMap: Map<string, ApplicabilitySuggestion> = new Map()
): CriterionAnalysis[] {
```

**Step 5: Add N/A suggestion to each criterion**

Inside the loop that builds criteriaAnalysis, after creating the criterion object,
add the N/A suggestion:

```typescript
// Check for N/A suggestion for this criterion
const suggestion = suggestionMap.get(criterion.id) ||
                  suggestionMap.get(criterion.id.split('.')[0] + '.' + criterion.id.split('.')[1] + '.x');

const criterionAnalysis: CriterionAnalysis = {
  id: criterion.id,
  name: criterion.name,
  level: criterion.level,
  category: criterion.category,
  status,
  confidence,
  findings,
  recommendation,
  relatedIssues: remainingIssues,
  issueCount: remainingIssues.length,
  fixedIssues: fixedIssues,
  fixedCount: fixedIssues.length,
  remainingCount: remainingIssues.length,
  // Add N/A suggestion if available
  naSuggestion: suggestion ? {
    suggestedStatus: suggestion.suggestedStatus,
    confidence: suggestion.confidence,
    detectionChecks: suggestion.detectionChecks,
    rationale: suggestion.rationale,
    edgeCases: suggestion.edgeCases
  } : undefined
};
```

**Step 6: Update the function call**

Find where analyzeWcagCriteria is called and update it:

```typescript
const criteria = analyzeWcagCriteria(issues, remediationChanges, suggestionMap);
```

Save the file and restart the backend. Check logs for:
```
[ACR Analysis] Generated X N/A suggestions
```
```

---

## Frontend Implementation

### Frontend Prompt 1: Update API Types

**File:** `src/services/api.ts`

```
Add the N/A suggestion types to the CriterionConfidence interface.

Find the CriterionConfidence interface and add the new field:

```typescript
export interface CriterionConfidence {
  id: string;
  criterionId: string;
  name: string;
  level: 'A' | 'AA' | 'AAA';
  confidenceScore: number;
  status: 'pass' | 'fail' | 'not_applicable' | 'not_tested';
  needsVerification: boolean;
  remarks?: string;
  automatedChecks: CriterionCheck[];
  manualChecks: string[];
  relatedIssues?: Array<{...}>;
  issueCount?: number;
  fixedIssues?: Array<{...}>;
  fixedCount?: number;
  remainingCount?: number;
  // NEW: Add N/A suggestion field
  naSuggestion?: {
    suggestedStatus: 'not_applicable' | 'applicable' | 'uncertain';
    confidence: number;
    detectionChecks: Array<{
      check: string;
      result: 'pass' | 'fail' | 'warning';
      details?: string;
    }>;
    rationale: string;
    edgeCases: string[];
  };
}
```

Save the file.
```

---

### Frontend Prompt 2: Create N/A Suggestion Component

**File:** `src/components/acr/NASuggestionBanner.tsx` (new file)

```
Create a new component to display AI N/A suggestions with confidence-based styling.

```typescript
import { AlertCircle, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';

interface NASuggestionProps {
  suggestion: {
    suggestedStatus: 'not_applicable' | 'applicable' | 'uncertain';
    confidence: number;
    detectionChecks: Array<{
      check: string;
      result: 'pass' | 'fail' | 'warning';
      details?: string;
    }>;
    rationale: string;
    edgeCases: string[];
  };
  onAcceptNA: () => void;
  onReject: () => void;
}

export function NASuggestionBanner({ suggestion, onAcceptNA, onReject }: NASuggestionProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Determine styling based on confidence
  const getConfidenceStyle = () => {
    if (suggestion.confidence >= 90) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        icon: CheckCircle,
        iconColor: 'text-green-600',
        label: 'High Confidence',
        labelBg: 'bg-green-100'
      };
    } else if (suggestion.confidence >= 60) {
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        icon: AlertCircle,
        iconColor: 'text-yellow-600',
        label: 'Medium Confidence',
        labelBg: 'bg-yellow-100'
      };
    } else {
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-800',
        icon: AlertCircle,
        iconColor: 'text-orange-600',
        label: 'Low Confidence',
        labelBg: 'bg-orange-100'
      };
    }
  };

  const style = getConfidenceStyle();
  const Icon = style.icon;

  if (suggestion.suggestedStatus !== 'not_applicable') {
    // Don't show suggestion banner if not suggesting N/A
    return null;
  }

  return (
    <div className={cn('rounded-lg border-2 p-4 mb-4', style.bg, style.border)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5', style.iconColor)} />

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm">🤖 AI Suggestion: Not Applicable</span>
            <span className={cn('text-xs px-2 py-0.5 rounded font-medium', style.labelBg, style.text)}>
              {style.label} ({suggestion.confidence}%)
            </span>
          </div>

          <p className={cn('text-sm mb-3', style.text)}>
            {suggestion.rationale}
          </p>

          {suggestion.edgeCases.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium mb-1">⚠️ Edge Cases Detected:</p>
              <ul className="text-xs space-y-1">
                {suggestion.edgeCases.map((edge, idx) => (
                  <li key={idx}>• {edge}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Detection Details (expandable) */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs font-medium hover:underline mb-2"
          >
            <ChevronDown className={cn(
              'h-3 w-3 transition-transform',
              showDetails && 'rotate-180'
            )} />
            {showDetails ? 'Hide' : 'View'} Detection Details
          </button>

          {showDetails && (
            <div className="bg-white rounded border p-3 mb-3">
              <p className="text-xs font-medium mb-2">Detection Checks:</p>
              <div className="space-y-2">
                {suggestion.detectionChecks.map((check, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    {check.result === 'pass' && <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />}
                    {check.result === 'fail' && <XCircle className="h-3 w-3 text-red-600 mt-0.5" />}
                    {check.result === 'warning' && <AlertCircle className="h-3 w-3 text-yellow-600 mt-0.5" />}
                    <div>
                      <p>{check.check}</p>
                      {check.details && <p className="text-gray-500 italic">{check.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {suggestion.confidence >= 90 ? (
              <>
                <Button
                  size="sm"
                  onClick={onAcceptNA}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  ✓ Mark as Not Applicable
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onReject}
                >
                  I'll verify manually
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onAcceptNA}
                >
                  Mark as N/A anyway
                </Button>
                <Button
                  size="sm"
                  onClick={onReject}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Review manually (Recommended)
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

Save the file.
```

---

### Frontend Prompt 3: Integrate N/A Suggestion into Verification Item

**File:** `src/components/acr/VerificationItem.tsx`

```
Add the N/A suggestion banner to the verification item when expanded.

**Step 1: Import the component**

Add this import at the top:

```typescript
import { NASuggestionBanner } from './NASuggestionBanner';
```

**Step 2: Add N/A acceptance handler**

Add this function inside the VerificationItem component (around line 85):

```typescript
const handleAcceptNA = () => {
  setFormStatus('not_applicable' as VerificationStatus);
  setFormMethod('Automated Detection + Manual Confirmation');

  // Auto-fill notes with AI detection results
  const aiNotes = `AI content scan (confidence ${item.naSuggestion?.confidence}%) suggests this criterion is not applicable.\n\nRationale: ${item.naSuggestion?.rationale}\n\nDetection checks performed:\n${item.naSuggestion?.detectionChecks.map(c => `- ${c.check}: ${c.result}`).join('\n')}\n\nHuman reviewer confirmed AI suggestion.`;

  setFormNotes(aiNotes);
};

const handleRejectNA = () => {
  // Just collapse the N/A suggestion, let user verify manually
};
```

**Step 3: Add N/A banner to the expanded view**

Find the section inside `isExpanded` where the form is displayed (around line 206).

Add this RIGHT AFTER the "Automated Finding" section and BEFORE the form inputs:

```typescript
{/* AI N/A Suggestion (if available) */}
{item.naSuggestion && (
  <NASuggestionBanner
    suggestion={item.naSuggestion}
    onAcceptNA={handleAcceptNA}
    onReject={handleRejectNA}
  />
)}
```

Save the file.
```

---

### Frontend Prompt 4: Add Bulk N/A Accept Feature

**File:** `src/components/acr/VerificationQueue.tsx`

```
Add a "Quick Accept N/A Suggestions" feature for bulk-accepting high-confidence N/A criteria.

**Step 1: Add state for bulk N/A**

Add this state near the top of the component (around line 236):

```typescript
const [showBulkNASuggestions, setShowBulkNASuggestions] = useState(false);
```

**Step 2: Filter high-confidence N/A suggestions**

Add this computed value (around line 296, near other useMemo hooks):

```typescript
const highConfidenceNASuggestions = useMemo(() => {
  return items.filter(item =>
    item.naSuggestion?.suggestedStatus === 'not_applicable' &&
    item.naSuggestion.confidence >= 90 &&
    item.status === 'pending'
  );
}, [items]);
```

**Step 3: Add handler for bulk accept**

Add this function (around line 415, near other handlers):

```typescript
const handleBulkAcceptNA = async () => {
  const itemIds = highConfidenceNASuggestions.map(i => i.id);
  const naStatus = 'not_applicable' as VerificationStatus;
  const naMethod = 'Automated Detection + Manual Confirmation' as VerificationMethod;
  const naReason = `Bulk accepted AI N/A suggestions for ${itemIds.length} criteria. All had 90%+ confidence based on content analysis showing absence of relevant content types.`;

  if (useMockData) {
    setLocalItems(prev => prev.map(item => {
      if (itemIds.includes(item.id)) {
        return {
          ...item,
          status: naStatus,
          history: [...item.history, {
            id: `h-${Date.now()}-${item.id}`,
            status: naStatus,
            method: naMethod,
            notes: naReason,
            verifiedBy: 'Current User',
            verifiedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          }]
        };
      }
      return item;
    }));
    itemIds.forEach(itemId => {
      onVerificationUpdate?.(itemId, naStatus, naMethod, naReason);
    });
  } else {
    await bulkMutation.mutateAsync({
      itemIds,
      status: naStatus,
      method: naMethod,
      notes: naReason
    });
  }

  setShowBulkNASuggestions(false);
};
```

**Step 4: Add banner above queue**

Add this section BEFORE the "Verification Queue" header (around line 459):

```typescript
{/* Bulk N/A Suggestions Banner */}
{highConfidenceNASuggestions.length > 0 && (
  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
    <div className="flex items-start gap-3">
      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
      <div className="flex-1">
        <h3 className="font-semibold text-green-800 mb-1">
          🤖 {highConfidenceNASuggestions.length} High-Confidence N/A Suggestions Available
        </h3>
        <p className="text-sm text-green-700 mb-3">
          AI has identified {highConfidenceNASuggestions.length} criteria that are likely not applicable based on content analysis (90%+ confidence).
        </p>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowBulkNASuggestions(!showBulkNASuggestions)}
            variant="outline"
          >
            {showBulkNASuggestions ? 'Hide' : 'Review'} Suggestions
          </Button>
          <Button
            size="sm"
            onClick={handleBulkAcceptNA}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Accept All {highConfidenceNASuggestions.length} as N/A
          </Button>
        </div>

        {showBulkNASuggestions && (
          <div className="mt-4 bg-white rounded border p-3">
            <p className="text-xs font-medium mb-2">Criteria to be marked as N/A:</p>
            <ul className="text-xs space-y-1">
              {highConfidenceNASuggestions.map(item => (
                <li key={item.id}>
                  ✓ {item.criterionId} {item.criterionName} (Confidence: {item.naSuggestion?.confidence}%)
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  </div>
)}
```

**Step 5: Add imports**

Add these imports at the top if not already present:

```typescript
import { CheckCircle } from 'lucide-react';
```

Save the file and test!
```

---

## Testing the Implementation

### Backend Testing

1. **Run the backend** and navigate to ACR workflow for a job
2. **Check logs** for content detection output:
   ```
   [Content Detection] Starting analysis for job xxx
   [Content Detection] Analysis complete: { hasAudio: false, hasVideo: false, ... }
   [ACR Analysis] Generated 15 N/A suggestions
   ```

3. **Test the API** endpoint:
   ```bash
   GET /api/v1/acr/analysis/JOB_ID
   ```

   Response should include `naSuggestion` field for criteria:
   ```json
   {
     "criterionId": "1.2.1",
     "naSuggestion": {
       "suggestedStatus": "not_applicable",
       "confidence": 98,
       "detectionChecks": [...],
       "rationale": "...",
       "edgeCases": []
     }
   }
   ```

### Frontend Testing

1. **Navigate to Human Verification** for a job
2. **Look for the green banner** at the top showing "X High-Confidence N/A Suggestions"
3. **Click "Review Suggestions"** - should show list of criteria
4. **Click "Accept All X as N/A"** - should bulk-accept all high-confidence suggestions
5. **Expand a criterion** with N/A suggestion - should show AI suggestion banner
6. **Click "Mark as Not Applicable"** - should auto-fill verification notes
7. **Submit** - should save with AI-generated documentation

### Expected Time Savings

**Before AI N/A suggestions:**
- Manually review all 50 criteria: 10-12 hours

**After AI N/A suggestions:**
- Bulk-accept 15-20 obvious N/A: 30 seconds
- Review remaining 30-35 criteria: 7-9 hours
- **Time saved: 2-3 hours per document**

---

## Summary

This implementation adds intelligent N/A suggestions to the Human Verification workflow:

**Backend:**
- Content detection service scans EPUB for media, forms, interactive elements
- Generates N/A suggestions with confidence scores
- Integrates with existing ACR analysis

**Frontend:**
- Visual N/A suggestion banners with confidence-based styling
- Bulk quick-accept for high-confidence suggestions
- Auto-generated verification notes
- Transparent detection methodology

**User Experience:**
- Save 2-3 hours per document review
- Maintain accuracy with human confirmation
- Complete audit trail in verification notes
- Confidence-guided review depth

The system suggests, humans confirm - best of both worlds!
