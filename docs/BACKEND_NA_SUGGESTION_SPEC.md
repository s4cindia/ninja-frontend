# Backend API Specification: AI-Suggested N/A Status

## Overview

This document specifies the backend API requirements for the "Quick Accept N/A" feature. The frontend is ready to consume this data and display the N/A suggestion banner with a one-click acceptance button.

## API Endpoint

**Endpoint:** `GET /api/v1/confidence/job/:jobId/issues`

The existing endpoint should be enhanced to include an `naSuggestion` field for each criterion where the AI has determined that "Not Applicable" status may be appropriate.

## Response Schema Enhancement

### NaSuggestion Object

Add the following optional field to each criterion in the response:

```typescript
interface NaSuggestion {
  suggestedStatus: 'not_applicable' | 'applicable' | 'uncertain';
  confidence: number;       // 0-100 percentage
  rationale: string;        // Human-readable explanation
  detectionChecks: Array<{
    check: string;          // What was checked
    result: 'pass' | 'fail' | 'warning';
    details?: string;       // Optional additional context
  }>;
  edgeCases: string[];      // Potential edge cases to consider
}
```

### Criterion Response with naSuggestion

```json
{
  "criterionId": "1.2.1",
  "name": "Audio-only and Video-only (Prerecorded)",
  "level": "A",
  "status": "needs_review",
  "confidenceScore": 75,
  "needsVerification": true,
  "naSuggestion": {
    "suggestedStatus": "not_applicable",
    "confidence": 92,
    "rationale": "No audio-only or video-only prerecorded content was detected in this EPUB. The publication contains only text and static images.",
    "detectionChecks": [
      {
        "check": "Audio file presence",
        "result": "pass",
        "details": "No .mp3, .wav, .ogg, or .aac files found in manifest"
      },
      {
        "check": "Video file presence",
        "result": "pass",
        "details": "No .mp4, .webm, .mov, or .avi files found in manifest"
      },
      {
        "check": "Embedded media elements",
        "result": "pass",
        "details": "No <audio> or <video> HTML elements detected"
      },
      {
        "check": "External media references",
        "result": "warning",
        "details": "Found 2 external URLs - manual verification recommended"
      }
    ],
    "edgeCases": [
      "External embedded media players may not be detected",
      "JavaScript-loaded media content cannot be analyzed statically"
    ]
  }
}
```

## Detection Logic by WCAG Criterion

### Criteria Suitable for N/A Detection

| Criterion | Detection Strategy | Confidence Factors |
|-----------|-------------------|-------------------|
| 1.2.1 Audio-only/Video-only | Check for audio/video files in manifest | File types, media elements |
| 1.2.2 Captions (Prerecorded) | Check for video files with audio tracks | Video presence, track elements |
| 1.2.3 Audio Description | Check for video content | Video files in manifest |
| 1.2.4 Captions (Live) | Check for live streaming indicators | Streaming protocols |
| 1.2.5 Audio Description | Check for video content | Video files in manifest |
| 1.4.2 Audio Control | Check for audio that auto-plays | Audio elements with autoplay |
| 2.2.2 Pause, Stop, Hide | Check for animations/auto-updating | CSS animations, auto-refresh |
| 2.3.1 Three Flashes | Check for video/animation content | Animated content presence |

### Confidence Score Calculation

```
Base confidence = 50%

Positive factors (add):
  + 15% if no relevant file types found in manifest
  + 15% if no relevant HTML elements detected
  + 10% if content type analysis confirms text-only
  + 10% if no external media references

Negative factors (subtract):
  - 20% if external URLs found (potential embedded media)
  - 15% if JavaScript present (dynamic content possible)
  - 10% if iframe elements present (embedded content)

Maximum confidence: 95% (always leave room for edge cases)
```

## Verification Submission Endpoint

**Endpoint:** `POST /api/v1/verification/submit`

### Request Body

```json
{
  "criterionId": "1.2.1",
  "jobId": "job-uuid-here",
  "status": "not_applicable",
  "method": "quick_accept",
  "notes": "AI-suggested Not Applicable (92% confidence): No audio-only or video-only prerecorded content was detected in this EPUB."
}
```

### Response

```json
{
  "success": true,
  "data": {
    "criterionId": "1.2.1",
    "newStatus": "not_applicable",
    "verifiedAt": "2026-02-04T08:30:00Z",
    "verifiedBy": "user@example.com",
    "method": "quick_accept"
  }
}
```

## Frontend Behavior

The frontend will:

1. **Display N/A Suggestion Banner** when:
   - `naSuggestion.suggestedStatus === 'not_applicable'`
   - `jobId` is available

2. **Show Quick Accept Button** when:
   - `naSuggestion.confidence >= 90`

3. **Display Confidence Badge**:
   - ≥90%: "High Confidence" (green)
   - 60-89%: "Medium Confidence" (yellow)
   - <60%: "Low Confidence" (red)

4. **On Quick Accept**:
   - Submit verification with `method: 'quick_accept'`
   - Auto-populate notes with confidence and rationale
   - Update UI to show acceptance confirmation

## Example Full Response

```json
{
  "jobId": "abc123",
  "edition": "First Edition",
  "summary": {
    "totalCriteria": 50,
    "passingCriteria": 30,
    "failingCriteria": 5,
    "needsReviewCriteria": 10,
    "notApplicableCriteria": 5
  },
  "criteria": [
    {
      "criterionId": "1.1.1",
      "name": "Non-text Content",
      "level": "A",
      "status": "fail",
      "confidenceScore": 85,
      "needsVerification": true,
      "issueCount": 3,
      "naSuggestion": null
    },
    {
      "criterionId": "1.2.1",
      "name": "Audio-only and Video-only (Prerecorded)",
      "level": "A",
      "status": "needs_review",
      "confidenceScore": 75,
      "needsVerification": true,
      "issueCount": 0,
      "naSuggestion": {
        "suggestedStatus": "not_applicable",
        "confidence": 92,
        "rationale": "No audio-only or video-only prerecorded content was detected in this EPUB.",
        "detectionChecks": [
          {"check": "Audio file presence", "result": "pass"},
          {"check": "Video file presence", "result": "pass"},
          {"check": "Media HTML elements", "result": "pass"}
        ],
        "edgeCases": []
      }
    },
    {
      "criterionId": "1.2.2",
      "name": "Captions (Prerecorded)",
      "level": "A",
      "status": "needs_review",
      "confidenceScore": 70,
      "needsVerification": true,
      "issueCount": 0,
      "naSuggestion": {
        "suggestedStatus": "not_applicable",
        "confidence": 88,
        "rationale": "No prerecorded video content requiring captions was detected.",
        "detectionChecks": [
          {"check": "Video file presence", "result": "pass"},
          {"check": "Video HTML elements", "result": "pass"}
        ],
        "edgeCases": ["Embedded YouTube videos may not be detected"]
      }
    }
  ]
}
```

## Implementation Priority

1. **Phase 1**: Implement N/A detection for media-related criteria (1.2.x)
2. **Phase 2**: Implement N/A detection for timing criteria (2.2.x)
3. **Phase 3**: Implement N/A detection for flash/animation criteria (2.3.x)

## Testing Checklist

- [ ] N/A suggestion appears for criteria with no relevant content
- [ ] Confidence scores reflect detection accuracy
- [ ] Detection checks are accurate and informative
- [ ] Edge cases are properly identified
- [ ] Verification submission correctly stores AI-suggested status
- [ ] Frontend displays banner when naSuggestion data is present
- [ ] Quick Accept button only shows for confidence ≥ 80%
