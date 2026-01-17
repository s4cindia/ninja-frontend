# ACR Human Verification Guide

## Understanding Human Verification in ACR/VPAT Workflow

### What is Human Verification?

Human Verification is the critical step where accessibility professionals manually verify WCAG conformance for an Accessibility Conformance Report (ACR/VPAT). This is **not** just about checking if automated issues were fixed—it's a comprehensive assessment of **all** WCAG criteria.

---

## Key Concept: Issue Testing vs. Conformance Testing

Understanding the fundamental difference between these two types of testing is critical:

| **Issue-Based Testing** (Automated Audit) | **Conformance Testing** (ACR/VPAT) |
|-------------------------------------------|-----------------------------------|
| Tests **what's broken** | Tests **everything** |
| Reports only problems found | Must verify all applicable WCAG criteria |
| Tool finds X issues = X things to fix | Must verify 50+ criteria regardless of issues found |
| Automated tools (EPubCheck, ACE, Axe) | **Requires human judgment** |
| Example: "Found 3 alt text issues" | Example: "Verify all 50 WCAG A+AA criteria" |

---

## Why You Must Verify All Criteria (Not Just Issues Found)

### The Critical Truth: **Absence of Issues ≠ Passing**

When an automated audit finds **0 issues** for a criterion, it could mean:

1. ✅ **Truly Passes**: Content meets the criterion requirements
2. ❌ **False Negative**: Audit tool missed actual issues
3. ⭕ **Not Applicable**: Content type doesn't apply to this criterion
4. ⚠️ **Partial Coverage**: Tool tested some aspects but not all

**Only a human reviewer can determine which is true.**

### Example Scenarios

#### Scenario 1: Criterion 1.1.1 (Non-text Content)
- **Audit Result**: 0 issues found
- **Possible Realities**:
  - ✅ All images have proper alt text (PASS)
  - ❌ Tool missed decorative images without role="presentation" (FAIL)
  - ⭕ Document has no images at all (NOT APPLICABLE)
  - ⚠️ Tool checked alt attribute but missed aria-label issues (PARTIAL)

**Human Action Required**: Open document, inspect all images, verify alt text quality and appropriateness.

#### Scenario 2: Criterion 2.1.1 (Keyboard Access)
- **Audit Result**: 0 issues found
- **Possible Realities**:
  - ✅ All interactive elements keyboard accessible (PASS)
  - ❌ Automated tools can't test custom JavaScript controls (FAIL)
  - ⭕ Document has no interactive elements (NOT APPLICABLE)

**Human Action Required**: Navigate entire document using only keyboard, test all interactive elements.

#### Scenario 3: Criterion 1.4.3 (Color Contrast)
- **Audit Result**: 0 issues found
- **Possible Realities**:
  - ✅ All text meets contrast ratios (PASS)
  - ❌ Tool missed text in images or CSS-generated content (FAIL)
  - ⚠️ Tool checked black on white but missed colored headings (PARTIAL)

**Human Action Required**: Use color contrast analyzer on all text, including images of text.

---

## What Does "50 Criteria Requiring Verification" Mean?

### WCAG 2.1 Conformance Levels

For ACR/VPAT reports, you must verify criteria based on the conformance level:

| Conformance Level | Criteria Count | Typical Use Case |
|-------------------|---------------|------------------|
| **Level A** | 30 criteria | Minimum legal compliance (Section 508) |
| **Level A + AA** | 50 criteria | Standard enterprise requirement |
| **Level A + AA + AAA** | 78 criteria | Highest accessibility standard |

**Most ACR/VPAT reports require Level A + AA = 50 criteria.**

### What "Requiring Verification" Means

**"Requiring verification" does NOT mean "has issues."** It means:

- ✅ These criteria **must be assessed** for conformance
- ✅ Each criterion needs a **conformance determination**
- ✅ Human judgment **required** for each one
- ❌ It does **NOT** mean "50 issues found"
- ❌ It does **NOT** mean automated testing flagged them

Think of it as a **checklist**, not an issue list.

---

## The Four Conformance Statuses

For each criterion, you must assign one of these statuses:

### 1. **Supports** (Verified Pass)
- Content **fully meets** the criterion
- **No failures** found
- All instances tested and confirmed

**Example Notes:**
> "Tested all 45 images. All decorative images use role='presentation'. All meaningful images have descriptive alt text. Screen reader testing confirms proper announcements."

### 2. **Does Not Support** (Verified Fail)
- Content **fails** to meet the criterion
- Issues exist and impact accessibility
- Requires remediation before conformance

**Example Notes:**
> "15 data tables found. None use proper header associations (<th> elements). Screen reader testing shows inability to navigate table structure. Critical accessibility barrier."

### 3. **Partially Supports** (Verified Partial)
- Content **mostly meets** the criterion
- Some instances pass, some fail
- Minor issues or edge cases

**Example Notes:**
> "18 of 20 headings use semantic HTML correctly. Two section headings on pages 23 and 47 use <p class='heading'> instead of <h2>. Does not significantly impact navigation but should be fixed."

### 4. **Not Applicable** (N/A)
- Content **doesn't contain** elements this criterion applies to
- Cannot be tested because prerequisite content is absent
- Common for media-related criteria in text-only documents

**Example Notes:**
> "Document contains no audio or video content. Criterion for audio descriptions does not apply."

---

## Human Verification Workflow

### Step 1: Triage Criteria (Quick Scan)

**Goal**: Quickly identify Not Applicable criteria (15-30 minutes)

Go through all criteria and mark obvious N/A cases:

| Criteria Category | N/A if... |
|-------------------|-----------|
| 1.2.x (Audio/Video) | No multimedia content |
| 2.4.1 (Bypass Blocks) | Linear reading document with no repetitive navigation |
| 3.2.x (Predictable) | No interactive elements or forms |
| 3.3.x (Input Assistance) | No forms or user input |
| 1.4.2 (Audio Control) | No auto-playing audio |

**Time Saved**: Reduces 50 criteria to ~30-40 that need actual testing.

---

### Step 2: Review Automated Findings

**Goal**: Verify issues found by automated tools (30-60 minutes)

For criteria **with issues found**:

1. **Expand criterion** to see issue details
2. **Review each issue**:
   - Location in document
   - Current state (HTML/code)
   - Suggested fix
3. **Verify in document**:
   - Open source file at specified location
   - Confirm issue exists
   - Check if auto-fix was applied
4. **Look for additional instances**:
   - Automated tools often find SOME issues but miss others
   - Search for similar patterns elsewhere
5. **Assign status**:
   - **Supports**: All instances fixed, no others found
   - **Does Not Support**: Issues remain or new ones found
   - **Partially Supports**: Some fixed, some remain

**Example Process for "Alt Text Issues":**
```
1. Review: "Found 3 images without alt text on pages 5, 7, 9"
2. Verify: Open pages 5, 7, 9 → Confirm images exist
3. Check fixes: Were alt attributes added?
4. Search: Are there OTHER images on different pages?
5. Result: Found 2 more on page 12 that audit missed
6. Status: "Does Not Support" - 3 fixed, 2 remain
```

---

### Step 3: Manual Testing of Undetected Criteria

**Goal**: Test criteria where no issues were found (2-6 hours)

For criteria **without issues found (Confidence: 0%)**:

#### 3A. Read Testing Guidance
- Click "View Testing Guidance & Resources"
- Understand **what** the criterion requires
- Understand **how** to test it
- Note EPUB/document-specific considerations

#### 3B. Plan Your Test
Determine test approach based on criterion:

| Criterion Type | Test Method |
|----------------|-------------|
| **Semantic HTML** (1.3.x) | Inspect code, validate structure |
| **Keyboard Access** (2.1.x, 2.4.x) | Navigate with keyboard only |
| **Screen Reader** (1.1.1, 4.1.2) | Test with NVDA/JAWS/VoiceOver |
| **Color Contrast** (1.4.3, 1.4.6) | Use color contrast analyzer |
| **Visual Design** (1.4.1, 1.4.11) | Visual inspection |
| **Language** (3.1.x) | Check HTML lang attributes |

#### 3C. Execute Test
Follow the testing procedure for each criterion:

**Example: 1.3.1 (Info and Relationships)**
```
1. Identify all structural elements:
   - Headings (should use <h1>-<h6>)
   - Lists (should use <ul>/<ol>/<li>)
   - Tables (should use <table>/<th>/<td>)
   - Form labels (should use <label>)

2. Inspect code:
   - View source of each file
   - Check semantic HTML vs. styling hacks

3. Test with screen reader:
   - Navigate by headings (H key in NVDA)
   - Navigate by landmarks (D key in NVDA)
   - Navigate tables (T key in NVDA)

4. Document findings:
   - List each violation found
   - Note location and impact
   - Provide remediation guidance
```

**Example: 2.1.1 (Keyboard)**
```
1. Identify interactive elements:
   - Links, buttons
   - Form controls
   - Custom JavaScript widgets

2. Test keyboard navigation:
   - Tab through all interactive elements
   - Verify logical tab order
   - Test activation (Enter/Space)
   - Test escape/cancel actions

3. Document results:
   - "All 23 links keyboard accessible"
   - "Custom dropdown on page 15 cannot be operated with keyboard - FAIL"
```

#### 3D. Document Your Findings

**For PASS verdicts:**
```
Status: Verified Pass
Method: NVDA 2024.1 + Manual Code Inspection
Notes: "Tested all 12 HTML files. All headings use semantic
elements (<h1>-<h6>) with proper nesting. No heading level
skips found. Screen reader heading navigation works correctly.
Verified heading hierarchy matches visual hierarchy."
```

**For FAIL verdicts:**
```
Status: Verified Fail
Method: Manual Review
Notes: "5 of 8 data tables lack proper header associations.
Tables on pages 12, 18, 23, 45, and 67 use <td> for all cells
including headers. Screen reader cannot announce column/row
headers. Requires adding <th scope='col/row'> elements."
```

**For N/A verdicts:**
```
Status: Not Applicable
Method: Document Review
Notes: "Document contains no time-based media (audio/video).
All content is text and static images. Criterion for captions
does not apply."
```

---

### Step 4: Cross-Reference and Consistency Check

**Goal**: Ensure consistent evaluation (30 minutes)

1. **Review all "Supports" verdicts**: Did you actually test thoroughly?
2. **Review all "Does Not Support" verdicts**: Are issues documented clearly?
3. **Check related criteria**:
   - If 1.3.1 fails (headings), does 2.4.6 also fail (heading labels)?
   - If 1.1.1 passes (alt text), does 1.4.5 pass (images of text)?
4. **Validate test coverage**:
   - Did you test all sections of document?
   - Did you use multiple testing methods?
   - Are notes detailed enough for report generation?

---

## Recommended Testing Tools

### Screen Readers (Essential)
- **NVDA** (Windows, free) - Industry standard
- **JAWS** (Windows, paid) - Most common enterprise screen reader
- **VoiceOver** (Mac/iOS, built-in) - Apple ecosystem testing

### Browser Extensions (Very Helpful)
- **Axe DevTools** - Comprehensive automated testing
- **WAVE** - Visual accessibility evaluation
- **Accessibility Insights** - Microsoft's testing toolkit
- **HeadingsMap** - Quick heading structure check

### Specialized Tools (For Specific Criteria)
- **Colour Contrast Analyser** - WCAG contrast testing
- **EPUB Accessibility Checker (Ace)** - EPUB-specific validation
- **EPUBCheck** - EPUB structural validation
- **Pa11y** - Automated command-line testing

### Testing Combinations
Combine tools for comprehensive coverage:

1. **First Pass**: Axe DevTools (find obvious issues)
2. **Second Pass**: Manual code inspection (verify semantic HTML)
3. **Third Pass**: Screen reader testing (verify user experience)
4. **Fourth Pass**: WAVE (visual confirmation of issues)

---

## Time Estimates for Full Verification

### Small Document (Simple text, few images, no interactivity)
- **Triage**: 15 minutes → ~35 criteria remain
- **Automated Review**: 30 minutes
- **Manual Testing**: 2 hours
- **Documentation**: 30 minutes
- **Total**: ~3-4 hours

### Medium Document (Text + images + tables + basic structure)
- **Triage**: 20 minutes → ~40 criteria remain
- **Automated Review**: 45 minutes
- **Manual Testing**: 3-4 hours
- **Documentation**: 1 hour
- **Total**: ~5-7 hours

### Complex Document (Interactive, multimedia, forms, complex navigation)
- **Triage**: 30 minutes → ~48 criteria remain
- **Automated Review**: 1 hour
- **Manual Testing**: 6-8 hours
- **Documentation**: 2 hours
- **Total**: ~10-12 hours

**Note**: These are estimates for experienced accessibility professionals. First-time reviews may take 2-3x longer.

---

## Common Pitfalls to Avoid

### 1. **Trusting Automated Tools Blindly**
- ❌ "Axe found 0 issues, so it passes"
- ✅ "Axe found 0 issues, but I need to manually verify semantic structure and keyboard access"

### 2. **Marking Everything as "Supports" Too Quickly**
- ❌ "I didn't find issues, so it passes"
- ✅ "I thoroughly tested using 3 methods and documented my test procedure"

### 3. **Insufficient Documentation**
- ❌ Notes: "Looks good"
- ✅ Notes: "Tested all 45 links with keyboard. Tab order is logical. All links activate with Enter key. Tested with NVDA - all links announced with proper context."

### 4. **Inconsistent Testing Depth**
- ❌ Testing first 3 pages thoroughly, skimming the rest
- ✅ Sampling representative pages from beginning, middle, and end

### 5. **Confusing "No Issues Found" with "Not Applicable"**
- ❌ "Audit found 0 color contrast issues" → Mark as N/A
- ✅ "Audit found 0 issues, but document has colored text" → Must manually test with contrast analyzer

### 6. **Not Testing Edge Cases**
- ❌ Only testing with mouse and visual inspection
- ✅ Testing with keyboard-only, screen reader, high contrast mode, 200% zoom

---

## What Makes Good Verification Notes?

### Poor Notes Examples:
```
❌ "Checked it, looks fine"
❌ "No problems"
❌ "Pass"
❌ "See automated report"
```

### Good Notes Examples:

**Example 1: Supports**
```
✅ Status: Supports
Method: NVDA 2024.1 + Manual Inspection
Notes: "Document contains 127 images across 15 chapters.
Classification:
- 89 meaningful images: All have descriptive alt text (5-20 words)
- 38 decorative images: All use alt='' or role='presentation'
Test procedure:
- Manually reviewed each image in context
- Verified alt text accurately describes visual content
- Tested with NVDA: All alt text announced appropriately
- Confirmed no images of text (criterion 1.4.5 also satisfied)
Conclusion: Fully compliant with 1.1.1."
```

**Example 2: Does Not Support**
```
✅ Status: Does Not Support
Method: Manual Code Inspection + VoiceOver Testing
Notes: "Document contains 8 data tables (pages 12, 15, 18, 23, 45, 67, 89, 102).
Issues found:
- 6 tables lack <th> elements (use <td> for all cells including headers)
- 2 tables have <th> but missing scope attributes
Impact: Screen reader users cannot identify column/row headers.
Tested with VoiceOver: Unable to navigate by table headers (Control+Option+C).
Required remediation:
- Replace header <td> with <th scope='col'> for column headers
- Add <th scope='row'> for row headers where applicable
- Add <caption> elements for table titles
Critical failure requiring immediate remediation."
```

**Example 3: Partially Supports**
```
✅ Status: Partially Supports
Method: Keyboard Navigation + Manual Review
Notes: "Document contains 156 links across 12 chapters.
Test results:
- 152 links have descriptive text ('Download PDF Report' vs 'Click Here') ✓
- 4 links use ambiguous text:
  - Page 23: 'Read More' (context unclear out of table of contents)
  - Page 45: 'Here' (should be 'Download Annual Report')
  - Page 67: 'This page' (should be 'Visit Company Homepage')
  - Page 89: 'More info' (should be 'Learn About Accessibility Features')
Impact: Minor. Screen reader users navigating by links may need surrounding context.
Recommendation: Update 4 link texts to be self-descriptive. Not critical but should be addressed for best practice."
```

**Example 4: Not Applicable**
```
✅ Status: Not Applicable
Method: Document Content Review
Notes: "Criterion 1.2.2 requires captions for prerecorded audio in synchronized media.
Document analysis:
- No <video> elements found
- No <audio> elements found
- No embedded multimedia (checked for iframe, object, embed tags)
- All content is text and static images
Conclusion: Document contains no time-based media. Criterion does not apply."
```

---

## Key Takeaways

1. **Human verification is comprehensive conformance testing, not just issue checking**
   - You must verify ALL applicable WCAG criteria
   - "No issues found" ≠ automatic pass

2. **50 criteria is a checklist, not an issue count**
   - Represents complete WCAG 2.1 Level A+AA
   - Each requires human judgment

3. **Use multiple testing methods**
   - Automated tools (find obvious issues)
   - Manual code inspection (verify semantic correctness)
   - Assistive technology (verify user experience)

4. **Document thoroughly**
   - Explain what you tested
   - Explain how you tested
   - Explain what you found (or didn't find)

5. **Be honest and rigorous**
   - ACR/VPAT is a legal conformance document
   - Your verification affects real users with disabilities
   - Don't cut corners - thoroughness matters

6. **Budget appropriate time**
   - Simple documents: 3-4 hours minimum
   - Complex documents: 10-12+ hours
   - Cannot be rushed without compromising quality

---

## Further Reading

- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **VPAT Template**: https://www.itic.org/policy/accessibility/vpat
- **Section 508 Standards**: https://www.section508.gov/
- **WebAIM Resources**: https://webaim.org/articles/
- **Deque University**: https://dequeuniversity.com/
- **A11Y Project**: https://www.a11yproject.com/

---

*This guide provides a framework for rigorous ACR/VPAT human verification. Adapt the workflow to your specific content type and organizational requirements.*
