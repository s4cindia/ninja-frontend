# Ninja Platform User Guide — Admin, Operator & QC

**The comprehensive, cross-role reference for the Ninja PDF accessibility platform -- covering Admin, Operator, and QC (Team Leader) functionality end to end, from job assignment through final delivery.** For a narrower, role-specific quick reference, see the Operator Guide, Team Leader Guide, Administrator Guide, or Full QC Guide; this document is the fuller picture across all four, in one place.

This guide covers the Ninja PDF accessibility platform's full workflow -- from job assignment through final delivery -- for the three roles that run it day to day: **Admin**, **Operator**, and **QC** (the Team Leader's review function). Each section documents what that role can actually do, backed by the platform's real permission checks.

## Core Concepts and Glossary

Read this once before anything else -- these terms appear throughout the rest of the guide.

- **Matterhorn Protocol** -- a formal, checkpoint-by-checkpoint interpretation of the PDF/UA standard: 31 checkpoints, 137 conditions in Ninja's own implementation. The rulebook both Ninja's validators and the real PAC Desktop tool check a document against.
- **PDF/UA** -- "PDF Universal Accessibility," the ISO standard (ISO 14289-1) for accessible PDFs. "Compliant" means a document passes every machine-checkable Matterhorn condition.
- **WCAG** -- Web Content Accessibility Guidelines. Some findings are WCAG-style (broader than strict Matterhorn) and shown alongside Matterhorn findings.
- **PAC (PDF Accessibility Checker)** -- the real, independent third-party tool (by axes4) that checks PDF/UA compliance. Ninja has its own free, instant **simulated** version (the "Ninja Report"), plus the option to run the **real** axes4 engine, either live from inside Ninja (if the tenant has paid access) or by running the actual PAC Desktop application yourself and uploading its report.
- **ACR / VPAT** -- Accessibility Conformance Report, the formal document handed to a customer or compliance team describing how well a document conforms to a named standard.
- **Accessibility Score** -- the single number shown top-right on the Audit Results page: severity- and page-density-weighted, not a flat issue count.
- **Auto-tagged badge** -- shown when a document arrived with no real structure tags and Ninja's own Seam-C (YOLO-model) pipeline built the structure tree from scratch, instead of "Already tagged" (e.g. a clean InDesign export).
- **Apply modes** -- every AI suggestion carries one: **apply-to-pdf** (eligible to be written in automatically, after approval or immediately if auto-resolved), **guidance-only** (drafted, never auto-applies -- a human acts outside Ninja and verifies), **auto-resolve** (a small set of deterministic, confidence-1.0 fixes that apply immediately with no approval step), or **disabled** (not attempted at all for this tenant/run).
- **Confidence tiers** -- every AI-drafted suggestion shows a confidence percentage: High (90%+), Medium (70-89%), Low (under 70%). A low-confidence suggestion still shows up, visibly badged, rather than being hidden.
- **Auto Mode vs. manual** -- Auto Mode ("Start Auto Remediation") runs its own loop -- analyze, auto-approve, apply, re-audit -- repeatedly with no click in between rounds. Everything else (Re-run AI Analysis, Apply Fixes, Re-run Audit) is a manual, single-shot action.
- **The 5-phase stepper** -- a horizontal progress indicator on the Audit Results page: Audit -> AI Analysis -> Remediation -> Verification -> Compliance. A coarse, at-a-glance summary; the Guided Remediation Checklist is the detailed version of the same journey.
- **Remediation cycle lock** -- only one remediation action (a manual Apply, a bulk Apply, an Auto Mode round, a manual-fix re-audit upload) can run on a given job at a time. A greyed-out control naming who/what holds the lock means exactly that -- wait for it to clear.

## Navigating the Platform

The sidebar is the map of the whole platform:

| Sidebar item | What it's for |
| --- | --- |
| Dashboard | Account-level landing page |
| Products | The list of products your account has access to |
| Jobs | Every processing run against every document, across every product |
| Files | The document library itself -- raw uploads, independent of any one job |
| My Team | Team membership, review assignments, and (for Team Leaders) your team's activity view |
| Accessibility section | EPUB Accessibility, **PDF Accessibility** (this guide's main subject), ACR Workflow, Alt-Text Generator |
| Editorial section | Editorial Services, Style Rules -- a separate product line, not covered here |
| Tools section | Remediation, Batch Processing, Feedback |
| Admin section **(admin role only)** | Operational Reports and tenant-wide settings |

Where you'll spend almost all your time as an Operator: upload through **PDF Accessibility**, then do essentially everything on the Audit Results page it takes you to. Jobs and Files are where you go to find a document again later, or manage the raw file library.

## Contents

- Core Concepts and Glossary
- Navigating the Platform
- Roles and Permissions
- The Jobs Page and the Files Page
- The Job Lifecycle at a Glance
- Stage 1: Upload and Job Assignment
- Stage 2: Initial Audit
- Stage 3: AI Analysis and Suggestion Review
- Stage 4: Remediation
- Stage 5: QC and Team Review
- Stage 6: Re-Audit and Verification
- Stage 7: ACR and Compliance Reporting
- Stage 8: Final Delivery
- The PDF Remediation Plan Page
- Structure Tag Review (Full QC)
- Feedback and Defect Reporting
- Batch Processing
- Comparison Study
- Admin: Tenant Configuration Reference
- Admin: User and Team Management
- Admin: Operational Reports
- Admin: Corpus Management
- Notifications
- Role Quick-Reference Matrix
- Known Gaps and Notes

## Roles and Permissions

Ninja has two separate role systems. They're checked independently, and a person's standing in one doesn't imply anything about the other.

### Platform role (`UserRole`)

| Role | What it's for |
| --- | --- |
| **ADMIN** | Tenant-wide administrative access: user management, team management, tenant-level AI remediation defaults, operational reports. Also bypasses per-job ownership checks -- an Admin can open, review, and act on any job in the tenant. |
| **OPERATOR** | The standard day-to-day role: upload files, run audits, review AI suggestions, trigger remediation, download results. Most people doing the hands-on remediation work hold this role. |
| **USER** | A generic authenticated account with no special platform privileges beyond owning its own jobs. |
| **VIEWER** | Read-only platform access. |

### Team role (`TeamRole`)

Separate from the platform role above, and specifically about **oversight of production work** within a team:

| Role | What it's for |
| --- | --- |
| **EXECUTIVE** | A team member whose jobs can be assigned to them by their Team Leader, and whose work a Team Leader can review. |
| **TEAM_LEADER** | This guide's "QC" role. Can assign jobs to an Executive on their team, view any of that team's jobs, and -- critically -- record a Team Review ("OK" or "Needs Correction") on a job they don't own. See Stage 5: QC and Team Review. |
| **VIEWER** (team-scoped) | Read-only access to a team's jobs, via the same `allowTeamReview` mechanism Team Leaders use to see jobs they don't own. |

**There is no role literally called "QC" in the system.** Throughout this guide, "QC" means a **Team Leader acting through the Team Review feature** -- the platform's actual mechanism for an independent quality check on a job before it ships.

### How job access is actually gated

Every job belongs to exactly one owner. Three things can grant access beyond that:

1. **Exact ownership** -- the uploader, always.
2. **ADMIN bypass** -- tenant-wide, no exceptions.
3. **Team review access** (`allowTeamReview`) -- a Team Leader or Viewer teammate of the job's owner gets **read-only** access automatically. This is what lets a Team Leader open a job to review it without being handed ownership.

Mutating actions (uploading, approving suggestions, triggering remediation, downloading) always require ownership or the ADMIN bypass -- a Team Leader's automatic access is read/review access only, by design, so a QC reviewer can't accidentally change the thing they're supposed to be independently checking.

## The Jobs Page and the Files Page

### Jobs page

A **job** is one processing run against one document -- an audit, a citation scan, an editorial validation pass, etc. This page is a unified, cross-product list of every job on the account.

Five stat cards up top (Total / Queued / Processing / Completed / Failed), filter tabs by job type (All Jobs / EPUB Audit / Citation Management / PDF Audit / Validator, each with a live count), then a status dropdown (All Statuses / Queued / Processing / Completed / Failed / Cancelled) with a **Clear filters** button once any filter is active. The list auto-refreshes.

**Table columns**: File, Type, Status (colored badge), Progress (bar + % while Processing, 100% once Completed), Created (relative time), Actions.

| Status | Meaning |
| --- | --- |
| Queued | Accepted, waiting for a worker -- nothing happening yet |
| Processing | A worker is actively running it; Progress shows a live percentage |
| Completed | Finished successfully |
| Failed | Hit an unrecoverable error -- check the job's results page for why |
| Cancelled | An operator cancelled it before it finished |

**Actions**: **View** (every row) goes to the right results page for that job type. **Cancel** appears only while Queued/Processing. **Delete** permanently deletes the job and its data, with a confirmation dialog, available regardless of status. There is no bulk select/delete/audit on this page -- every action is per-row. Pagination is 10 jobs per page.

### Files page

A **file** is the uploaded document itself -- the source record a job gets created from. One file can have multiple jobs run against it over time: think "my documents" (Files) vs. "what's been run against my documents" (Jobs).

**Uploading here**: click Upload File, drag-and-drop or browse. This generic uploader accepts PDF, EPUB, DOCX up to 50MB, starting immediately on selection.

**For the actual PDF audit/remediation workflow, upload through the dedicated PDF Accessibility entry point instead (Stage 1) -- it supports much larger documents and is the path that takes you into the workflow this guide covers. Use the Files page for managing the document library, not for starting a PDF audit.**

**Table columns**: a select-all checkbox, File, Type, Size, Status (Uploaded / Processing / Processed / Error), Uploaded (date/time), Actions.

**Row actions**: **Run Audit** (green play icon) appears only for EPUB files that are Uploaded or Processed -- PDF and DOCX files never show this button here. **View** appears only once a file is Processed. **Delete** is always available and confirms first. Clicking anywhere else on a row opens the File Details modal (type, size, status, full upload timestamp, and the Latest Job ID if ever audited, with repeated action buttons).

**Bulk actions**: select one or more rows (or the header checkbox) and a bar slides up showing "N file(s) selected," Clear, **Run Audit (N)** (only enabled when every selected file is an EPUB in Uploaded/Processed status), and **Delete (N)** (reports how many succeeded/failed).

## The Job Lifecycle at a Glance

A job runs through nine stages from upload to delivery. Only one step branches: QC Review, where a Team Leader records **OK** (the job moves on to Re-Audit, ACR, PAC Report, and delivery) or **Needs Correction** (the job loops back to Remediation for another pass before QC sees it again). **PAC Report** is the external, third-party verification step: someone runs a PAC tool against the file outside Ninja and uploads its report to the job as independent evidence alongside Ninja's own ACR -- not required to deliver, but commonly attached for exactly the external QC handoff Stage 7 describes.

```
Upload -> Audit -> AI Review -> Remediate
                                    |
                                    v
                                QC Review
                               /          \
                         Rejected          OK
                            ^               |
                            |               v
                            |          Re-Audit -> ACR -> PAC Report -> Deliver
                            |
                            +---------- (back to Remediate)
```

A job runs through nine stages from upload to delivery. Only one step branches: QC Review, where a Team Leader records **OK** (the job moves on to Re-Audit, ACR, PAC Report, and delivery) or **Needs Correction** (the job loops back to Remediation for another pass before QC sees it again). **PAC Report** is the external, third-party verification step: someone runs a PAC tool against the file outside Ninja and uploads its report to the job as independent evidence alongside Ninja's own ACR -- not required to deliver, but commonly attached for exactly the external QC handoff Stage 7 describes.

## Stage 1: Upload and Job Assignment

Upload through the **PDF Accessibility** entry point in the sidebar (not the generic Files page -- see above). This single-card form shows:

- An **"Assign to"** dropdown, shown only if you hold a Team Leader membership on at least one team. Options: Myself (default) plus every Executive you lead, grouped by team name. Leave it unselected to upload for yourself -- nothing changes from the normal flow. Picking someone makes the resulting job theirs from the moment it's created: the initial audit kicks off exactly as always, they're notified immediately (in-app and email), and clicking that notification takes them straight to the Audit Results page whether the audit is still running or already done. There's no accept step and no pending-assignment state. A Team Leader can only assign to an Executive they actually lead -- there is no reassignment, no workload limit, and no batch version of this today (assigning several files to several people in one upload isn't supported); moving an already-assigned title to someone else is an Admin action.
- Three **opt-in** checkboxes (unchecked means "inherit the tenant default," not "force off"):
  - **Full Auto Mode** -- skips the manual "Start Auto Remediation" click; Auto Mode starts itself once the initial audit and AI analysis complete.
  - **Auto-escalate on stall** -- only matters when combined with Full Auto Mode, since otherwise an Operator is there afterward to set it from the Settings menu anyway.
  - **Full QC** -- makes the page-by-page "Review structure tags" mode available on this file's Audit Results page (see Structure Tag Review below).
- A file picker: drag-and-drop or click to browse, PDF only, up to 500MB on this upload path.

After picking a file, you'll see its name and size, a **Start Accessibility Audit** button, and an X to clear and start over. Once started, the page shows a live progress panel through three states -- **uploading** (byte/ETA stats), **queued** (a "taking longer than expected" warning appears after 30 seconds), and **processing** (a labeled percentage bar) -- before landing you on the Audit Results page. Navigation there happens as soon as the job record exists, not when the audit finishes, so a page refresh never loses your place.

This kicks off the **initial audit** automatically -- Ninja's own structure/content/contrast/table/link/bookmark validators run, followed immediately by the first **AI Analysis** pass using your tenant's current default settings (see Admin: Tenant Configuration Reference).

If the document arrives with no real structure tags at all, you'll see the **"Auto-tagged: Seam-C (YOLO)"** badge next to the file name -- Ninja built the structure tree from scratch. If it already had real tags (e.g. a clean InDesign export), you'll see **"Already tagged"** instead.

Either way, once a job exists, the Admin can open, review, and act on it regardless of who owns it -- the tenant-wide bypass that makes Admin the one role with no job-ownership restrictions at all.

## Stage 2: Initial Audit

The audit runs automatically on upload -- nobody triggers it by hand. It walks the document's structure tree, content streams, and metadata against PDF/UA and Matterhorn Protocol checkpoints, and produces a scored report. Results land on the **Audit Results page**, which is where you'll do almost everything for the rest of this job.

### The Audit Results page: layout

**Header**: file name, page count, file size, the Auto-tagged/Already-tagged badge, and the **Accessibility Score** card (color banded: 90+ green, 70+ yellow, 50+ orange, below that red).

**The 5-phase stepper**: Audit -> AI Analysis -> Remediation -> Verification -> Compliance. A quick-glance summary; the Guided Remediation Checklist (Stage 4) is the detailed, authoritative version of the same journey.

**Toolbar buttons**:

| Button | What it does |
| --- | --- |
| Create Remediation Plan | Opens the separate Remediation Plan page (see below), grouping every issue by fix mechanism. Disabled with zero issues. |
| Download Report | Downloads the full audit result as raw JSON, not a formatted document. |
| Download AI-Fixed PDF | Downloads the document as currently remediated. Only appears once a fix has been applied or a remediated file exists; disabled with a tooltip if blocked by QC review (Stage 5). |
| Share | Copies the current results page URL to your clipboard. |
| Re-run Audit | A full, from-scratch structural re-validation. Auto Mode already re-audits itself every round, so you don't need this during or right after a run -- use it after a manual, outside-the-flow change. |
| Re-run AI Analysis | One single analysis pass, with per-run checkboxes (Stage 3). |
| Start Auto Remediation | Opens the automated loop's own settings (Stage 4). |
| Settings (gear icon) | A small menu: two three-state overrides (Full Auto Mode, Auto-escalate on stall -- each "Use tenant default" / On / Off) and Generate ACR (Stage 7). |
| PAC Report | Opens the 3-tab compliance report modal (Stage 7). |
| Review structure tags | Only shown when Full QC is effective for this job -- toggles the page-by-page tag review overlay (see Structure Tag Review). |

**Pages panel** (left column): header shows total page count and, in red, total issues plus how many distinct pages they're on. Filter buttons -- All / With Issues / Critical (only one active at a time) -- and a "Jump to..." page-number box. Each page entry shows its number (plus any custom PDF page label), a colored issue-count badge sized to that page's highest severity present, and a hover tooltip with the full per-severity breakdown. Clicking a page entry updates the Preview panel but does not filter the Issues panel -- use that panel's own Page filter for that. Arrow keys and Home/End navigate pages anywhere focus isn't inside a text box.

**PDF Preview panel** (center column): a real rendered view of the page, not a placeholder. Toolbar: zoom out/in plus a dropdown (Fit Width, Fit Page, 50/75/100/125/150/200%), page prev/next with direct page entry, and an "Issues (N)" toggle that highlights every locatable issue on the current page with a red-bordered box and a small numbered severity-colored badge matching its position in the Issues panel. Clicking a box selects that issue everywhere (gold outline) and shows a small info strip below the page with severity, rule code, element path, and the full message. The bottom bar shows a per-page issue-category pill breakdown (Alt Text, Tables, Headings, Lists, Contrast, Links, Forms, Bookmarks, Language, Reading Order, PDF/UA, Other).

## Stage 3: AI Analysis and Suggestion Review

For every audit issue, Ninja generates a suggestion: what the fix would be, how confident the model is, and whether it's safe to apply automatically or needs a person to look first (see Apply modes and Confidence tiers in Core Concepts).

### The Issues panel

The right column of the Audit Results page. Header shows the filtered issue count, a full-screen toggle, the bulk **Apply Fixes (N)** button (only shown when at least one suggestion is eligible), and a Filters toggle.

**All Issues / Matterhorn-Related toggle**: All Issues is everything every validator found; Matterhorn-Related is only issues tied to formal Matterhorn Protocol codes and closely related families -- the subset mapping directly to PAC-style compliance.

**Category chips** (multi-select, combined as OR): Structure, Metadata, Language, Headings, Reading Order, Lists, Tables, Alt Text, Contrast, Links, Forms, Bookmarks, Formula -- each shows a live count, zero-count categories are hidden, and a Clear categories link appears once any are selected.

**AI action chips** (single-select, combined with categories as AND): **All / Fixable now / Guidance only / Applied / Rejected / Failed.** Fixable now means apply-to-pdf and still pending -- things you could Apply right now. Failed means it hit the retry cap and is now terminal.

**Filters panel**: free-text search, Severity (All/Critical/Serious/Moderate/Minor), WCAG criterion (All, or any criterion actually present in the document), and a page-number box. A Clear link appears whenever any filter is active.

### Reading an issue card

Every card shows its issue number (matching the Preview panel's badges), rule code, severity badge, a provenance badge (Ninja's own check vs. an external validator like veraPDF/pdfa11y), a clickable Matterhorn checkpoint badge where applicable, a clickable page-number badge, the plain-language message, and element path if known. If there's an AI suggestion, one of four distinct boxes appears below:

- **Manual Review Required** (amber) -- no auto-fix offered. For an alt-text issue specifically that needed a subject-matter expert, was blocked by a safety filter, or hit a generic failure, the box also shows AI-drafted **Short alt text** and **Long description** fields with their own Copy buttons -- a starting point to review and paste into Acrobat Pro yourself, never auto-applied.
- **AI Auto-Resolved** (green) -- already handled deterministically, informational only, no action buttons.
- **AI Guidance** (blue) -- confidence percentage plus guidance text, nothing to click.
- **AI Suggestion** (purple) -- apply-to-pdf, with a confidence badge (color banded: 90%+ green, 75%+ yellow, below that gray) and right-aligned controls depending on status: **Approve / Apply / Dismiss** while pending; a green "Applied" badge once applied; a gray italic "Dismissed" once rejected; or a red "Failed" badge with a **Retry** button and a "Why did this fail?" expandable link once it's exhausted its retry attempts and gone terminal. Alt-text suggestions specifically render their value in an **editable textarea**, so you can substitute a client's own wording before applying; every other suggestion type shows read-only text. All manual controls disable with a tooltip ("Auto Remediation is running") whenever an Auto Mode round is actively applying.

A footer note on the panel states that high-confidence issues (95%+) were already automatically remediated without requiring approval -- a separate, narrower auto-resolve path from Auto Mode itself.

### The Apply Failure Report

Appears as a button next to the Failed chip whenever Failed is greater than zero. Header reads "N suggestion(s) permanently failed to apply, in M group(s)." Groups are color-coded and sorted most-urgent-first:

- **Needs investigation** (red) -- doesn't match a known pattern yet, or is a known-but-genuinely-broken case. Worth a look.
- **Likely already resolved** (yellow) -- the thing this fix was looking for no longer matches current document state. Re-running AI Analysis typically clears this.
- **Correctly skipped** (gray) -- the fix found a genuinely ambiguous structure and declined rather than risk guessing wrong. Intentional and conservative, not a bug.

Click a group to expand it and see the plain-English explanation, the exact raw failure reason, and the affected issue IDs. A Copy report button copies the whole thing as text, e.g. to paste into a support ticket.

Only the job's owner or an Admin can approve, reject, or apply suggestions. A Team Leader reviewing someone else's job can see every suggestion and its state, but can't change any of them -- QC checks the work, it doesn't do the work.

## Stage 4: Remediation

There are two ways to apply fixes, and an Operator chooses either per job:

### Auto Mode

Click **Start Auto Remediation** to open its settings popover: **Max rounds** (default 10), **Cost limit USD** (default $2, auto-seeded from a budget estimate when enough data exists -- trust that estimate over the flat default when it's shown), **Color-contrast handling** (Guidance only / Disabled / Auto-apply -- default auto-apply, though many teams prefer Guidance only here since contrast fixes rewrite visible color directly), and, on a single job (not inside Batch Processing), **Alt text handling** (Generate AI alt text / Guidance only -- client supplies alt text) and **Bookmark handling** (same three-option pattern). There's no link-text control in this popover -- link text always follows the tenant-wide default for every Auto Mode run.

Click Start. The loop runs on its own: each round analyzes, auto-approves whatever its current settings allow, applies, and **re-audits automatically** -- you don't need to click Re-run Audit during or right after an Auto Mode run. A live status card shows the current round, an elapsed timer, a rounds-completed progress bar, spend so far, and a Stop button.

It stops for one of five reasons, each calling for a different next step:

- **Converged** (success) -- nothing left that the AI pipeline can act on at all. Move on to reviewing what's left manually.
- **Round limit** -- still finding actionable work when it stopped. Check whether the remaining-issue count is still trending down round over round; if so, start again with a higher Max rounds. If it's plateaued, treat it like Stalled instead.
- **Budget limit** -- same idea, but it ran out of money instead of rounds. If real progress is still climbing and you're comfortable spending more, raise the cost limit and restart; if progress had already flattened, don't just throw more budget at it.
- **Stalled** -- the last couple of rounds made no measurable progress. This is your clearest signal that what's left needs a human, not another round.
- **Error** -- a real, unexpected failure, shown with its own message. Note the exact text and escalate if retrying doesn't resolve it. One safety net: if the error happened after some fixes applied but before the follow-up re-audit could verify them, those suggestions are automatically reverted back to "approved" rather than left incorrectly marked done -- retrying won't silently skip them.

### Manual: Re-run AI Analysis and Apply Fixes

**Re-run AI Analysis** fires one single analysis pass (not a loop), with three one-off checkboxes scoped to that click only: **Include color-contrast auto-fix**, **Include link-text auto-fix** (the one-time override for the category Auto Mode itself never touches), and **Client supplied their own alt text** (check only if this job's alt text comes from the client, not AI generation).

**Apply Fixes (N)** opens the Apply All Approved dialog: it shows how many suggestions are in scope and how many are already approved versus still awaiting review, a checkbox to **"Also include N suggestions awaiting review"** if you want to apply everything eligible without reviewing each individually first, and a results screen reporting success/failure counts. Either this or an individual card's Apply button triggers the same remediation-cycle lock and automatically kicks off a post-fix verification re-audit when it finishes.

Both Auto Mode and manual actions require job ownership (or Admin); a Team Leader reviewing a job they don't own can't trigger either -- only view. Auto Mode also has a built-in **escalation**: if it stalls, it can automatically switch guidance-only categories to apply-to-pdf for one more attempt before giving up, rather than quietly stopping short of what's actually fixable.

### The Guided Remediation Checklist

Always visible on the Audit Results page -- a different thing from the Create Remediation Plan button, which navigates to a separate page entirely (see The PDF Remediation Plan Page). It's purely advisory; nothing elsewhere on the page is gated by it. Nine steps, each shown as Not started / In progress / Partially applied / Done / Acknowledged:

1. Initial audit complete (always done)
2. Run AI Analysis
3. Apply AI-suggested fixes
4. Re-audit to verify
5. Re-run AI Analysis (final check)
6. Resolve guidance-only items -- a text field plus **Acknowledge & skip** lets you record a reason (e.g. "client will supply alt text separately") and mark items reviewed-and-left-as-is
7. Re-audit again to confirm manual fixes
8. Generate compliance artifacts -- done once both the ACR and the PAC report exist
9. Mark comparison trial complete (only for jobs linked to a Comparison Study trial)

Two companion cards sit below it: a **Manual remediation time log** (a self-reported timer for work done outside Ninja, e.g. in Acrobat Pro, which the platform otherwise can't see) and a read-only **Remediation History** -- a collapsible Run 1 / Run 2 / ... log of every apply/re-audit/AI-analysis cycle with its own applied/failed/resolved/remaining/regression counts. This is where you check whether the remaining-issue count is genuinely still trending down before deciding whether to keep looping or move to manual work.

## Stage 5: QC and Team Review

This is the platform's actual QC mechanism, and it's a **real gate**, not just an audit trail.

### The Team Review panel

A Team Leader opens a job they don't own (automatic read access via their team) and records a review via the Team Review panel on that job's Audit Results page, or from My Team: a **Review outcome** select (**OK** / **Needs Correction**), an optional notes field, and Submit Review. A history list shows every past review (reviewer, outcome badge, notes, timestamp).

The job's **most recent** verdict is what actually gates shipment:

- **OK** -- the job is cleared.
- **Needs Correction** -- actively blocks **Download AI-Fixed PDF** (and the equivalent EPUB export) with a clear "blocked" message, on both PDF and EPUB jobs, until a later review records OK.

A job nobody has reviewed yet still ships normally -- review isn't mandatory, only an active rejection blocks. The owning Operator/Executive is notified automatically the moment something's flagged, sees the reviewer's note, and gets a **Request re-review** action once they've addressed it (this sends a notification only -- it doesn't create a new review row or unblock anything by itself; only an actual follow-up OK review does that). The Team Leader is notified back when that happens.

### Assigning a title to an Executive

Covered in full in Stage 1: a Team Leader can upload a PDF themselves and assign it directly to an Executive they lead via the "Assign to" dropdown, rather than telling them out of band which file to upload. There's currently no self-service reassignment (an Admin action), no workload limit, and no batch version of this (one file, one Executive, per upload).

### My Team

Sidebar -> **My Team**, visible only to Team Leaders and team-level Viewers. A flat, paginated table of every job owned by any teammate across every team you lead, filterable by status, with an amber **Blocked** badge on any job currently sitting under a Needs Correction verdict. It does not show a standalone roster independent of jobs -- an Executive with zero jobs in the current period simply doesn't appear; use the Assign-to dropdown (Stage 1) if you need to see who's on your team right now. A **Team Activity** section rolls up Review Throughput and Job Ownership for the last 30 days directly below the job table.

Because a Team Leader's access to someone else's job is read-only everywhere else on the platform, Team Review is the **only** thing a Team Leader actually does to a job they didn't upload -- which is exactly the independence a QC check needs.

## Stage 6: Re-Audit and Verification

Re-audit confirms that a fix actually worked -- it runs the same comprehensive audit again against the remediated file and compares the result to the original: issues resolved, issues still open, and any regressions (something that was fine before and broke). This happens automatically as part of every Auto Mode round, and can also be triggered on demand -- most commonly after a Team Leader marks a job **Needs Correction** and an Operator makes further manual fixes, to confirm the correction actually landed before asking for review again.

The comparison is the real number to trust, not the raw issue count: a document can have hundreds of original issues and still show near-zero net progress in a round if most of what's left is deliberately manual work (see Stage 3: AI Analysis and Suggestion Review).

### Reading the round-by-round "Regressions" column

The Remediation History's regression count is **any issue in the post-round re-audit that couldn't be matched back to the pre-round audit**. A high number here does not automatically mean a fix broke something -- a known, benign pattern is a multi-stage fix chain where fixing one layer of a defect necessarily exposes the next layer as a "new" issue the following round, with the regression count trending to zero as the chain completes. The real pattern to watch for is resolved/regression counts **oscillating** without ever trending toward zero across many rounds, with the open-issue count stuck flat -- that's a sign of a stall, not healthy convergence. Don't just trust a final round's "0 regressions": check whether any issue code that only ever appeared in a Regressions line, never later in a Resolved line, is still open.

## Stage 7: ACR and Compliance Reporting

Once a job's results are stable, the owner (or an Admin) opens **Settings -> Generate ACR** on the Audit Results toolbar, which leads into a dedicated 6-step wizard, separate from the Audit Results page itself:

1. **Edition Selection** -- choose which VPAT edition/standard to report against (e.g. VPAT 2.5 INT). May auto-advance if already set upstream (e.g. from a Batch).
2. **Document Upload** -- confirm which document this ACR is for; the job you arrived from is pre-selected, but you can switch to a different already-audited job or upload fresh.
3. **AI Analysis** -- review the automated per-criterion confidence analysis Ninja already ran (a "View Full ACR Analysis Report" link opens the complete report). Read-only at this step.
4. **Human Verification** -- just the criteria the AI flagged as needing a judgment call, not every criterion. Each gets a status, a verification method, and optional notes; every flagged item must be addressed before you can proceed.
5. **Review & Edit** -- the full, editable document (remarks/statuses per criterion), with a Version History toggle to see or restore earlier drafts.
6. **Export** -- **Export Document** (Word, PDF, or HTML), Version History, and Complete. The exported file is the actual deliverable, downloaded to your machine -- it isn't separately re-attached to the original PDF job record.

There's no single button back to the Audit Results page from inside this wizard -- use normal browser navigation once you're done. Anyone with review access, including a Team Leader who doesn't own the job, can check whether a job is ready to finalize without being able to finalize it themselves -- a deliberate read-only checkpoint so a reviewer can confirm readiness before signing off, without touching the report.

### The PAC Report modal

Opened from the **PAC Report** toolbar button on Audit Results. Title: "Matterhorn Protocol 1.1 Compliance Report." Up to three tabs:

- **Ninja Report** (always present) -- Ninja's own free, instant, simulated Matterhorn/PAC-equivalent check. A summary bar shows total counts by status (PASS / FAIL / UNTESTED / HUMAN_REQUIRED / N/A) across all 137 conditions, followed by a row per checkpoint (CP01 through CP31), each expandable to its own individual conditions and statuses. A footer note: **"UNTESTED conditions are not confirmed passing. This report does not constitute full PDF/UA-1 certification."** Simply opening this tab is what satisfies the Compliance phase's PAC-report requirement.
- **axes4 Live Check** (only if the tenant has this paid feature configured) -- shows quota used this period and when it resets, a Run Live Check button (disabled at the quota limit), and, on success, a UA Index score plus a failure list.
- **External PAC Report** -- upload the real, independent PAC Desktop tool's own export for this document. There's no automated parser for the file itself, so you hand-enter its summary counts: Pass, Fail, Untested, Human Required, Not Applicable. When totaling a real PAC Desktop export's own table, map Warned -> Human Required (that's what PAC itself means by it) and sum each column across every checkpoint row. Once uploaded, this tab shows the five counts, a download link for the file (which refreshes its presigned URL on click, since it can go stale), and, for the job owner, a Remove option.

**Important distinction**: the External PAC Report is a separate record from the Compliance phase in the 5-phase stepper. The Compliance phase tracks Ninja's own free, simulated Ninja Report plus the ACR -- it does **not** require the External PAC Report upload. Attach the external report anyway, every time, as the real client-facing proof of compliance; just don't expect it to move the stepper on its own. Separately, `JobExternalPacReport` is the record this upload creates: a third-party tool's own result attached to the job as independent verification evidence, distinct from Ninja's own ACR.

## Stage 8: Final Delivery

The owner (or an Admin) downloads the remediated file -- the one real deliverable everything before this stage was building toward. Two things travel with it:

- The **remediated PDF/EPUB itself**, with every applied fix baked in.
- A **handoff note**: a factual cover sheet stating the file's exact state at hand-off time -- score, round history, and what issues remain open -- generated for exactly this situation: handing a file to an external QC partner without a timing mismatch between what you say you fixed and what the file you sent actually contains.

If an active **Needs Correction** review is sitting on the job, download is blocked outright until a Team Leader records OK. There's no way to route around that gate from the Operator side -- it's enforced on the download endpoint itself, not just hidden in the UI.

## The PDF Remediation Plan Page

Reached via **Create Remediation Plan** on the Audit Results toolbar (a separate page, with its own "Back to Audit Results" link). It regroups every issue into three collapsible sections:

- **Auto-fixable Issues** (green) -- can be fixed automatically with no user input. A primary button applies every auto-fixable item in this plan's own batch, separate from the Issues panel's own Apply Fixes.
- **Quick Fix** (blue) -- issues with a guided, one-field fix (language, title, metadata, creator). **Start Quick Fix** opens a small modal with a **Preview** step (shows a before/after) before you confirm and apply -- a distinct two-step flow from the inline-edit-then-Apply pattern on the main Issues panel.
- **Manual Review** (red) -- everything genuinely requiring a human judgment call, with per-issue-type counts.

A Re-audit control and a Download Remediated button also live on this page, independent of the main Audit Results page's own equivalents -- they operate on the same job, just from this alternate view. Use this page if you prefer working through issues grouped by **fix mechanism** rather than by category/severity the way the main Issues panel groups them; both views stay in sync on the same underlying job.

## Structure Tag Review (Full QC)

A page-by-page structure-tag inspection and correction tool, available only when **Full QC** is effective for a job (set at upload time -- see Stage 1 -- there is no way to turn it on for a job after the fact). When effective, a **"Review structure tags"** toggle appears on the Audit Results toolbar.

Toggling it on renders colored, tag-labeled outlined boxes directly over the existing PDF preview, one per structure element on the current page, color-coded by tag family: headings purple, paragraph-like elements blue, lists teal, tables orange, Figure/Formula/Form green, Caption/Note/Reference/BibEntry/Code yellow, Link/Annot/TOC/TOCI cyan, Artifact/NonStruct/Private gray.

Clicking a box selects it (amber outline) and opens a bottom detail strip showing the element's text snippet and a **"Change to:"** dropdown covering the full PDF/UA structure-type vocabulary: Document, Part, Art, Sect, Div, BlockQuote, Caption, TOC, TOCI, Index, NonStruct, Private, P, H, H1-H6, L, LI, Lbl, LBody, Table, TR, TH, TD, THead, TBody, TFoot, Span, Quote, Note, Reference, BibEntry, Code, Link, Annot, Figure, Formula, Form, Artifact. Changing the selection applies immediately (a brief spinner while saving) -- there's no staged/batch-commit step, each change writes to the stored PDF right away, the same immediacy as Quick Fix.

This is a full-inventory tool: every structure element on a page is reviewable, not just the ones an audit issue already flagged. Recommended workflow: click the "Review structure tags" icon, click a mistagged element, pick the correct tag from the dropdown -- it writes immediately, no apply step. Use the fullscreen toggle for a sustained page-by-page pass; Prev/Next on the page navigator stays visible throughout. Run the existing Re-run Audit action once you're done with a page or the document -- there's no automatic re-audit after each individual tag change, since a page-by-page pass may do dozens of edits and re-auditing per click would be slow and noisy.

Not every finding has a right-click fix. Next to the Change to dropdown is a **Flag** button: click it and the Send Feedback form opens, already carrying the page number and the selected element (type pre-set to "Full QC Review Note") -- add a comment and an optional severity, then submit. Every note filed this way shows up immediately in a **QC Notes** list (a second small icon next to "Review structure tags"), scoped to this job: page, element, comment, severity, status, who filed it, and when. A **Download as Excel** button on that list exports the full set as a spreadsheet (Page, Element, Severity, Comment, Status, Submitted By, Date) -- for your own records, or to carry alongside the file for whoever receives it next.

Known limits today: no text search across the document (you locate an element visually, by page); no "reviewed" checkpoint tracking which pages of a long document you've already been through (Flag tracks individual items, not pages covered); a genuinely single-line paragraph's box can render as a thin sliver rather than a full rectangle, though its label stays clickable.

## Feedback and Defect Reporting

A floating message-bubble button sits bottom-right on every page of the platform; a **Feedback** entry under the sidebar's Tools section takes you straight to the dashboard described below.

**Filing feedback**: Feedback Type (Accessibility Issue, Alt-Text Quality, Audit Accuracy, Remediation Suggestion, General Feedback, **Bug Report**, Feature Request -- use Bug Report for anything actually broken), an optional Severity (Critical / High / Medium / Low), a required Message, an optional Context field (auto-filled with the current page path -- if you're on a job's own page, that job is tagged behind the scenes automatically), and up to 5 attachments at 10MB each. If an attachment fails to upload, the feedback itself is still saved, with a note telling you so -- you can add the file later from the dashboard.

**Tracking what happens next**: everything filed is visible to the whole team at the Feedback dashboard -- there's no special admin-only gate on this, unlike Operational Reports. It shows summary stats (total, positive rate, pending review, response rate), a By Type / By Status / By Severity breakdown, a "Requiring Attention" list sorted most-severe-first, and a full filterable/sortable list where clicking a row lets you change its status (New -> Reviewed -> In Progress -> Resolved -> Dismissed), adjust severity, add attachments after the fact, or read/add a response. You're notified automatically (the same notification bell used elsewhere) whenever something you filed changes status; every tenant Admin is notified immediately (in-app and email) the moment anything new is filed, not just on later status changes.

This is the right channel for anything about how the platform itself behaves -- a bug, a UI problem, an inaccurate finding, or a suggestion. It is not a replacement for a job's own Team Review verdict (Stage 5's QC gate), which is specifically about one document's accessibility quality, not the platform.

## Batch Processing

Reached via the sidebar's Tools section or a dedicated PDF batch flow: upload several PDFs together under one batch name, rather than one at a time. **Creating a batch**: a batch name plus a multi-file PDF picker -- that's the whole form. **The batch list** shows every batch, paginated, with its status. **The batch detail page** shows a status badge, result counts ("N remediated, N failed, N skipped"), a View Results button, and a cancel/back action while the batch is still Draft, Queued, or Processing.

Each file in a batch runs through the same single-job pipeline this guide otherwise describes -- Batch Processing is a multi-file wrapper around that pipeline, not a different workflow. One difference worth knowing: the Auto Mode settings popover inside a batch doesn't expose the per-run Alt text handling or Bookmark handling overrides available on a single job's own Start Auto Remediation popover -- those two categories follow the tenant default inside a batch.

## Comparison Study

An Admin/research tool for validation trials: comparing Ninja's own remediation against pdfXT on fresh PDFs, independent of any specific client engagement. **Registering a trial**: upload a PDF (direct-to-S3, so large files are fine) and pick a content type (Text Dominant / Table Heavy / Figure Heavy / Mixed). A trial's status progresses **registered -> pdfxt_logged -> validated** -- "pdfxt_logged" means someone has manually logged pdfXT's own result for that same file, for comparison.

Each trial row shows its content type, cost, duration, a PAC failure count (via veraPDF, or a dash if that didn't run), which tagger produced its structure tree (Seam-C / Adobe / Failed / Skipped), and whether an External PAC Report is attached -- reusing the same `JobExternalPacReport` concept used on ordinary jobs. From there, a per-trial workspace and a per-trial report let you dig into one trial in depth, and an aggregate report rolls results up across every trial run so far. This is the platform's own built-in machinery for exactly the kind of side-by-side comparison a vendor-switch business case would want to cite -- worth knowing it already exists rather than improvising a one-off comparison from scratch.

## Admin: Tenant Configuration Reference

Reached via sidebar -> Admin -> Workflow Settings. One page, six distinct blocks, each with its own save action -- changes are per-block, not all-or-nothing.

### PDF AI Remediation (the tenant-wide defaults every job falls back to)

| Setting | Controls |
| --- | --- |
| `fullAutoModeDefault` | Whether a new job auto-starts Auto Mode as soon as its initial audit completes, instead of waiting for an Operator to start it by hand. |
| `autoEscalateOnStallDefault` | Whether Auto Mode escalates guidance-only categories to apply-to-pdf for one more attempt when it stalls, before stopping. |
| `fullQCDefault` | Whether the page-by-page structure-tag review tool is available on a job at all. |
| `altTextMode` | **Generate AI alt text** (apply-to-pdf) or **Guidance only -- clients supply their own**. |
| `colorContrastMode` | **Guidance only -- flag but never auto-apply** / **Disabled -- skip entirely** / **Auto-apply -- fix automatically**. |
| `linkTextMode` | Same three-option pattern as color contrast. |
| `bookmarkMode` | Same three-option pattern, covering both generating missing bookmarks from headings and regenerating generic bookmark titles under one toggle. |

Every one of these can be overridden on an individual job at upload time or (for the first two) from that job's own Settings menu -- the tenant default only applies when a job doesn't set its own value. There is no `tableFixMode` setting on this page.

### Agentic Workflow

A single toggle: when on, uploads are auto-processed through the full Workflow Agent pipeline with no manual audit trigger.

### Batch Policy

**"Allow Fully Headless Batches"** toggle, off by default, with a warning that at least one HITL gate must stay manual otherwise.

### HITL Gate Timeouts

Four free-text millisecond inputs -- AI Review Gate, Remediation Review Gate, Conformance Review Gate, ACR Signoff Gate -- each with a live readout ("Current: 1 hour" or "Manual approval required" for a null value). A reference box gives common examples (30000 = 30s, 60000 = 1 min, 3600000 = 1 hr, the default; null = manual). ACR Signoff defaults to null, with an explicit "(Recommended: null for manual approval)" note.

### Reports Configuration

**AI Explanation Source** radio group: **Hardcoded Catalog** (fast, free, recommended), **Gemini AI** (richer, uses API quota), **Hybrid** (catalog first, Gemini fallback).

### axes4 PAC Cloud

A single toggle enabling the paid, per-page-billed third-party live PDF/UA check (the "axes4 Live Check" tab in the PAC Report modal). Shows "Last changed by [name] on [date]" once set; read-only for non-admins.

### Compliance

**"Require ACR for Compliance"** toggle, on by default. When on, a single job's Compliance phase needs both a PAC Report and a generated ACR to show Done; off lets the PAC report alone count. This does **not** affect the separate Workflow Agent's own ACR Sign-off gate, which stays mandatory regardless of this toggle.

## Admin: User and Team Management

### User Management

A filter bar (All Roles / USER / OPERATOR / ADMIN / VIEWER) with a live count badge, and an **Add User** button that toggles an inline create form: First Name, Last Name, Email, a Role dropdown (defaulting to OPERATOR), Password (minimum 8 characters) and a matching confirmation field. The table shows Name, Email, a colored Role badge (ADMIN red, OPERATOR teal, USER blue, VIEWER gray), Tenant, Created date, and an **inline role-change dropdown per row** -- the only editing available after creation. There's no deactivate/reactivate, no password reset, and no other field is editable later from this page; the role dropdown is disabled on your own row, so you can't demote yourself.

### Team Management

Manages **production-oversight teams** (Executive / Team Leader / Viewer) -- orthogonal to platform role. A Team Leader or Viewer can see their teammates' jobs under My Team; a Team Leader can also leave a spot-check review, and a Needs Correction verdict blocks that job from shipment until a follow-up review clears it (see Stage 5).

**New Team** opens an inline form (just a team name). Each team renders as a card: name header, an **Add Member** link opening an inline form (a user dropdown showing name and email, plus a TeamRole dropdown -- Executive / Team Leader / Viewer), a delete icon on the team itself with a confirmation prompt warning this permanently deletes the team and all its memberships, and a member table (name, email, TeamRole badge, a per-row remove icon with no confirmation prompt, unlike deleting the whole team).

## Admin: Operational Reports

Sidebar -> Admin -> Operational Reports. This is internal operational reporting -- how the system (speed, cost, reliability, fix quality, team throughput) is performing -- a completely different thing from the PAC/ACR reports generated per document, which describe a document's accessibility, not the pipeline's own health. Five tabs, the first four sharing a date-range filter (From/To, plus Last 30/90 days presets, 30 days default):

- **Throughput** -- Queue Wait and Initial Audit stat cards, a Round Duration by Action table (AI Analysis / Apply Fixes / Re-audit, each with Avg/p50/p95/Count), a trend chart, a Concurrency bar (turns red at the real capacity ceiling), and a Stuck Jobs list with a direct View link into each one.
- **Cost** -- Total Spent, Runs, Avg Cost/Run, Avg Cost/Page; a Cap Hit Frequency chart (converged / round_limit / budget_limit / manual_stop / stalled / error); a sortable Spend by Run table. Clicking a row opens the Job Drilldown Dialog: per-round cost and resolution-rate charts, plus that job's full Team Review history including any active block.
- **Quality** -- a Yield by Suggestion Type chart (Applied vs. Failed, worst-yield-first) and a Stuck Issue Backlog table for codes that keep failing across jobs whose Auto Mode has already stopped, with clickable sample jobs. A high failure count isn't automatically a bug -- cross-reference the Apply Failure Report on individual jobs, since many failures are intentional declines.
- **Reliability** -- interruptions (deploy-interrupted / crash-interrupted -- infra health, not a user-facing error) and failure reasons (Size Limit Exceeded / Timeout / Parse Error / Validation Error / Not Yet Categorized). A large "Not Yet Categorized" bar is expected, not a problem -- the failure classifier is deliberately narrow.
- **Team Activity** -- Team Review Throughput (per Team Leader, OK vs. Needs Correction counts) and a Job Ownership table (per teammate: Total/Completed/Failed/In Progress/Completion Rate, with an expandable per-person assignment list). A low "OK" count for a reviewer isn't a performance problem -- it could just as easily mean they're genuinely catching real issues. The tenant-wide, all-teams version of this lives here; a Team Leader's own scoped version lives on My Team (Stage 5).

## Admin: Corpus Management

A calibration/ML-training tool, not day-to-day work: upload training-corpus PDFs tagged by content type (Mixed / Table Heavy / Figure Heavy / Text Dominant), run bulk AI annotation, export training data, and trigger calibration runs for the detector models behind Ninja's own structure/zone detection. A companion Bootstrap Console and related pages (operator lineage, zone review) serve the same ML-calibration workstream. This is specialized tooling for whoever maintains the detector models, not a feature most Admins will touch routinely.

## Notifications

In-app only, via the bell icon in the main header: an unread-count badge, a dropdown of the 10 most recent notifications, each with a type-specific icon (job completed, system alert, team review flagged, re-review requested, feedback submitted or its status changed, a job assigned to you), relative timestamps, click-to-navigate-and-mark-read, and a mark-all-read action. There is currently no dedicated notification-preferences page -- no per-type on/off toggle exists; everything that fires, fires.

## Role Quick-Reference Matrix

| Stage | Admin | Operator (owner) | QC / Team Leader (non-owner) |
| --- | --- | --- | --- |
| Upload & Assignment | Any job, any time | Self-uploads; assigns to an Executive if also a Team Leader | View only, via team access |
| Initial Audit | View any job's results | View own job's results | View, via team access |
| AI Analysis Review | Approve / reject / apply on any job | Approve / reject / apply on own job | View suggestions and their state only |
| Remediation | Trigger Auto Mode or Quick Fix on any job | Trigger Auto Mode or Quick Fix on own job | View progress only |
| QC / Team Review | Can record a review on any job | Can request a review from their Team Leader | Records **OK** or **Needs Correction** |
| Re-Audit & Verification | Trigger on any job | Trigger on own job (automatic or on demand) | View comparison results only |
| ACR / Compliance | Generate, finalize, export on any job | Generate, finalize, export on own job | Check finalize-readiness only, can't finalize |
| Final Delivery | Download any job's file | Download own job's file, unless blocked by Needs Correction | Can't download a job they don't own |
| Tenant Configuration | Full control over all tenant-wide defaults | Sees the effective settings a job inherited | Sees the effective settings a job inherited |

## Known Gaps and Notes

Honest caveats, rather than papering over them:

- **Two workflow engines exist.** This guide describes the pipeline every current PDF job actually runs through (audit -> AI analysis -> Auto Mode -> re-audit, keyed on the Job record). A separate "Workflow Agent" state machine (14 states, 4 HITL gates) also exists and is the real, active path for **EPUB** jobs -- its own adapters only wire up EPUB services. A PDF branch of that same machine exists too, but isn't where current PDF engineering effort goes. If you're working an EPUB job specifically, its stage names and gates differ from this guide's PDF-focused walkthrough.
- **Admin page access is enforced by the API, not the navigation.** The Admin pages are visible in the sidebar to everyone, and a non-admin who navigates to one directly sees the page shell, but every action is rejected server-side, which is where the real check lives. A real, low-risk frontend/backend inconsistency, not a security hole in practice.
- **Admin-gating is applied inconsistently across endpoints.** Some admin-only settings use an explicit role-check middleware; others use an inline check inside the route handler. Verify a specific endpoint directly if its access control matters for your use case, rather than assuming this guide's general description holds.
- **No in-UI path to supply real client-provided alt text for an image the AI classified as decorative.** Its card renders as read-only guidance, not an editable box -- a genuine gap, not a design choice.
- **No bulk ingestion of client-supplied alt text.** Per-image manual edit-then-apply is the only path today.
- **The MCID-page-mismatch fixer has a narrow, deliberate scope**: it only repairs a bare MCID whose real page is already declared by a sibling on the same element; an ambiguous or unresolvable case is intentionally left unfixed rather than guessed.
- **Two detect-only findings need a human every time**: a heading-styled paragraph tagged with an unrelated generic style (no automated retarget is safe), and a page-repeating header/footer tagged as real content instead of Artifact (a per-chapter-changing running header won't be caught at all).
- **Footnote structure fixes don't yet build the bidirectional link** between a footnote and its in-body citation marker -- the type and label split correctly, but the link itself still needs a human to confirm if that specific check matters for your compliance target.
- **No self-service reassignment, capacity guardrail, batch assignment, or standalone roster view for Team Leaders.** Moving an already-assigned title to a different Executive is an Admin action; assigning has no workload limit or warning; one upload assigns to exactly one Executive; My Team only shows teammates who have at least one job in the current period.
- **No notification-preferences page.** Every notification type that fires, fires -- there's no per-type opt-out.
- **This guide is the cross-role companion, not a replacement.** The platform also has narrower, role-specific references built in: an Operator Guide, a Team Leader Guide, an Administrator Guide, and a Full QC Guide. Those are the quick in-context reference for one role or one feature; this document is the fuller picture across all three roles and every stage, consolidated into a single read.
