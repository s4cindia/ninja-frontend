# Backend API Specification: ACR Post-Remediation Updates

This document specifies the backend API changes needed to properly reflect remediation status in the ACR (Accessibility Conformance Report) AI Analysis step.

## Overview

After EPUB remediation is complete, the ACR analysis endpoint (`/api/acr/analysis/:jobId`) should return updated data reflecting:
1. Updated confidence scores for remediated criteria
2. Verification status changes for compliant criteria
3. Remediation details for fixed issues
4. Status updates for Other Issues (Non-WCAG)

---

## 1. Confidence Score Updates

### Requirement
After remediation, update the `confidenceScore` for criteria that have been remediated.

### Logic
```
For each criterion with remediated issues:
  - If ALL issues for that criterion are fixed:
    confidenceScore = 85-95% (based on fix quality/AI confidence)
  - If SOME issues remain:
    confidenceScore = (fixedCount / totalCount) * 80 + baseScore
  - If issues were manually reviewed and verified:
    confidenceScore = 95-100%
```

### Example Response
```json
{
  "criteria": [
    {
      "criterionId": "1.1.1",
      "name": "Non-text Content",
      "confidenceScore": 92,
      "status": "pass",
      "remarks": "All 3 images now have appropriate alt text after auto-remediation."
    }
  ]
}
```

### Calculation Guidelines
| Scenario | Confidence Score |
|----------|------------------|
| All issues auto-fixed, high AI confidence | 85-92% |
| All issues auto-fixed, needs human review | 75-84% |
| Partial fix (some issues remain) | 40-74% |
| Manual verification completed | 95-100% |
| No remediation performed | 0-50% |

---

## 2. Verification Status Updates

### Requirement
After remediation, set `needsVerification: false` for criteria that are now compliant.

### Logic
```
For each criterion:
  if (allIssuesFixed && noRemainingIssues):
    needsVerification = false
  else if (hasRemainingIssues || requiresManualCheck):
    needsVerification = true
```

### Example Response
```json
{
  "criteria": [
    {
      "criterionId": "1.1.1",
      "name": "Non-text Content",
      "needsVerification": false,
      "status": "pass",
      "confidenceScore": 92,
      "remediationSummary": {
        "totalIssues": 3,
        "fixedIssues": 3,
        "remainingIssues": 0,
        "fixedAt": "2026-02-03T10:30:00Z"
      }
    },
    {
      "criterionId": "1.4.3",
      "name": "Contrast (Minimum)",
      "needsVerification": true,
      "status": "needs_review",
      "confidenceScore": 45,
      "remediationSummary": {
        "totalIssues": 5,
        "fixedIssues": 2,
        "remainingIssues": 3,
        "note": "3 contrast issues require manual color selection"
      }
    }
  ]
}
```

### Status Mapping
| Condition | needsVerification | status |
|-----------|-------------------|--------|
| All issues fixed automatically | `false` | `"pass"` |
| All issues fixed, needs confirmation | `true` | `"needs_review"` |
| Partial fix, issues remain | `true` | `"needs_review"` |
| No remediation performed | `true` | `"not_tested"` |
| Criterion not applicable | `false` | `"not_applicable"` |

---

## 3. Detailed Remediation Info for Issues

### Requirement
Include detailed `remediationInfo` for each fixed issue, especially for alt-text additions.

### Schema
```typescript
interface RemediatedIssue {
  ruleId: string;
  description: string;
  location: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  remediationInfo: {
    status: 'REMEDIATED' | 'FAILED' | 'SKIPPED';
    description: string;
    fixedAt: string;
    fixType: 'auto' | 'manual';
    details?: {
      // For alt-text fixes
      imageFile?: string;
      altTextAdded?: string;
      aiConfidence?: number;
      
      // For metadata fixes
      fieldName?: string;
      valueBefore?: string;
      valueAfter?: string;
      
      // For structural fixes
      elementPath?: string;
      fixApplied?: string;
    };
  };
}
```

### Example: Alt-Text Remediation
```json
{
  "criterionId": "1.1.1",
  "remediatedIssues": [
    {
      "ruleId": "EPUB-IMG-001",
      "description": "Missing alt text for image",
      "location": "OEBPS/chapter1.xhtml",
      "severity": "serious",
      "remediationInfo": {
        "status": "REMEDIATED",
        "description": "Added descriptive alt text using AI image analysis",
        "fixedAt": "2026-02-03T10:30:00Z",
        "fixType": "auto",
        "details": {
          "imageFile": "images/figure-1-water-cycle.png",
          "altTextAdded": "Diagram illustrating the water cycle: arrows show evaporation from ocean surface, cloud formation through condensation, and precipitation returning water to Earth as rain and snow.",
          "aiConfidence": 0.94
        }
      }
    },
    {
      "ruleId": "EPUB-IMG-001",
      "description": "Missing alt text for image",
      "location": "OEBPS/chapter2.xhtml",
      "severity": "serious",
      "remediationInfo": {
        "status": "REMEDIATED",
        "description": "Added descriptive alt text using AI image analysis",
        "fixedAt": "2026-02-03T10:30:05Z",
        "fixType": "auto",
        "details": {
          "imageFile": "images/figure-2-photosynthesis.png",
          "altTextAdded": "Cross-section diagram of a plant leaf showing chloroplasts absorbing sunlight, with labeled arrows indicating carbon dioxide intake and oxygen release.",
          "aiConfidence": 0.89
        }
      }
    }
  ]
}
```

---

## 4. Other Issues (Non-WCAG) Status Updates

### Requirement
Include `status` and `remediationInfo` fields for Other Issues to indicate if they were fixed.

### Schema
```typescript
interface OtherIssue {
  code: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  message: string;
  location?: string;
  status?: 'pending' | 'fixed' | 'failed' | 'skipped';
  remediationInfo?: {
    description: string;
    fixedAt: string;
    fixType: 'auto' | 'manual';
    details?: Record<string, unknown>;
  };
}

interface OtherIssuesResponse {
  count: number;
  pendingCount: number;
  fixedCount: number;
  issues: OtherIssue[];
}
```

### Example Response
```json
{
  "otherIssues": {
    "count": 2,
    "pendingCount": 1,
    "fixedCount": 1,
    "issues": [
      {
        "code": "OPF-085",
        "severity": "moderate",
        "message": "\"dc:identifier\" value \"urn:uuid:ninja-test-02-missing-alt\" is marked as a UUID, but is an invalid UUID.",
        "location": "OEBPS/content.opf",
        "status": "pending"
      },
      {
        "code": "EPUB-META-003",
        "severity": "minor",
        "message": "Missing accessibility summary",
        "location": "OEBPS/content.opf",
        "status": "fixed",
        "remediationInfo": {
          "description": "Added accessibility summary metadata",
          "fixedAt": "2026-02-03T10:30:00Z",
          "fixType": "auto",
          "details": {
            "fieldName": "schema:accessibilitySummary",
            "valueAdded": "This publication includes alt text for all images, proper heading structure, and semantic markup for navigation."
          }
        }
      }
    ]
  }
}
```

---

## 5. Complete Example Response

### GET /api/acr/analysis/:jobId

```json
{
  "jobId": "job-123-abc",
  "status": "completed",
  "overallConfidence": 78,
  "summary": {
    "totalCriteria": 50,
    "passedCriteria": 35,
    "failedCriteria": 2,
    "needsReviewCriteria": 10,
    "notApplicableCriteria": 3
  },
  "remediationSummary": {
    "totalIssuesFound": 15,
    "issuesFixed": 12,
    "issuesRemaining": 3,
    "remediationCompletedAt": "2026-02-03T10:35:00Z"
  },
  "criteria": [
    {
      "criterionId": "1.1.1",
      "name": "Non-text Content",
      "level": "A",
      "confidenceScore": 92,
      "status": "pass",
      "needsVerification": false,
      "remarks": "All images now have appropriate alt text.",
      "relatedIssues": [],
      "remediatedIssues": [
        {
          "ruleId": "EPUB-IMG-001",
          "description": "Missing alt text for image",
          "location": "OEBPS/chapter1.xhtml",
          "severity": "serious",
          "remediationInfo": {
            "status": "REMEDIATED",
            "description": "Added descriptive alt text using AI image analysis",
            "fixedAt": "2026-02-03T10:30:00Z",
            "fixType": "auto",
            "details": {
              "imageFile": "images/water-cycle.png",
              "altTextAdded": "Diagram showing the water cycle with evaporation, condensation, and precipitation stages.",
              "aiConfidence": 0.94
            }
          }
        }
      ]
    },
    {
      "criterionId": "1.4.3",
      "name": "Contrast (Minimum)",
      "level": "AA",
      "confidenceScore": 45,
      "status": "needs_review",
      "needsVerification": true,
      "remarks": "2 of 5 contrast issues fixed. 3 require manual color adjustment.",
      "relatedIssues": [
        {
          "ruleId": "EPUB-COLOR-001",
          "description": "Insufficient color contrast ratio",
          "location": "OEBPS/styles/main.css",
          "severity": "serious"
        }
      ],
      "remediatedIssues": [
        {
          "ruleId": "EPUB-COLOR-001",
          "description": "Insufficient color contrast ratio",
          "location": "OEBPS/chapter1.xhtml",
          "remediationInfo": {
            "status": "REMEDIATED",
            "description": "Adjusted text color for WCAG AA compliance",
            "fixType": "auto",
            "details": {
              "colorBefore": "#999999",
              "colorAfter": "#595959",
              "contrastRatioBefore": 2.85,
              "contrastRatioAfter": 7.02
            }
          }
        }
      ]
    }
  ],
  "otherIssues": {
    "count": 2,
    "pendingCount": 1,
    "fixedCount": 1,
    "issues": [
      {
        "code": "OPF-085",
        "severity": "moderate",
        "message": "Invalid UUID format in dc:identifier",
        "location": "OEBPS/content.opf",
        "status": "pending"
      },
      {
        "code": "EPUB-META-003",
        "severity": "minor",
        "message": "Missing accessibility summary",
        "status": "fixed",
        "remediationInfo": {
          "description": "Added accessibility summary metadata",
          "fixedAt": "2026-02-03T10:30:00Z",
          "fixType": "auto",
          "details": {
            "valueAdded": "This publication includes alt text for all images and proper heading structure."
          }
        }
      }
    ]
  }
}
```

---

## Implementation Notes

### Backend Changes Required

1. **Post-Remediation Hook**: After remediation job completes, run a function to:
   - Calculate new confidence scores based on fix results
   - Update `needsVerification` flags
   - Populate `remediationInfo` with detailed fix information

2. **AI Alt-Text Storage**: When generating alt-text:
   - Store the generated text in `remediationInfo.details.altTextAdded`
   - Store the AI confidence score
   - Store the image filename for reference

3. **Other Issues Tracking**: 
   - Track which Other Issues were addressed during remediation
   - Update their `status` field to `'fixed'` or `'failed'`
   - Include remediation details

4. **Confidence Calculation Function**:
   ```python
   def calculate_criterion_confidence(criterion, remediation_results):
       total_issues = len(criterion.related_issues) + len(criterion.remediated_issues)
       fixed_issues = len([i for i in criterion.remediated_issues 
                          if i.remediation_info.status == 'REMEDIATED'])
       
       if total_issues == 0:
           return 85  # No issues found
       
       fix_ratio = fixed_issues / total_issues
       
       if fix_ratio == 1.0:
           # All issues fixed - high confidence
           avg_ai_confidence = mean([i.remediation_info.details.ai_confidence 
                                    for i in criterion.remediated_issues])
           return min(95, 80 + (avg_ai_confidence * 15))
       else:
           # Partial fix
           return int(40 + (fix_ratio * 40))
   ```

---

## Frontend Handling

The frontend will use these fields to:
1. Display accurate confidence percentages
2. Show correct "Needs Verification" counts
3. Display fixed Other Issues in green with remediation details
4. Show detailed alt-text values in the Issues tab
