# LLM-Enhanced N/A Detection: Implementation Prompts

**Date:** January 17, 2026
**Purpose:** Replit/Claude Code prompts for adding Claude API analysis to existing rule-based N/A detection system
**Approach:** Hybrid system using rules for obvious cases, LLM for complex analysis
**Target Cost:** $0.25 per document analysis

---

## Prerequisites

### 1. Get Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create new key (name it "NINJA-ACR-Analysis")
5. Copy the key (starts with `sk-ant-...`)

### 2. Add to Environment Variables

**In Replit Backend:**
1. Open Secrets panel (lock icon in left sidebar)
2. Add new secret:
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-...` (your API key)

**Or in local .env:**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

---

## Backend Implementation

### Backend Prompt 1: Install Anthropic SDK

**In Replit Backend shell or locally:**

```bash
npm install @anthropic-ai/sdk
```

Verify it appears in `package.json`:
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0"
  }
}
```

---

### Backend Prompt 2: Create LLM Analysis Service

**Create new file:** `src/services/acr/llm-analysis.service.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../lib/logger';

// Types matching existing system
interface DetectionCheck {
  check: string;
  result: 'pass' | 'fail' | 'warning';
  details?: string;
}

interface RuleBasedResult {
  suggestedStatus: 'not_applicable' | 'applicable' | 'uncertain';
  confidence: number;
  detectionChecks: DetectionCheck[];
  rationale: string;
  edgeCases: string[];
}

export interface LLMAnalysisResult {
  applicable: boolean;
  confidence: number;
  rationale: string;
  edgeCases: string[];
  recommendation: string;
}

class LLMAnalysisService {
  private client: Anthropic;
  private enabled: boolean;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      logger.warn('[LLM Analysis] ANTHROPIC_API_KEY not found - LLM features disabled');
      this.enabled = false;
      this.client = {} as Anthropic; // Placeholder
    } else {
      this.client = new Anthropic({ apiKey });
      this.enabled = true;
      logger.info('[LLM Analysis] Claude API initialized successfully');
    }
  }

  /**
   * Check if LLM analysis is available
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Analyze a specific criterion with LLM
   */
  async analyzeCriterion(
    criterionId: string,
    criterionName: string,
    epubContentSample: string,
    ruleBasedResult: RuleBasedResult
  ): Promise<LLMAnalysisResult> {
    if (!this.enabled) {
      throw new Error('LLM analysis not available - API key missing');
    }

    const prompt = this.buildAnalysisPrompt(
      criterionId,
      criterionName,
      epubContentSample,
      ruleBasedResult
    );

    try {
      logger.info(`[LLM Analysis] Analyzing ${criterionId} with Claude...`);

      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        temperature: 0.3, // Lower temperature for more consistent results
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // Extract text from response
      const responseText = message.content[0].type === 'text'
        ? message.content[0].text
        : '';

      // Parse JSON response
      const result = this.parseResponse(responseText);

      logger.info(`[LLM Analysis] ${criterionId} analyzed - Applicable: ${result.applicable}, Confidence: ${result.confidence}%`);

      return result;
    } catch (error) {
      logger.error(`[LLM Analysis] Failed to analyze ${criterionId}:`, error);
      throw error;
    }
  }

  /**
   * Generate enhanced explanation for any result
   */
  async enhanceExplanation(
    criterionId: string,
    criterionName: string,
    epubContentSample: string,
    ruleBasedResult: RuleBasedResult
  ): Promise<string> {
    if (!this.enabled) {
      // Fall back to rule-based rationale
      return ruleBasedResult.rationale;
    }

    const prompt = `You are an accessibility expert. Provide a clear, context-aware explanation for why WCAG criterion ${criterionId} (${criterionName}) does or does not apply to this EPUB.

**Rule-Based Detection:**
${JSON.stringify(ruleBasedResult, null, 2)}

**EPUB Content Sample:**
${epubContentSample.slice(0, 1500)}

**Task:** Write a 2-3 sentence explanation that:
1. States whether the criterion applies
2. Explains the reasoning based on content analysis
3. Uses domain-appropriate language for accessibility reviewers

Respond with ONLY the explanation text, no JSON or additional commentary.`;

    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        temperature: 0.5,
        messages: [{ role: 'user', content: prompt }]
      });

      const explanation = message.content[0].type === 'text'
        ? message.content[0].text.trim()
        : ruleBasedResult.rationale;

      return explanation;
    } catch (error) {
      logger.error('[LLM Analysis] Failed to enhance explanation:', error);
      return ruleBasedResult.rationale; // Fall back to rule-based
    }
  }

  /**
   * Build the analysis prompt
   */
  private buildAnalysisPrompt(
    criterionId: string,
    criterionName: string,
    epubContentSample: string,
    ruleBasedResult: RuleBasedResult
  ): string {
    return `You are an expert in web accessibility and WCAG 2.1 compliance, specializing in EPUB document analysis.

**Your Task:** Determine if WCAG criterion ${criterionId} (${criterionName}) is applicable to this EPUB document.

**Rule-Based Detection Results:**
${JSON.stringify(ruleBasedResult, null, 2)}

**EPUB Content Sample (first 2000 characters):**
${epubContentSample.slice(0, 2000)}

**Instructions:**
1. Consider the rule-based detection as a starting point, but apply your domain expertise
2. Look for context clues that automated rules might miss
3. Consider JavaScript-based dynamic content
4. Evaluate semantic meaning, not just tag presence
5. Think about EPUB reading system behavior
6. Provide specific recommendations for human reviewers

**Important WCAG Context:**
- ${this.getCriterionGuidance(criterionId)}

**Respond in valid JSON format:**
{
  "applicable": true/false,
  "confidence": 0-100,
  "rationale": "Detailed explanation of your reasoning",
  "edgeCases": ["Any edge cases or uncertainties detected"],
  "recommendation": "Specific guidance for human reviewer on what to verify"
}

**Response must be valid JSON only, no additional text.**`;
  }

  /**
   * Get WCAG-specific guidance for criteria
   */
  private getCriterionGuidance(criterionId: string): string {
    const guidance: Record<string, string> = {
      '1.2.1': 'Audio-only and Video-only: Only applies if prerecorded audio-only or video-only content exists',
      '1.2.2': 'Captions: Only applies if synchronized media (video with audio) exists',
      '1.2.3': 'Audio Description or Media Alternative: Only applies if video content exists',
      '1.4.2': 'Audio Control: Only applies if audio plays automatically for 3+ seconds',
      '2.4.1': 'Bypass Blocks: Only applies if repetitive navigation blocks exist across multiple pages',
      '3.3.1': 'Error Identification: Only applies if user input is validated and errors can occur',
      '3.3.2': 'Labels or Instructions: Only applies if user input is required',
      '3.3.3': 'Error Suggestion: Only applies if input errors are automatically detected',
      '3.3.4': 'Error Prevention: Only applies if submissions have legal/financial consequences',
      '3.2.1': 'On Focus: Only applies if receiving focus triggers context changes',
      '3.2.2': 'On Input: Only applies if changing settings triggers context changes'
    };

    return guidance[criterionId] || 'General WCAG principle - consider if content type makes this criterion relevant';
  }

  /**
   * Parse LLM response
   */
  private parseResponse(responseText: string): LLMAnalysisResult {
    try {
      // Try to extract JSON from response (in case LLM adds commentary)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : responseText;

      const parsed = JSON.parse(jsonText);

      return {
        applicable: parsed.applicable === true,
        confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
        rationale: parsed.rationale || 'Analysis completed',
        edgeCases: Array.isArray(parsed.edgeCases) ? parsed.edgeCases : [],
        recommendation: parsed.recommendation || 'Manual verification recommended'
      };
    } catch (error) {
      logger.error('[LLM Analysis] Failed to parse response:', error);
      logger.error('[LLM Analysis] Response was:', responseText);

      // Return uncertain result if parsing fails
      return {
        applicable: true, // Conservative - assume applicable if unsure
        confidence: 40,
        rationale: 'LLM analysis failed to parse - manual review required',
        edgeCases: ['LLM response parsing error'],
        recommendation: 'Manually verify this criterion due to analysis error'
      };
    }
  }
}

export const llmAnalysisService = new LLMAnalysisService();
```

**What this does:**
- Initializes Claude API client with your API key
- Provides `analyzeCriterion()` method for complex cases
- Provides `enhanceExplanation()` method for all cases
- Includes fallback logic if API fails
- Adds criterion-specific WCAG guidance to prompts
- Handles JSON parsing errors gracefully

---

### Backend Prompt 3: Update Content Detection Service

**Update file:** `src/services/acr/content-detection.service.ts`

**Step 1:** Add import at top of file:

```typescript
import { llmAnalysisService } from './llm-analysis.service';
```

**Step 2:** Add new method to `ContentDetectionService` class (after existing methods):

```typescript
/**
 * Hybrid analysis: Use rules first, then LLM if uncertain
 */
async analyzeWithHybridApproach(
  jobId: string,
  epubContentSample: string
): Promise<ApplicabilitySuggestion[]> {
  logger.info(`[Content Detection] Starting hybrid analysis for job ${jobId}`);

  // Get rule-based suggestions
  const ruleSuggestions = await this.analyzeEPUBContent(jobId);

  // Check if LLM is available
  if (!llmAnalysisService.isEnabled()) {
    logger.info('[Content Detection] LLM not available, using rule-based only');
    return ruleSuggestions;
  }

  // Process each suggestion
  const enhancedSuggestions: ApplicabilitySuggestion[] = [];

  for (const suggestion of ruleSuggestions) {
    // TIER 1: High confidence rules - just enhance explanation
    if (suggestion.confidence >= 95) {
      logger.info(`[Content Detection] ${suggestion.criterionId}: High confidence (${suggestion.confidence}%), enhancing explanation only`);

      try {
        const enhancedRationale = await llmAnalysisService.enhanceExplanation(
          suggestion.criterionId,
          suggestion.criterionId, // Use ID as name for now
          epubContentSample,
          suggestion
        );

        enhancedSuggestions.push({
          ...suggestion,
          rationale: enhancedRationale
        });
      } catch (error) {
        logger.warn(`[Content Detection] Failed to enhance ${suggestion.criterionId}, using rule-based`);
        enhancedSuggestions.push(suggestion);
      }

      continue;
    }

    // TIER 2: Uncertain rules - full LLM analysis
    if (suggestion.confidence < 95) {
      logger.info(`[Content Detection] ${suggestion.criterionId}: Uncertain (${suggestion.confidence}%), requesting LLM analysis`);

      try {
        const llmResult = await llmAnalysisService.analyzeCriterion(
          suggestion.criterionId,
          suggestion.criterionId,
          epubContentSample,
          suggestion
        );

        // Convert LLM result to ApplicabilitySuggestion format
        enhancedSuggestions.push({
          criterionId: suggestion.criterionId,
          suggestedStatus: llmResult.applicable ? 'applicable' : 'not_applicable',
          confidence: llmResult.confidence,
          detectionChecks: [
            ...suggestion.detectionChecks,
            {
              check: 'LLM deep analysis performed',
              result: 'pass',
              details: llmResult.recommendation
            }
          ],
          rationale: llmResult.rationale,
          edgeCases: [...suggestion.edgeCases, ...llmResult.edgeCases]
        });
      } catch (error) {
        logger.warn(`[Content Detection] LLM analysis failed for ${suggestion.criterionId}, using rule-based`);
        enhancedSuggestions.push(suggestion);
      }

      continue;
    }

    // Default: keep original
    enhancedSuggestions.push(suggestion);
  }

  logger.info(`[Content Detection] Hybrid analysis complete: ${enhancedSuggestions.length} suggestions`);
  return enhancedSuggestions;
}
```

**Step 3:** Update the `analyzeEPUBContent` method call in ACR analysis service to use hybrid approach (we'll do this in next prompt).

---

### Backend Prompt 4: Integrate with ACR Analysis Service

**Update file:** `src/services/acr/acr-analysis.service.ts`

**Step 1:** Add import at top:

```typescript
import { llmAnalysisService } from './llm-analysis.service';
```

**Step 2:** Find the section where `contentDetectionService.analyzeEPUBContent()` is called (around line 490 in the original implementation guide).

**Replace this:**
```typescript
applicabilitySuggestions = await contentDetectionService.analyzeEPUBContent(jobId);
```

**With this:**
```typescript
// Get EPUB content sample for LLM context
let epubContentSample = '';
try {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { remediatedFile: true, originalFile: true }
  });

  if (job) {
    const file = job.remediatedFile || job.originalFile;
    if (file) {
      const buffer = await fileService.getFileBuffer(file.storageKey);
      const zip = await JSZip.loadAsync(buffer);

      // Get first XHTML file as content sample
      const xhtmlFiles = Object.keys(zip.files).filter(name =>
        name.endsWith('.xhtml') || name.endsWith('.html')
      );

      if (xhtmlFiles.length > 0) {
        const firstFile = zip.file(xhtmlFiles[0]);
        if (firstFile) {
          epubContentSample = await firstFile.async('text');
        }
      }
    }
  }
} catch (error) {
  logger.warn('[ACR Analysis] Failed to extract EPUB content sample:', error);
}

// Use hybrid approach if LLM available, otherwise rule-based
if (llmAnalysisService.isEnabled() && epubContentSample) {
  logger.info('[ACR Analysis] Using LLM-enhanced hybrid analysis');
  applicabilitySuggestions = await contentDetectionService.analyzeWithHybridApproach(
    jobId,
    epubContentSample
  );
} else {
  logger.info('[ACR Analysis] Using rule-based analysis only');
  applicabilitySuggestions = await contentDetectionService.analyzeEPUBContent(jobId);
}
```

**Step 3:** Add required imports at top if not present:

```typescript
import JSZip from 'jszip';
import { fileService } from '../file.service';
```

---

### Backend Prompt 5: Add Cost Tracking & Monitoring

**Create new file:** `src/services/acr/llm-usage-tracker.service.ts`

```typescript
import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';

interface UsageRecord {
  date: string;
  jobId: string;
  criterionId: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  analysisType: 'full' | 'explanation';
}

class LLMUsageTrackerService {
  private readonly COST_PER_1K_INPUT = 0.003; // Claude Sonnet pricing
  private readonly COST_PER_1K_OUTPUT = 0.015;

  /**
   * Track LLM API usage
   */
  async trackUsage(record: UsageRecord): Promise<void> {
    try {
      // Log for immediate visibility
      logger.info(`[LLM Usage] ${record.analysisType} analysis for ${record.criterionId}: $${record.estimatedCost.toFixed(4)}`);

      // Store in database for reporting
      // (You'll need to create a LLMUsage table in Prisma schema)
      // await prisma.lLMUsage.create({ data: record });

      // For now, just log
    } catch (error) {
      logger.error('[LLM Usage] Failed to track usage:', error);
    }
  }

  /**
   * Estimate cost from token counts
   */
  estimateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1000) * this.COST_PER_1K_INPUT;
    const outputCost = (outputTokens / 1000) * this.COST_PER_1K_OUTPUT;
    return inputCost + outputCost;
  }

  /**
   * Get usage summary for a date range
   */
  async getUsageSummary(startDate: string, endDate: string): Promise<{
    totalCost: number;
    totalRequests: number;
    avgCostPerJob: number;
  }> {
    // Implement database query once table exists
    return {
      totalCost: 0,
      totalRequests: 0,
      avgCostPerJob: 0
    };
  }
}

export const llmUsageTracker = new LLMUsageTrackerService();
```

**Then update `llm-analysis.service.ts` to track usage after each API call:**

```typescript
// Add this after the API call in analyzeCriterion():
const usage = message.usage;
if (usage) {
  await llmUsageTracker.trackUsage({
    date: new Date().toISOString(),
    jobId: 'current-job-id', // Pass this as parameter
    criterionId,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    estimatedCost: llmUsageTracker.estimateCost(usage.input_tokens, usage.output_tokens),
    analysisType: 'full'
  });
}
```

---

## Frontend Implementation

### Frontend Prompt 1: Update API Types (Already Done)

The `naSuggestion` field was already added in the original AI_SUGGESTED_NA_IMPLEMENTATION_PROMPTS.md.

**Verify it exists in `src/services/api.ts`:**

```typescript
export interface CriterionConfidence {
  // ... existing fields
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

If not present, add it.

---

### Frontend Prompt 2: Add LLM Badge to Suggestions

**Update file:** `src/components/acr/NASuggestionBanner.tsx`

**Find the header section (around line 696) and update to:**

```typescript
<div className="flex items-center gap-2 mb-2">
  <span className="font-semibold text-sm">🤖 AI Suggestion: Not Applicable</span>
  <span className={cn('text-xs px-2 py-0.5 rounded font-medium', style.labelBg, style.text)}>
    {style.label} ({suggestion.confidence}%)
  </span>
  {/* NEW: LLM Badge */}
  {suggestion.detectionChecks.some(c => c.check.includes('LLM')) && (
    <span className="text-xs px-2 py-0.5 rounded font-medium bg-purple-100 text-purple-700 border border-purple-300">
      ⚡ Enhanced with Claude
    </span>
  )}
</div>
```

This adds a visual indicator when LLM analysis was used, helping users understand the source of suggestions.

---

## Testing & Validation

### Test Prompt 1: Verify Backend Setup

**In Replit backend shell, test the LLM service:**

```bash
# Create a test script
cat > test-llm.js << 'EOF'
const { llmAnalysisService } = require('./dist/services/acr/llm-analysis.service');

async function test() {
  console.log('LLM Enabled:', llmAnalysisService.isEnabled());

  if (llmAnalysisService.isEnabled()) {
    const result = await llmAnalysisService.analyzeCriterion(
      '1.2.1',
      'Audio-only and Video-only',
      '<html><body><p>This is a text-only EPUB about gardening.</p></body></html>',
      {
        suggestedStatus: 'not_applicable',
        confidence: 60,
        detectionChecks: [
          { check: 'No audio tags', result: 'pass' }
        ],
        rationale: 'No multimedia detected',
        edgeCases: []
      }
    );

    console.log('LLM Result:', JSON.stringify(result, null, 2));
  }
}

test().catch(console.error);
EOF

node test-llm.js
```

**Expected output:**
```
LLM Enabled: true
LLM Result: {
  "applicable": false,
  "confidence": 95,
  "rationale": "This EPUB contains only text content about gardening with no audio or video elements...",
  "edgeCases": [],
  "recommendation": "Confirm no audio content is referenced in the text or loaded dynamically"
}
```

---

### Test Prompt 2: End-to-End Test

**Steps:**

1. **Upload test EPUB** with known content (e.g., text-only book)
2. **Run ACR workflow** and transfer to Human Verification
3. **Check backend logs** for LLM usage:
   ```
   [LLM Analysis] Claude API initialized successfully
   [Content Detection] Using LLM-enhanced hybrid analysis
   [LLM Analysis] Analyzing 1.2.1 with Claude...
   [LLM Analysis] 1.2.1 analyzed - Applicable: false, Confidence: 95%
   [LLM Usage] full analysis for 1.2.1: $0.0234
   ```

4. **Check frontend** for enhanced suggestions:
   - Expand criterion with N/A suggestion
   - Look for "⚡ Enhanced with Claude" badge
   - Read rationale - should be more context-aware

5. **Verify cost**:
   - Check logs for total cost per document
   - Should be $0.15-0.30 for full 50-criterion analysis

---

### Test Prompt 3: Fallback Testing

**Test that system works without LLM:**

1. **Remove API key** temporarily:
   ```bash
   # In Replit, delete ANTHROPIC_API_KEY secret
   ```

2. **Restart backend**

3. **Run ACR workflow** again

4. **Expected behavior:**
   - Logs show: `[LLM Analysis] ANTHROPIC_API_KEY not found - LLM features disabled`
   - Logs show: `[Content Detection] LLM not available, using rule-based only`
   - Frontend still shows N/A suggestions (rule-based)
   - No "⚡ Enhanced with Claude" badges
   - Rationales are generic

5. **Restore API key** and verify LLM works again

---

## Cost Optimization Strategies

### Strategy 1: Aggressive Caching

**Add to `llm-analysis.service.ts`:**

```typescript
private cache = new Map<string, LLMAnalysisResult>();

async analyzeCriterion(...args): Promise<LLMAnalysisResult> {
  const cacheKey = `${args[0]}-${args[1]}-${this.hashContent(args[2])}`;

  // Check cache
  if (this.cache.has(cacheKey)) {
    logger.info(`[LLM Analysis] Cache hit for ${args[0]}`);
    return this.cache.get(cacheKey)!;
  }

  // Call API
  const result = await this.analyzeCriterionUncached(...args);

  // Store in cache
  this.cache.set(cacheKey, result);

  return result;
}

private hashContent(content: string): string {
  // Simple hash for cache key
  return content.slice(0, 100).replace(/\s/g, '');
}
```

**Savings:** 30-40% reduction in API calls for similar documents

---

### Strategy 2: Batch Analysis

**Instead of calling LLM for each criterion separately, batch them:**

```typescript
async analyzeBatch(criteria: Array<{
  criterionId: string;
  name: string;
  ruleResult: RuleBasedResult;
}>): Promise<Map<string, LLMAnalysisResult>> {
  // Build prompt analyzing multiple criteria at once
  const batchPrompt = `Analyze these ${criteria.length} WCAG criteria:\n\n` +
    criteria.map(c => `${c.criterionId}: ${c.name}\nRule result: ${JSON.stringify(c.ruleResult)}`).join('\n\n');

  // Single API call for all
  const response = await this.client.messages.create({...});

  // Parse results for each criterion
  // ...
}
```

**Savings:** ~50% cost reduction (one API call instead of 15)

---

### Strategy 3: Smart Threshold Tuning

**Only use LLM when it actually helps:**

```typescript
// Don't use LLM for criteria that rules handle well
const SKIP_LLM_FOR = [
  '1.1.1', // Alt text - rules are accurate
  '2.4.2', // Page titles - rules are accurate
  '3.1.1'  // Language - rules are accurate
];

if (SKIP_LLM_FOR.includes(criterionId)) {
  logger.info(`[LLM Analysis] Skipping LLM for ${criterionId} - rules are sufficient`);
  return enhanceExplanationOnly(ruleResult);
}
```

**Savings:** 20-30% reduction in unnecessary LLM calls

---

## Monitoring & Alerts

### Monitoring Prompt: Add Usage Dashboard

**Create endpoint:** `src/routes/admin.routes.ts`

```typescript
router.get('/admin/llm-usage', authenticateToken, requireAdmin, async (req, res) => {
  const { startDate, endDate } = req.query;

  const summary = await llmUsageTracker.getUsageSummary(
    startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate as string || new Date().toISOString()
  );

  res.json({
    success: true,
    data: summary
  });
});
```

**Add alert when cost exceeds threshold:**

```typescript
if (summary.totalCost > 100) { // $100/month threshold
  await sendAdminAlert({
    subject: 'LLM Usage Alert',
    message: `LLM API costs have exceeded $100 this month. Current: $${summary.totalCost.toFixed(2)}`
  });
}
```

---

## Rollout Plan

### Phase 1: Soft Launch (Week 1)

**Enable for:**
- Internal testing only
- 10% of production jobs (A/B test)

**Monitor:**
- Cost per document
- Accuracy vs rule-based
- User feedback

**Success criteria:**
- <$0.30 per document
- >90% human agreement
- >4.0/5.0 user satisfaction

---

### Phase 2: Gradual Rollout (Week 2-3)

**Enable for:**
- 25% of jobs (week 2)
- 50% of jobs (week 3)
- 100% of jobs (week 4)

**Monitor:**
- Total monthly costs
- Override rates
- System performance

**Rollback plan:**
- If costs >$500/month, reduce to 25%
- If accuracy <85%, revert to rules

---

### Phase 3: Optimization (Week 4+)

**Implement:**
- Caching layer
- Batch processing
- Smart threshold tuning

**Target:**
- Reduce cost to <$0.20/document
- Maintain >92% accuracy

---

## Troubleshooting

### Issue 1: "LLM features disabled"

**Cause:** API key not found

**Fix:**
1. Check Replit Secrets contains `ANTHROPIC_API_KEY`
2. Restart backend server
3. Verify logs show `[LLM Analysis] Claude API initialized successfully`

---

### Issue 2: High API costs

**Symptoms:** Costs >$0.50 per document

**Causes:**
- Calling LLM for all criteria (should only call for uncertain ones)
- Not using caching
- Large content samples (>2000 chars)

**Fixes:**
- Implement caching (Strategy 1)
- Tune confidence threshold (only call LLM if <90% confidence)
- Truncate content samples to 2000 chars

---

### Issue 3: Poor accuracy

**Symptoms:** Human override rate >15%

**Causes:**
- Prompts not specific enough
- Missing criterion-specific guidance
- Content sample not representative

**Fixes:**
- Add more examples to prompts
- Improve criterion guidance map
- Extract better content samples (include multiple pages)

---

### Issue 4: Slow performance

**Symptoms:** Analysis takes >30 seconds

**Causes:**
- Too many sequential API calls
- Network latency

**Fixes:**
- Implement batch processing (Strategy 2)
- Process criteria in parallel
- Set timeout limits (10 sec per call)

---

## Success Metrics

Track these metrics to validate the LLM enhancement:

### Week 1:
- [ ] LLM integration complete and tested
- [ ] Cost per document: <$0.35
- [ ] No production errors

### Week 2:
- [ ] 25% rollout complete
- [ ] Accuracy: >88% human agreement
- [ ] User feedback: >3.5/5.0

### Week 4:
- [ ] 100% rollout complete
- [ ] Cost per document: <$0.25
- [ ] Accuracy: >92% human agreement
- [ ] User feedback: >4.0/5.0
- [ ] Time savings: 30%+ reduction in review time

---

## Summary

**What you're implementing:**
1. Claude API integration for complex N/A analysis
2. Hybrid approach (rules for obvious, LLM for uncertain)
3. Enhanced explanations for all suggestions
4. Cost tracking and monitoring
5. Fallback to rules if LLM unavailable

**Expected outcomes:**
- 35% reduction in manual review time (3.5 hours saved per doc)
- 92%+ accuracy on N/A suggestions
- $0.25/document cost
- Context-aware, helpful explanations

**Implementation time:** 2-3 days for basic integration

**Start with:** Backend Prompt 1 (install SDK) and work sequentially through the prompts.

---

*Ready to implement? Start with Backend Prompt 1!*
