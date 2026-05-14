# PDF Preview ↔ Issues Panel Cross-Reference Design

**Decision:** Option A + C
**Status:** Approved for implementation

---

## Problem

The PDF preview panel displays numbered circles (1, 2, 3… per page) over issue bounding boxes.
The issues panel (right column) displays a separate filtered list with its own ordering.
There is no visual or interactive link between the two — a user who sees circle `3` on the PDF has
no way to find that issue in the right panel without clicking through it.

---

## Options Considered

### Option A — Global Sequential Numbers (Fixed Order)

Each issue gets a single global number (1–N) assigned once at load time by severity → page order.
Both the circle on the PDF and the issue card in the right panel display that same number always.

```
Right panel:          PDF overlay:
[#1] Critical — ...   ┌─────────────┐
[#2] Serious  — ...   │  ①  ③       │
[#3] Serious  — ...   │       ②     │
                      └─────────────┘
```

**Pros:** Simple, stable — numbers never change when you filter. "Circle 7 = Issue 7" is always true.
**Cons:** Numbers can be large (circle showing "47" is hard to read). If the right panel is filtered,
issue #47 may be off-screen and hard to find.

---

### Option B — Filter-Aware Numbers (Dynamic)

Numbers match only the currently-visible issues in the right panel. Filter to "Tables" → only table
issues get circles (1, 2, 3). Other circles disappear or are grayed out.

**Pros:** "Circle 2 = issue 2 in the list" is always true for what you can currently see.
**Cons:** Numbers shift every time the filter changes, which feels unstable.

---

### Option C — Bidirectional Selection (No Numbering)

Remove numbers from circles entirely. Wire selection bidirectionally:
- Click a circle → right panel **scrolls to and pulses** that issue card
- Click an issue card → PDF navigates to that page and **animates** that circle

**Pros:** No number-matching confusion. Cleanest UX. The selection IS the correlation.
**Cons:** No "which numbered item is this?" without an extra click.

---

### Option D — Page-Local Numbers + "On This Page" Highlight in Right Panel

Keep circles as 1, 2, 3… per page but add a visual marker in the right panel showing which
issues are on the currently viewed page.

**Pros:** Circles stay stable, right panel shows page context.
**Cons:** Two numbering systems exist simultaneously.

---

## Decision: Option A + C Combined

**Global sequential numbers** (Option A) for stable identity, plus **bidirectional selection**
(Option C) for interaction wiring. Numbers never shift with filters; selection state links both panels.

---

## Implementation Spec

### 1. Global Issue Numbering

Assign `globalIndex` (1-based) to every issue once, at the point where issues are loaded from the
audit result. Ordering: **page number ascending → severity weight descending → original array order**.

Severity weight: `critical=4`, `serious=3`, `moderate=2`, `minor=1`.

`globalIndex` is passed as a stable prop — it does not recompute when filters change.

### 2. PDF Preview Panel — Circle Shows Global Number

`PdfPreviewPanel` receives a `issueNumberMap: Map<string, number>` (issueId → globalIndex).
The overlay circle renders `issueNumberMap.get(issue.id) ?? '?'` instead of the per-page `index + 1`.

### 3. Issues Panel — Number Badge on Each Card

Each issue card in the right panel shows a small `#N` badge (gray, monospace) alongside the severity
chip. The badge always shows the global number — visible even when filtered.

### 4. Bidirectional Selection Wiring

**Circle → Right panel (existing + enhanced):**
- Clicking a circle already sets `selectedIssueId`
- New: after setting selection, call `scrollToIssueCard(issueId)` which calls
  `document.getElementById(`issue-card-${issueId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })`

**Right panel → PDF preview (new):**
- Each issue card already has a click handler that sets `selectedIssueId`
- New: after setting selection, if the issue is on a different page, call `onPageChange(issue.page)`
  so the PDF navigates to that page and the circle becomes visible

### 5. Issue Card DOM IDs

Add `id={`issue-card-${issue.id}`}` to each issue card wrapper so `scrollIntoView` can target it.

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/PdfAuditResultsPage.tsx` | Compute `issueNumberMap`, wire `onIssueSelect` to scroll right panel, wire issue card click to `onPageChange` |
| `src/components/pdf/PdfPreviewPanel.tsx` | Accept `issueNumberMap` prop, use global number in overlay circle |
| `src/components/remediation/IssueCard.tsx` | Add `#N` badge, add `id` attribute to card wrapper |

---

## What Does NOT Change

- Filter state — numbers stay the same regardless of active filter
- Sort order of the right panel — independent of global numbering
- Existing `selectedIssueId` state management
- Any backend code
