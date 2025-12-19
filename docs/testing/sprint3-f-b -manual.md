# Sprint 3F-B Manual Test Cases

**Ninja Platform - ACR Generation Frontend**  
**Tester:** _______________  
**Date:** _______________  
**Build:** _______________

---

## Test Environment Setup

1. Frontend: ninja-frontend-avr running on Replit
2. Backend: ninja-backend running on Replit  
3. Browser: Chrome/Edge with DevTools open (Console tab)
4. Ensure `.env` has correct `VITE_API_URL` pointing to backend

---

## FE-3.9: EditionSelector Component

**Test Page:** `/test/edition-selector` (or page containing component)

### TC-3.9.1: Component Renders
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to page with EditionSelector | Page loads without errors | ☐ |
| 2 | Verify four edition cards displayed | Cards: 508, WCAG, EU, INT visible | ☐ |
| 3 | Check INT card | Shows "Recommended" badge with star/highlight | ☐ |
| 4 | Check console | No errors in browser console | ☐ |

### TC-3.9.2: Tooltips
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Hover over 508 card | Tooltip: "For U.S. Federal procurement only" | ☐ |
| 2 | Hover over WCAG card | Tooltip: "General accessibility reporting" | ☐ |
| 3 | Hover over EU card | Tooltip: "For European Accessibility Act compliance" | ☐ |
| 4 | Hover over INT card | Tooltip: "Satisfies US, EU, and WCAG requirements in one document" | ☐ |

### TC-3.9.3: Selection Behavior
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click 508 card | Card highlighted with border/checkmark | ☐ |
| 2 | Click WCAG card | WCAG selected, 508 deselected | ☐ |
| 3 | Click EU card | EU selected, WCAG deselected | ☐ |
| 4 | Click INT card | INT selected with visual feedback | ☐ |
| 5 | Click selected card again | Card remains selected (no toggle off) | ☐ |

### TC-3.9.4: Criteria Count Display
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Check 508 card | Shows criteria count (e.g., "XX criteria") | ☐ |
| 2 | Check WCAG card | Shows criteria count | ☐ |
| 3 | Check EU card | Shows criteria count | ☐ |
| 4 | Check INT card | Shows highest criteria count | ☐ |

### TC-3.9.5: Keyboard Accessibility
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Press Tab to focus component | Focus ring visible on first card | ☐ |
| 2 | Press Tab again | Focus moves to next card | ☐ |
| 3 | Press Enter on focused card | Card becomes selected | ☐ |
| 4 | Press Space on focused card | Card becomes selected | ☐ |

### TC-3.9.6: Loading State
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Throttle network in DevTools (Slow 3G) | Loading spinner/skeleton shown | ☐ |
| 2 | Wait for load | Cards appear after data loads | ☐ |

### TC-3.9.7: Error State
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Stop backend server | Error message displayed | ☐ |
| 2 | Restart backend | Retry button works or auto-recovers | ☐ |

---

## FE-3.10: ConfidenceDashboard Component

**Test Page:** `/test/confidence-dashboard` or `/acr/:jobId`  
**Prerequisite:** Valid jobId with validation results

### TC-3.10.1: Summary Statistics
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to dashboard | Summary stats card visible | ☐ |
| 2 | Check total count | Shows total criteria count | ☐ |
| 3 | Check HIGH confidence | Green badge with count/percentage | ☐ |
| 4 | Check MEDIUM confidence | Yellow badge with count/percentage | ☐ |
| 5 | Check LOW confidence | Orange badge with count/percentage | ☐ |
| 6 | Check MANUAL REQUIRED | Red badge with count/percentage | ☐ |

### TC-3.10.2: Progress Indicator
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Check progress ring/bar | Shows "Human Verification Needed" count | ☐ |
| 2 | Verify percentage | Matches (verified / total needing verification) | ☐ |

### TC-3.10.3: Expandable List
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click HIGH confidence section | Section expands showing items | ☐ |
| 2 | Click again | Section collapses | ☐ |
| 3 | Expand MANUAL REQUIRED | Shows items needing human review | ☐ |

### TC-3.10.4: Item Details
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Expand a section | Each item shows WCAG criterion ID | ☐ |
| 2 | Check item | Shows criterion name/description | ☐ |
| 3 | Check badges | Confidence level badge color-coded | ☐ |
| 4 | Check automated checks | List of automated checks performed | ☐ |
| 5 | Check manual checks | List of manual checks needed | ☐ |

### TC-3.10.5: Verify Button
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Find item needing verification | "Verify" button visible | ☐ |
| 2 | Click Verify button | Navigates to verification queue | ☐ |
| 3 | Check URL | Contains correct criterionId | ☐ |

---

## FE-3.11: VerificationQueue Component

**Test Page:** `/acr/:jobId/verify`  
**Prerequisite:** Job with items requiring verification

### TC-3.11.1: Queue Display
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to verification queue | Items list displayed | ☐ |
| 2 | Check progress indicator | Shows "X of Y items verified" | ☐ |
| 3 | Verify item count | Matches expected pending items | ☐ |

### TC-3.11.2: Filters
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Filter by severity: Critical | Only critical items shown | ☐ |
| 2 | Filter by confidence: LOW | Only LOW confidence items shown | ☐ |
| 3 | Filter by status: Pending | Only pending items shown | ☐ |
| 4 | Clear filters | All items shown | ☐ |

### TC-3.11.3: Verification Form
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click item to verify | Verification form opens | ☐ |
| 2 | Check status options | VERIFIED_PASS, VERIFIED_FAIL, VERIFIED_PARTIAL, DEFERRED | ☐ |
| 3 | Check method dropdown | NVDA, JAWS, VoiceOver, Manual Review, Keyboard Only | ☐ |
| 4 | Select VERIFIED_FAIL | Notes field becomes required | ☐ |
| 5 | Try submit without notes | Validation error shown | ☐ |
| 6 | Add notes and submit | Form submits successfully | ☐ |

### TC-3.11.4: Verification Persistence
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Submit a verification | Progress indicator updates | ☐ |
| 2 | Refresh page | Verified item still marked complete | ☐ |
| 3 | Check Network tab | POST to /api/v1/verification/verify/:itemId | ☐ |

### TC-3.11.5: Bulk Verification
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Select multiple items (checkboxes) | Selection count shown | ☐ |
| 2 | Click "Bulk Verify" | Bulk verification form opens | ☐ |
| 3 | Submit bulk verification | All selected items updated | ☐ |

---

## FE-3.12: AcrEditor Component

**Test Page:** `/acr/:jobId/edit`  
**Prerequisite:** Generated ACR document

### TC-3.12.1: Criteria Table
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to ACR editor | Criteria table displayed | ☐ |
| 2 | Check columns | Criterion, Conformance Level, Remarks, Attribution | ☐ |
| 3 | Check row count | Matches edition criteria count | ☐ |

### TC-3.12.2: Conformance Level Colors
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Find "Supports" row | Green badge/highlight | ☐ |
| 2 | Find "Partially Supports" row | Yellow badge/highlight | ☐ |
| 3 | Find "Does Not Support" row | Red badge/highlight | ☐ |
| 4 | Find "Not Applicable" row | Gray badge/highlight | ☐ |

### TC-3.12.3: Remarks Editing
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click edit on a remarks cell | Edit mode activates | ☐ |
| 2 | Type new remarks | Text updates in real-time | ☐ |
| 3 | Check character count | Shows current/max characters | ☐ |
| 4 | Save remarks | Remarks saved, edit mode closes | ☐ |

### TC-3.12.4: AI Generate Remarks
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Generate" button on remarks | Loading indicator shown | ☐ |
| 2 | Wait for generation | AI-generated remarks appear | ☐ |
| 3 | Check remarks content | Includes quantitative data | ☐ |
| 4 | Check attribution | Marked as [AI-SUGGESTED] | ☐ |

### TC-3.12.5: Credibility Warnings
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | If >95% Supports | Warning banner displayed | ☐ |
| 2 | Check warning text | Explains credibility concern | ☐ |

### TC-3.12.6: Finalization Check
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Check "Mark as Final" button | Shows enabled/disabled state | ☐ |
| 2 | If disabled | List of blocking items shown | ☐ |
| 3 | Complete all blockers | Button becomes enabled | ☐ |
| 4 | Click "Mark as Final" | Status changes to Final | ☐ |

---

## FE-3.13: ExportDialog Component

**Test Page:** `/acr/:jobId` (Export button)  
**Prerequisite:** Finalized or draft ACR

### TC-3.13.1: Dialog Opens
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Export" button | Dialog modal opens | ☐ |
| 2 | Check format options | Word, PDF, HTML radio buttons | ☐ |
| 3 | Check export options | Methodology, Attribution, Disclaimer checkboxes | ☐ |

### TC-3.13.2: Format Selection
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Select Word (.docx) | Description shows "Editable document" | ☐ |
| 2 | Select PDF | Description shows "Accessible tagged PDF" | ☐ |
| 3 | Select HTML | Description shows "Web-ready" | ☐ |

### TC-3.13.3: Branding Options
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Enter company name | Input accepts text | ☐ |
| 2 | Pick primary color | Color picker works | ☐ |
| 3 | Enter footer text | Input accepts text | ☐ |

### TC-3.13.4: Export Process
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click Export button | Loading state shown | ☐ |
| 2 | Wait for generation | Download link appears | ☐ |
| 3 | Click download link | File downloads | ☐ |
| 4 | Open downloaded file | File opens correctly in app | ☐ |

### TC-3.13.5: Export Each Format
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Export as DOCX | Word document downloads, opens in Word | ☐ |
| 2 | Export as PDF | PDF downloads, is tagged/accessible | ☐ |
| 3 | Export as HTML | HTML downloads, renders in browser | ☐ |

---

## FE-3.14: VersionHistory Component

**Test Page:** `/acr/:jobId/versions`  
**Prerequisite:** ACR with multiple versions

### TC-3.14.1: Version List
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to version history | Version list displayed | ☐ |
| 2 | Check version entries | Shows version number, date, user | ☐ |
| 3 | Check change summary | Brief description of changes | ☐ |

### TC-3.14.2: Version Details
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click on a version | Details panel opens | ☐ |
| 2 | Check changelog | Shows field, old value, new value | ☐ |
| 3 | Check reason | Shows change reason if provided | ☐ |

### TC-3.14.3: Version Comparison
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Select version A | First version highlighted | ☐ |
| 2 | Select version B | Second version highlighted | ☐ |
| 3 | Click "Compare" | Side-by-side view opens | ☐ |
| 4 | Check differences | Changes highlighted in diff | ☐ |

### TC-3.14.4: Restore Version
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Select older version | Restore button visible | ☐ |
| 2 | Click Restore | Confirmation dialog appears | ☐ |
| 3 | Confirm restore | ACR reverts to selected version | ☐ |
| 4 | Check version list | New version created from restore | ☐ |

---

## FE-3.15: AcrWorkflowPage (Integration)

**Test Page:** `/acr/:jobId`  
**Prerequisite:** Completed validation job

### TC-3.15.1: Workflow Stepper
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to ACR workflow | Stepper with 5 steps visible | ☐ |
| 2 | Check step labels | Edition, Confidence, Verify, Edit, Export | ☐ |
| 3 | Check current step | Step 1 highlighted | ☐ |

### TC-3.15.2: Step 1 - Edition Selection
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | View step 1 | EditionSelector displayed | ☐ |
| 2 | Select INT edition | Next button becomes enabled | ☐ |
| 3 | Click Next | Moves to step 2 | ☐ |

### TC-3.15.3: Step 2 - Confidence Review
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | View step 2 | ConfidenceDashboard displayed | ☐ |
| 2 | If items need verification | "Go to Verification" button shown | ☐ |
| 3 | If all verified | "Skip to Editor" button shown | ☐ |

### TC-3.15.4: Step 3 - Verification
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | View step 3 | VerificationQueue displayed | ☐ |
| 2 | Complete all verifications | Progress shows 100% | ☐ |
| 3 | Click Continue | Moves to step 4 | ☐ |

### TC-3.15.5: Step 4 - Edit ACR
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | View step 4 | AcrEditor displayed | ☐ |
| 2 | Make edits | Changes saved | ☐ |
| 3 | Check finalization | Can/cannot finalize shown | ☐ |
| 4 | Click Next | Moves to step 5 | ☐ |

### TC-3.15.6: Step 5 - Export
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | View step 5 | ExportDialog options displayed | ☐ |
| 2 | Export document | File downloads successfully | ☐ |

### TC-3.15.7: Navigation
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click previous step in stepper | Navigates back | ☐ |
| 2 | Click future step | Blocked if prerequisites not met | ☐ |
| 3 | Refresh page | Current step preserved | ☐ |

### TC-3.15.8: Auto-Save
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Make changes in editor | "Saving..." indicator appears | ☐ |
| 2 | Wait a moment | "Saved" indicator appears | ☐ |
| 3 | Refresh page | Changes persisted | ☐ |

---

## Cross-Cutting Tests

### TC-CC.1: API Error Handling
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Stop backend server | Error message displayed | ☐ |
| 2 | Check error message | User-friendly, not technical | ☐ |
| 3 | Restart backend | Can retry or auto-recover | ☐ |

### TC-CC.2: Authentication
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Access ACR pages while logged out | Redirected to login | ☐ |
| 2 | Login and return | Original page loads | ☐ |
| 3 | Let session expire | Graceful re-auth prompt | ☐ |

### TC-CC.3: Responsive Design
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | View on desktop (1920px) | Full layout displayed | ☐ |
| 2 | View on tablet (768px) | Responsive layout adapts | ☐ |
| 3 | View on mobile (375px) | Mobile-friendly layout | ☐ |

### TC-CC.4: Accessibility
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate with keyboard only | All functions accessible | ☐ |
| 2 | Run Lighthouse accessibility | Score > 90 | ☐ |
| 3 | Check color contrast | Meets WCAG AA | ☐ |

---

## Test Summary

| Component | Total Tests | Passed | Failed | Blocked |
|-----------|-------------|--------|--------|---------|
| FE-3.9 EditionSelector | 7 | | | |
| FE-3.10 ConfidenceDashboard | 5 | | | |
| FE-3.11 VerificationQueue | 5 | | | |
| FE-3.12 AcrEditor | 6 | | | |
| FE-3.13 ExportDialog | 5 | | | |
| FE-3.14 VersionHistory | 4 | | | |
| FE-3.15 AcrWorkflowPage | 8 | | | |
| Cross-Cutting | 4 | | | |
| **Total** | **44** | | | |

---

## Defects Found

| ID | Component | Description | Severity | Status |
|----|-----------|-------------|----------|--------|
| | | | | |

---

## Sign-Off

**Tester:** _______________  
**Date:** _______________  
**Result:** ☐ Pass | ☐ Fail | ☐ Blocked

**Notes:**
