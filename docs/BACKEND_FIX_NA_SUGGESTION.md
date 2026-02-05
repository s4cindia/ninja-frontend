# Backend Fix: Add naSuggestion Field to Confidence API Response

## Issue
The frontend N/A Suggestion Banner is not displaying because the `/api/v1/confidence/job/{jobId}/issues` endpoint does not include the `naSuggestion` field for criteria.

## Required Change

Add `naSuggestion` field to each criterion in the response when AI analysis determines the criterion may not apply to the content.

### Current Response (Missing naSuggestion)
```json
{
  "criterionId": "1.2.1",
  "criterionName": "Audio-only and Video-only (Prerecorded)",
  "wcagLevel": "A",
  "status": "pass",
  "confidenceScore": 75,
  "needsVerification": true
}
```

### Required Response (With naSuggestion)
```json
{
  "criterionId": "1.2.1",
  "criterionName": "Audio-only and Video-only (Prerecorded)",
  "wcagLevel": "A",
  "status": "pass",
  "confidenceScore": 95,
  "needsVerification": false,
  "naSuggestion": {
    "suggestedStatus": "not_applicable",
    "confidence": 95,
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
        "result": "pass",
        "details": "No external media references found"
      }
    ],
    "edgeCases": []
  }
}
```

## NaSuggestion Schema

```typescript
interface NaSuggestion {
  suggestedStatus: "not_applicable";  // Always "not_applicable" when suggesting N/A
  confidence: number;                  // 0-100 (frontend shows Quick Accept if >= 80)
  rationale: string;                   // Human-readable explanation
  detectionChecks: DetectionCheck[];   // Array of checks performed
  edgeCases: string[];                 // Potential edge cases (can be empty)
}

interface DetectionCheck {
  check: string;                       // What was checked (e.g., "Audio file presence")
  result: "pass" | "fail" | "warning"; // "pass" = no content found (supports N/A), "warning" = needs attention
  details: string;                     // Details about the check result
}
```

## Criteria to Analyze for N/A

| Criterion | Suggest N/A When |
|-----------|------------------|
| 1.2.1 Audio-only and Video-only | No audio or video files in EPUB manifest |
| 1.2.2 Captions (Prerecorded) | No video files with audio tracks |
| 1.2.3 Audio Description or Media Alternative | No video content |
| 1.2.4 Captions (Live) | No live streaming content |
| 1.2.5 Audio Description (Prerecorded) | No video content |
| 1.4.2 Audio Control | No auto-playing audio |
| 2.2.2 Pause, Stop, Hide | No animations or auto-updating content |
| 2.3.1 Three Flashes or Below Threshold | No video or animated content |

## Detection Logic for 1.2.x Criteria

```python
def analyze_media_criteria(epub_manifest):
    audio_extensions = ['.mp3', '.wav', '.ogg', '.aac', '.m4a']
    video_extensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv']
    
    has_audio = any(f.endswith(tuple(audio_extensions)) for f in epub_manifest)
    has_video = any(f.endswith(tuple(video_extensions)) for f in epub_manifest)
    has_media_elements = check_html_for_media_elements(epub_content)
    has_external_refs = check_for_external_media_urls(epub_content)
    
    detection_checks = [
        {
            "check": "Audio file presence",
            "result": "fail" if has_audio else "pass",
            "details": f"Found audio files" if has_audio else "No audio files found in manifest"
        },
        {
            "check": "Video file presence", 
            "result": "fail" if has_video else "pass",
            "details": f"Found video files" if has_video else "No video files found in manifest"
        },
        {
            "check": "Embedded media elements",
            "result": "fail" if has_media_elements else "pass",
            "details": "Found <audio>/<video> elements" if has_media_elements else "No media HTML elements detected"
        },
        {
            "check": "External media references",
            "result": "fail" if has_external_refs else "pass",
            "details": "Found external media URLs" if has_external_refs else "No external media references found"
        }
    ]
    
    # Calculate confidence based on detection results
    passing_checks = sum(1 for c in detection_checks if c["result"] == "pass")
    base_confidence = 50 + (passing_checks * 12)  # Max 98%
    
    # Only suggest N/A if no media content detected
    if not has_audio and not has_video and not has_media_elements:
        return {
            "suggestedStatus": "not_applicable",
            "confidence": min(base_confidence, 95),
            "rationale": "No audio-only or video-only prerecorded content was detected in this EPUB.",
            "detectionChecks": detection_checks,
            "edgeCases": ["External embedded media players may not be detected"] if has_external_refs else []
        }
    
    return None  # Don't include naSuggestion if media content found
```

## Frontend Behavior

When `naSuggestion` is present with `suggestedStatus: "not_applicable"`:

1. **Blue Banner** appears at top of criterion modal Overview tab
2. **Confidence Badge**: Green (≥80%), Yellow (60-79%), Red (<60%)
3. **Quick Accept Button**: Shows only when confidence ≥ 80%
4. **Detection Checks**: Expandable section showing all checks performed
5. **Edge Cases**: Warning section if edge cases exist

## Verification Endpoint

When user clicks "Quick Accept", frontend will call:

**POST** `/api/v1/verification/submit`

```json
{
  "criterionId": "1.2.1",
  "jobId": "job-uuid-here",
  "status": "not_applicable",
  "method": "quick_accept",
  "notes": "AI-suggested Not Applicable (95% confidence): No audio-only or video-only prerecorded content was detected in this EPUB."
}
```

## Testing

After implementing, verify:
1. GET `/api/v1/confidence/job/{jobId}/issues` returns `naSuggestion` for 1.2.x criteria
2. `confidence` values are between 0-100
3. `detectionChecks` array is populated with at least one check
4. Frontend displays the N/A suggestion banner when opening criterion 1.2.1 modal
