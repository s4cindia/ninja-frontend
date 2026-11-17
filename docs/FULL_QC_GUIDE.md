# Full QC — Page-by-Page Structure Tag Review

**This is the reference for Full QC: a page-by-page tool for inspecting and correcting structure tags directly in a live job.** It assumes you're already familiar with the main audit/remediation workflow — see the **Operator Guide** for that. This guide covers the one surface built for the opposite case from everything else in that workflow: where a person's judgment is genuinely the right mechanism, not a gap waiting to be automated away.

---

## Table of Contents

- [Part 1 — What It Is](#part-1--what-it-is)
- [Part 2 — Turning It On](#part-2--turning-it-on)
- [Part 3 — Where to Find It](#part-3--where-to-find-it)
- [Part 4 — What You'll See](#part-4--what-youll-see)
- [Part 5 — Recommended Workflow](#part-5--recommended-workflow)
- [Part 6 — Flagging a Note](#part-6--flagging-a-note)
- [Part 7 — Try It Yourself: A Quick Verification Pass](#part-7--try-it-yourself-a-quick-verification-pass)
- [Part 8 — Known Limits Today](#part-8--known-limits-today)

---

## Part 1 — What It Is

Every other accessibility fix on the platform runs unattended: detect, draft, apply, re-audit. Full QC is the one feature built for the opposite case.

It walks the job's live `/StructTreeRoot` and shows **every** structure element on a page — not just ones an audit issue already flagged — as a clickable, color-coded box over the real PDF page. Pick an element, pick a new tag from the full PDF/UA vocabulary, and the fix writes straight into the remediated file. No batch, no re-audit required to see it land.

It's the right tool for exactly the category of finding that automated remediation can't safely close on its own: a heading tagged one level off, content wrongly captured inside the tag tree, an ambiguous reading-order nesting call — the kind of thing a careful manual QC pass catches that the automated validators can describe but can't confidently fix by themselves.

---

## Part 2 — Turning It On

Full QC is gated behind a toggle — it's off by default, so you won't see it until it's enabled.

**Tenant default** (affects every job going forward): an Admin turns it on from **Workflow Settings** (sidebar → Tools → Workflow Settings), under the **Full QC** toggle in the PDF AI Remediation section. See the **Administrator Guide** for the full settings page reference.

**Per-file override** (affects just one upload, without changing the tenant default): check **"Full QC (page-by-page structure-tag review, for this file)"** on the PDF Accessibility upload screen before uploading.

**Per-job, after upload**: open the job's Audit Results page, click **Settings** on the toolbar, and set **Full QC** to On/Off/"Use tenant default" — this is editable any time, not just at upload.

---

## Part 3 — Where to Find It

Once it's on for a job, a small icon appears — easy to miss the first time, so here's exactly where to look: top-right of the **Issues panel** on the PDF Audit Results page, next to the fullscreen toggle. It has a tooltip ("Review structure tags — inspect and correct every structure tag on this page") but no text label. Click it to switch the center preview into tag-review mode.

---

## Part 4 — What You'll See

One outlined box per structure element, color-coded by tag family:

| Color | Tag family |
|---|---|
| Purple | H1–H6 |
| Blue | P / Span / Quote / BlockQuote |
| Teal | L / LI / Lbl / LBody |
| Orange | Table / TR / TH / TD / THead / TBody / TFoot |
| Green | Figure / Formula / Form |
| Yellow | Caption / Note / Reference / BibEntry / Code |
| Cyan | Link / Annot / TOC / TOCI |
| Gray | Artifact / NonStruct / Private |

Click a box, and a detail strip appears below the PDF showing the element's current tag, a short snippet of its bound content, and a **"Change to:"** dropdown covering the full standard vocabulary — every legal PDF/UA structure type, not a narrowed subset: `Document, Part, Art, Sect, Div, BlockQuote, Caption, TOC, TOCI, Index, P, H1–H6, L, LI, Table, TR, TH, TD, Span, Quote, Figure, Link, Artifact`, and more.

---

## Part 5 — Recommended Workflow

1. **Find it once, fix it once.** When your pass turns up a mistagged element, correct it right here instead of only noting it elsewhere.
2. **Click the element.** The detail panel shows its current tag and a text snippet of its bound content.
3. **Pick the correct tag.** The change writes to the remediated file immediately — no apply step, no waiting for a dev cycle.
4. **Keep going page by page.** Use the fullscreen toggle for a sustained pass; Prev/Next on the page navigator stays visible throughout.
5. **Re-audit when you're done.** The existing "Re-run Audit" action confirms your corrections landed cleanly — there's no automatic re-audit after each individual tag change.

---

## Part 6 — Flagging a Note

Not every finding has a right-click fix — a borderline call, a pattern worth revisiting, something to raise with the team before it's resolved one way or the other. The same detail panel has a second action for exactly that.

Next to the **Change to:** dropdown is a **Flag** button. Click it and the "Send Feedback" form opens, already carrying the page number and the element you had selected (type pre-set to "Full QC Review Note") — add your comment and an optional severity, then submit.

Every note filed this way is real and persisted, not a scratch comment: it shows up immediately in a new **QC Notes** list — a second small icon next to "Review structure tags" — scoped to this job, showing the page, the element, your comment, severity, status, who filed it, and when.

From the QC Notes list, **Download as Excel** exports the full list as a spreadsheet (columns: Page, Element, Severity, Comment, Status, Submitted By, Date) — for your own records, or to carry alongside the file for whoever receives it next.

---

## Part 7 — Try It Yourself: A Quick Verification Pass

A short run-through to confirm Full QC, Flag, and QC Notes are all working on a given job before you rely on them for a real review.

1. **Confirm Full QC is on.** Open the job's Audit Results page. The "Review structure tags" icon should be visible in the Issues panel header (Part 3). If it's missing, Full QC isn't effective for this job yet — check Part 2.
2. **Enter review mode and select an element.** Click the icon, then click any outlined box on the page. The detail strip appears with the current tag, the "Change to:" dropdown, and the **Flag** button.
3. **File a note.** Click Flag. Confirm the form opens with "Full QC Review Note" pre-selected and a message already mentioning the right tag and page number. Add a comment, optionally set a severity, and submit.
4. **Confirm it landed.** Click the QC Notes icon. Your note should appear with the correct page, element, comment, and timestamp — close and reopen the panel to confirm it's a saved record, not local state.
5. **Export it.** Click Download as Excel from the QC Notes list. Confirm a spreadsheet downloads with the right columns and your note is in it.
6. **Confirm the gating.** Open a job where Full QC is off. Neither "Review structure tags" nor "QC Notes" should appear at all.

---

## Part 8 — Known Limits Today

- No text search across the document yet — you locate an element visually, by page, not by typing a phrase.
- No "reviewed" checkpoint yet — a long document's pass is easiest to do in one sitting for now. Flagging a note (Part 6) tracks individual items, but not which pages you've already been through.
- A genuinely single-line paragraph's box can render as a thin sliver rather than a full rectangle — the label above it is always there to click even when the box itself is small.
- No automatic re-audit after each individual tag change (Part 5, step 5) — a page-by-page pass may do dozens of edits, and re-auditing per click would be slow and noisy. Run the existing Re-run Audit action once you're done with a page or the document.
