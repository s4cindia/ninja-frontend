# Annotator's Guide — Calibration Workflow

This guide is the operational reference for annotators working on the Ninja calibration platform. It covers the day-to-day mechanics: how to close out a title, what each status on the tracker means, when to use a manual override, and how to read the corpus-level reports.

> **Last updated:** May 2026 (covers everything through backend PR `#355` and frontend PRs `#251`–`#260`). Skim "What changed recently" first if you've been away for more than a week.

---

## What changed recently

The platform got several updates in early May 2026 that affect daily work:

| Change | What it means for you |
|---|---|
| **Mark Complete now drives the Status Tracker.** The "pages reviewed" number you enter when you click Mark Complete is the authoritative page count. | If you finish a title but skip Mark Complete, it stays at "In Progress" forever. Always run Mark Complete when a title is done. |
| **Status Tracker tab** on Corpus Summary shows every title with a derived status (Not Started / In Progress / Pending Review / Complete / Blocked). | Use it as your one-page worklist. Filter by status or annotator. |
| **Manual override** lets you force a status when the derived value is wrong (e.g. you finished but Mark Complete wasn't an option). | Use sparingly — almost every override added before this week can now be cleared because the derivation has been fixed. |
| **Word export** of the Corpus Summary report. Branded `.doc` file with the S4Carlisle/Ninja header, suitable for sharing externally. | "Export Word" button next to Refresh on the Summary tab. |
| **Empty-pages triage** moved into the zone-review workspace. | The "Empty Pages" chip on the toolbar opens a sidebar to categorize blank/non-content pages without leaving the page you're on. |
| **Corpus Summary table rendering** was fixed (markdown tables now wrap correctly; Word export tables and logos stay within page margins). | If a previous Word export looked wrong, re-export. |

---

## 1. The workflow at a glance

```text
  Upload PDF                                Click "Mark Complete"
  ──────────►  Run calibration  ──►  Annotate zones page-by-page  ──────────►  Status: COMPLETE
                                          ▲                                    on Status Tracker
                                          │
                                  (correct AI labels,
                                   handle empty pages,
                                   add notes as needed)
```

The single most important rule: **Mark Complete is the close-out action**. Without it, your work is invisible to the Status Tracker, the Corpus Summary report, and the calibration team's billing/throughput numbers.

---

## 2. Closing out a title — Mark Complete

### When to click it

Click **Mark Complete** in the Zone Review toolbar when you've finished reviewing every page of a title and you wouldn't change anything if you went through it again. "Finished reviewing" includes pages where you implicitly accepted every AI decision — those count as reviewed even though you didn't touch any zone.

### What you'll fill in

The Mark Complete modal has three sections:

1. **Pages reviewed** (required, integer ≥ 1).  
   The modal pre-fills this with the count of pages where you actually corrected at least one zone — *not* the document's total page count. **You almost always need to raise this number** to reflect every page you reviewed, including pages where you implicitly accepted every AI decision (and so didn't touch any zone). For most titles, the right value is the document's total page count minus any pages categorized as Empty Pages or genuinely out-of-scope. Only leave it lower than that if you really did stop part-way through.

2. **Issues encountered** (optional, repeatable).  
   Pick a category from the dropdown for any structural problem you ran into (page-alignment mismatch, single-extractor coverage, content divergence, etc.). The category list mirrors the patterns the calibration team rolls up into the corpus lineage report. **Mark an issue as "Blocking" only if the title cannot be considered done because of it.** Use the description field to add specific page numbers or workarounds.

3. **Additional notes** (optional, free text, ≤ 2000 chars).  
   Anything else worth capturing. Goes into the analysis report alongside the issues.

Click **Mark Complete & Generate Report**. The page will sit briefly while the AI generates the analysis report, then you'll see a green banner.

### What happens behind the scenes

- The run's `pagesReviewed` field is set to the value you entered.
- Any issues you logged are stored as `CalibrationRunIssue` rows.
- The AI annotation analysis report is generated and stored on the run.
- The Status Tracker recomputes the title's derived status the next time it's loaded — almost always to "Complete" for the title you just finished.

### Common Mark Complete mistakes

- **"Pages reviewed" left at total page count when you actually only did a fragment.** Be honest — the number drives downstream reporting.
- **Logging every cosmetic AI mislabel as an "issue".** Issues are for *structural* problems. Don't pollute the lineage rollup with one-off label corrections — those are already captured per-zone.
- **Forgetting to click Mark Complete entirely.** Most-common cause of "why is this title still showing In Progress?" The fix is: open the title in Zone Review, click Mark Complete with the correct page count.

---

## 3. The Status Tracker tab

Find it under **Corpus Summary → Status Tracker** (the rightmost tab).

### What each status means

| Status | Derivation rule | Action |
|---|---|---|
| **Not Started** | No calibration runs exist for this title, or `pagesReviewed = 0` on the latest run. | Pick it up if it's assigned to you. |
| **In Progress** | A run exists but `pagesReviewed < pageCount` on the most recent completed run, *or* no run has been Mark Completed yet. | Keep annotating, then Mark Complete. |
| **Pending Review** | Set by manual override. Used when the title is annotator-done but waiting on QA or a senior reviewer. | QA team takes it from here. |
| **Complete** | `pagesReviewed >= pageCount` on the most recent completed run. | Done — no further action. |
| **Blocked** | Set by manual override. Used when an external dependency prevents completion (extractor failure, source PDF defect, etc.). | The status note explains what's blocking; engineering or the source-document team unblocks. |

The status pill colour-codes the value: green for Complete, blue for Pending Review, amber for In Progress, grey for Not Started, red for Blocked.

### Columns

- **Title** — the document filename.
- **Pages** — `pagesAnnotated / pageCount`. The numerator is `pagesReviewed` from your latest Mark Complete; if you haven't Mark-Completed yet, it falls back to the count of pages where you've actually corrected zones.
- **Status** — derived (per the table above) or override (shown with a small dot).
- **Primary annotator** — the person who corrected the most zones on the title. "+N others" appears if more than one person worked on it.
- **Hours** — sum of active session time across all runs for the title.
- **Last updated** — most recent zone edit, status override, or Mark Complete event.
- **Status note** — free-text override note (only shown when an override is set).

### Filters and search

- **Status** dropdown filters to a single status (or All).
- **Annotator** dropdown filters to titles where someone is the primary annotator.
- **Search** matches anywhere in the filename, case-insensitive.

### Export to CSV

Click **Download CSV** to get a row-per-title spreadsheet with the same columns. The CSV neutralizes any leading `=` / `+` / `-` / `@` characters in titles or notes (formula-injection guard) and uses RFC-4180 quoting, so it imports cleanly into Excel and Sheets.

---

## 4. Manual overrides

### When to override

Override the derived status when the derivation is genuinely wrong for an *operational* reason, not when you can fix the underlying data:

- **Use override** when the title is parked behind a real-world blocker (broken extractor, legal hold, source PDF issue you can't fix yourself). Pick `Blocked` and write a one-sentence status note explaining the dependency.
- **Use override** when you need to flag a title for QA review before it goes to "Complete." Pick `Pending Review`.
- **Don't override** just because the derivation says "In Progress" and you think the title is done. The fix is to **click Mark Complete** with the correct page count — that's a permanent, audit-trail-friendly resolution. An override on top of an unfinished Mark Complete creates a discrepancy between two systems of record.

### How to set one

The override and the note are saved as two separate actions — there is no combined form with a Save button:

1. **Set the status.** Click the status pill on the title's row in the Status Tracker and pick a new status from the dropdown. It saves immediately (optimistically); a small spinner on the row shows while the request is in flight.
2. **Add a note (recommended for every override, required for `Blocked`).** Click into the **Notes** cell on the same row, type a short explanation (max 500 chars), and either click outside the cell or press **Ctrl+Enter** to save. The note saves the moment the cell loses focus.

The override and any note stay in place across refreshes and are visible in the CSV export.

### How to clear one

Click the status pill on the row and pick **Clear override** from the dropdown. The status reverts to whatever the derivation produces (usually Complete now that Mark Complete drives the count). Clearing the override does not erase the note — clear the Notes cell separately if it's no longer relevant.

### Note about pre-May 2026 overrides

Many existing overrides were set as workarounds when the Status Tracker derivation was wrong. Once backend PR `#355` is deployed to your environment, most of those overrides can be cleared safely — the derived value will be correct. Walk down the list and clear any override on a title where the underlying Mark Complete data is current. **Leave overrides in place for genuinely blocked titles.** If you're unsure whether the fix is live, check the Status Tracker for any title you know is finished — if it shows `Complete` without an override, the fix is live.

---

## 5. The Corpus Summary report

Navigate to **Corpus Summary → Summary Report** (the leftmost tab). The page generates an AI-written narrative about the corpus as a whole: overall scope, AI confidence distribution, common correction patterns, and per-title call-outs.

### When to read it

- **Weekly review.** Skim it at the start of the week to see what's changed across the corpus.
- **Before a stakeholder demo or report.** It's the canonical written summary, suitable for forwarding.
- **When investigating an outlier.** The per-title section will flag titles where the AI struggled or the corrections diverged from the corpus norm.

### Refresh and re-generation

The report is cached. Click **Refresh** to invalidate caches and regenerate. Generation takes 30–90 seconds depending on corpus size; the Summary tab shows "Generating corpus summary..." while it runs.

### The other tabs on this page

- **Lineage** — title-by-title trace of which extractor / model / annotator handled each step. Read-only.
- **Timesheet** — hours spent per annotator per title, with a date-range filter. The filter applies to the Timesheet, Lineage, and Status Tracker (where applicable) — but **does not** apply to the Summary or Cost tabs, which are corpus-wide.
- **Cost Summary** — per-title and corpus-total cost breakdown (AI annotation, AI report, annotator hours).
- **Status Tracker** — described in section 3 above.

---

## 6. Word export

On the **Summary Report** tab, the **Export Word** button (next to Refresh) downloads a self-contained `.doc` file with:

- S4Carlisle and Ninja branded header logos and a teal divider.
- Title, generated timestamp, and AI model name.
- The full sanitized report body (headings, paragraphs, tables, lists).
- Word footer with page numbers (auto-rendered on each page).
- Filename: `corpus-summary-YYYY-MM-DD.doc`.

The `.doc` is fully self-contained — logos are embedded as base64 data URIs, so it opens cleanly off-network and on machines without access to the staging environment. It opens in both Microsoft Word and Google Docs.

### When to use it

- Sharing the corpus summary with stakeholders who don't have access to the staging UI.
- Archiving a point-in-time snapshot of the report (the report regenerates over time as the corpus grows).
- Pasting the formatted report into a slide deck or wiki.

### Known caveats

- **Hard refresh first if you just had a deploy.** The Export Word button uses the JavaScript bundle the browser has cached. If you exported five minutes ago and the styling looked off, the deploy that fixed it landed in the meantime — `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (macOS) to pull the new bundle, then re-export.
- The export uses the *currently displayed* report. If you regenerated the report 10 seconds ago and clicked Export Word, you'll get the new content.

---

## 7. Empty-pages triage

Some pages in a PDF are intentionally blank, decorative, or non-content (chapter dividers, images-only pages, copyright pages). The platform now flags these so they can be categorized in bulk rather than zone-by-zone.

### Where to find it

- **Document Queue** shows an "Empty pages" chip per document with the count of detected blank/near-blank pages.
- **Inside Zone Review**, the toolbar has an **Empty Pages** chip that opens a sidebar listing every detected page.

### What to do in the sidebar

For each page, pick a category:

- **Blank** — truly empty page (e.g., even-numbered chapter end).
- **Decorative / non-content** — a divider, ornamental flourish, or non-substantive image.
- **Front matter / back matter** — title page, dedication, colophon, index page that doesn't need annotation.
- **Other** — anything else; add a short note.

The categorization is saved per-page and rolls up into the lineage report. Empty pages **do not** count toward the page total for completion — they are excluded from the `pageCount` denominator the Status Tracker uses, so they will not block a title from showing "Complete."

---

## 8. FAQ

**Q: I clicked Mark Complete but the Status Tracker still shows "In Progress."**  
A: First, hit Refresh on the Status Tracker. The derivation is recomputed each load but the React Query cache may need invalidation. If still wrong: open the title in Zone Review, check the page count you entered in Mark Complete (it might be lower than the document's `pageCount`), and re-Mark Complete with the correct value.

**Q: What if I Mark Complete with the wrong page count?**  
A: Click Mark Complete again. The latest completed run wins, so re-running it overwrites the previous value. Note: the analysis report regenerates each time, so don't do this casually.

**Q: A title is showing "Complete" but I know it's not done.**  
A: Someone Mark-Completed it with too high a page count, or applied a manual override. Check the Status Tracker row for the override dot and the status note. Talk to the primary annotator before changing anything — there may be a reason.

**Q: Why isn't my work showing up in the "Hours" column?**  
A: Hours come from `AnnotationSession.activeMs`, which is only logged while you have a Zone Review tab actively open and interacting. Background tabs and idle sessions don't count.

**Q: The Word export looks broken (logo overflowing, table off the page).**  
A: Hard refresh the browser (`Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (macOS)) to pick up the latest bundle, then re-export. The 2026-05-08 fix tightened the logo sizing and made tables wrap properly. If it's still wrong after a hard refresh, file a bug with a screenshot and the downloaded `.doc`.

**Q: My override won't save — the dropdown closes but the row doesn't change.**  
A: Open the browser DevTools network tab and watch for a failed `PUT /admin/corpus/documents/.../status`. Most likely a 401 (your session expired — refresh the page and log in again) or a 403 (you don't have admin-corpus scope — talk to the calibration lead). The optimistic UI rolls back on failure but the error toast may have been dismissed.

**Q: Two annotators worked on the same title. Who shows as the Primary annotator?**  
A: Whoever corrected the most zones (where `operatorVerified = true` and `verifiedBy` is set to a real user, not the system "auto-annotation" id). The other contributors appear as "+N others" in the Annotator column.

---

## Reference: status decision tree

```text
                                  Title work
                                      │
                          ┌───────────┴───────────┐
                          │                       │
                  Mark Complete clicked?   ─────  No  ──►  Status: NOT_STARTED or IN_PROGRESS
                          │                                (depending on whether any zone work exists)
                         Yes
                          │
                          ▼
              pagesReviewed ≥ pageCount?
                          │
                  ┌───────┴───────┐
                  │               │
                 Yes              No
                  │               │
                  ▼               ▼
            COMPLETE        IN_PROGRESS
                                  │
                                  └──► (annotator should re-Mark Complete with the full page count
                                        once the rest is done)

  Manual override (any of the above) → overrides the derived value entirely.
```

---

*Questions or corrections to this guide? Edit `docs/ANNOTATORS_GUIDE.md` and open a PR — or ping the calibration team in #ninja-calibration on Slack.*
