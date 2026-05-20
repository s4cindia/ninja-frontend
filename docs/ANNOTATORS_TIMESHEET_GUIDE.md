# Annotator Timesheet Guide

This guide explains what you need to do to ensure the hours you worked on each title are recorded correctly in Ninja. Accurate timesheet data matters because it is used to verify invoices and track project costs — gaps between recorded time and actual effort cause billing disputes.

> **Also read:** [Annotator's Guide](ANNOTATORS_GUIDE.md) for the broader annotation workflow.

---

## Why your timesheet entries matter

Ninja can only see what happens inside its own workspace. Time spent reading a source PDF in another program, comparing extractions manually, or doing any prep work outside Ninja is **invisible to the platform** unless you tell it.

The result is a gap: Ninja might record 8 hours for a title, but your actual effort was 12 hours. That gap causes invoice disputes and means S4Carlisle cannot accurately report costs to clients.

You fix this in two ways:

1. **Let Ninja record your in-tool time correctly** — by managing your sessions properly.
2. **Tell Ninja about off-tool time** — by entering it at Mark Complete.

---

## Part 1 — What Ninja records automatically

Ninja tracks time through **annotation sessions**: every time you open a title in Zone Review, a session starts. Every time you close the tab, navigate away, or the session times out, it ends. The **active minutes** (time you were actually clicking, reviewing zones, and making decisions) are summed up for each title.

This is the time shown in the Timesheet under **Active hrs**.

**What Ninja does NOT track:**
- Time spent in a PDF viewer checking the source document
- Time in spreadsheets, email, or any program other than Ninja
- Time discussing the title with a colleague
- Time thinking with the Ninja tab open but idle for a long time

---

## Part 2 — Managing your Ninja sessions (what you must do)

### Do: Open Zone Review only when you are ready to work

The session starts the moment you open a title. Do not open it "just to look" and then switch away for an hour — that idle time inflates your wall-clock time but does not count as active time, and it also means the session is running during a period you weren't actually working.

### Do: Close or navigate away when you stop working

When you take a break, switch to source verification in another program, or stop for the day:
- Close the Zone Review tab, **or**
- Navigate away from the page.

This ends the session cleanly. The recorded time stops accumulating.

### Do: Refresh if the page seems stuck

If the zone list has not loaded after a minute, or the page is unresponsive, refresh rather than leaving it sitting. A hung page wastes session time.

### Do not: Leave Zone Review open on a screen you are not using

A colleague walking past and accidentally clicking something, or the page auto-refreshing, can log spurious session time. Close the tab when you are done.

---

## Part 3 — Mark Complete: the single most important step

**Mark Complete is the close-out action for a title.** Without it:
- The title stays as "In Progress" on the Status Tracker forever.
- Your hours may not appear in the Timesheet for some reporting periods.
- Off-platform time (see Part 4) cannot be recorded.

### When to click Mark Complete

Click Mark Complete when you have finished reviewing every page of a title and would not change anything if you went through it again. This includes pages where you agreed with every AI decision and touched nothing — those pages still count as reviewed.

### How to open Mark Complete

In the Zone Review toolbar, click the **Mark Complete** button. A modal opens.

### What to fill in the modal

The modal has four sections:

**1. Pages reviewed** (required)
This pre-fills with the document's total page count, which is correct for the common case — you reviewed every page. Only adjust it downward if you genuinely stopped part-way through (for example, you completed pages 1–200 of a 400-page title and need to hand the rest to a colleague).

**2. Off-platform hours** (optional — see Part 4)
This is where you enter time spent outside Ninja on this title. Leave it blank if everything happened inside the platform.

**3. Issues encountered** (optional)
Log any structural problems you found: page alignment mismatches, single-extractor coverage, content divergence, etc. These feed into the corpus lineage report. Leave empty if there were none. Only mark an issue as "Blocking" if the title genuinely cannot be considered done.

**4. Additional notes** (optional)
Anything else worth capturing alongside the analysis report. Maximum 2,000 characters.

Click **Mark Complete & Generate Report**. The page will pause briefly while the AI generates the analysis report, then you will see a green confirmation banner.

---

## Part 4 — Recording off-platform hours (new)

The "Off-platform hrs" field in the Mark Complete modal is where you log time spent on this title **outside Ninja**. Examples of what counts:

| What you were doing | Counts? |
|---|---|
| Verifying the source PDF in Acrobat | ✅ Yes |
| Comparing Docling vs PDFxt outputs in a spreadsheet | ✅ Yes |
| Manual page counting against the print PDF | ✅ Yes |
| Discussing a difficult zone with a colleague | ✅ Yes |
| Zone Review in Ninja | ❌ No — Ninja already records this |
| Breaks, lunch, personal time | ❌ No |

### How to enter it

In the Mark Complete modal, find the **Off-platform hrs** box. Enter a decimal number representing the total hours of off-platform work for this title across all your sessions on it.

**Format:** decimal hours, to two decimal places. Quarter-hour increments are fine but not required.

| Time worked | What to enter |
|---|---|
| 30 minutes | `0.5` |
| 1 hour 15 minutes | `1.25` |
| 4 hours 10 minutes | `4.17` |
| None | Leave blank |

### Example

Your total effort on *Schnitt_ATI_Pricing_Figures.pdf* (672 pages):
- 8 hours in Zone Review (Ninja recorded this automatically)
- 4 hours verifying the source PDF in Acrobat
- 10 minutes comparing extraction counts in a spreadsheet

At Mark Complete, you would enter `4.17` in Off-platform hrs. The Timesheet would then show **8h active + 4.17h off-platform = 12.17h total effort** for this title — matching your invoice.

---

## Part 5 — Frequently asked questions

**Q: I forgot to enter off-platform hours when I clicked Mark Complete. Can I fix it?**
A: Yes — clicking Mark Complete again re-runs it with the updated values. The latest run's `pagesReviewed` and `offPlatformHours` override the previous ones. Enter the corrected values and submit again. Note: the analysis report regenerates each time, so do not do this unnecessarily.

**Q: The Timesheet shows less than the hours I worked. What should I check?**
A: First check whether the run has been marked complete. Open Corpus Summary → Status Tracker and find your title. If it shows "In Progress", Mark Complete was not clicked. If it shows "Complete", open the Timesheet with the correct date range — the hours are there, just filter to the right period.

**Q: What date range should I use on the Timesheet?**
A: The Timesheet now filters on **session activity date** — the dates you actually worked, not the date you clicked Mark Complete. Use the calendar range that matches your working period (for example, a billing week).

**Q: The Timesheet shows 0 runs for my date range.**
A: Either no annotation sessions were logged in that period, or the sessions were on different dates than the range you set. Try widening the range to "Last 90 days" to find when your sessions were actually recorded.

**Q: How do I know how many hours Ninja recorded for me on a title?**
A: Corpus Summary → Timesheet → set the date range → look at the "Per title" table. Your title appears there with Active hrs, Off-platform hrs, and Cost.

**Q: Should off-platform hours include time I spent on calls about the title?**
A: Yes, if the call was substantive work on the title (e.g. a QA discussion about a specific zone decision). No, if it was a general project check-in. Use your judgement and document the reason in the Mark Complete notes if it is a large amount.

**Q: My title is not showing in the Timesheet at all.**
A: The title must have had at least one annotation session in the date range AND must exist in the corpus. Check Corpus Summary → Status Tracker to confirm the title is listed. If it is not there, contact the calibration lead.

---

## Quick reference

| Action | When |
|---|---|
| Open Zone Review | When you are ready to start annotating — not just to browse |
| Close / navigate away | Every time you stop working on a title, even briefly |
| Click Mark Complete | When a title is fully reviewed — every page, including implicit accepts |
| Enter Pages reviewed | Total page count unless you genuinely stopped part-way |
| Enter Off-platform hrs | Decimal hours for all work done outside Ninja on this title |
| Enter Issues | Only structural problems that affect the corpus lineage report |

---

*Questions or corrections to this guide? Contact the calibration team or edit `docs/ANNOTATORS_TIMESHEET_GUIDE.md` and open a PR.*
