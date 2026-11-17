# Ninja Platform — Administrator Guide

**This is the Administrator's reference for tenant-wide configuration, user and team management, and the oversight surfaces that are only visible to the `ADMIN` platform role.** It assumes you're already familiar with the hands-on audit/remediation workflow itself — for that, see the **Operator Guide**. This guide is specifically about the settings and management pages an Admin reaches that nobody else on the platform sees.

---

## Table of Contents

- [Part 1 — Platform Role vs. Team Role](#part-1--platform-role-vs-team-role)
- [Part 2 — Workflow Settings — PDF AI Remediation Defaults](#part-2--workflow-settings--pdf-ai-remediation-defaults)
- [Part 3 — Workflow Settings — Full Auto Mode, Auto-Escalate on Stall, and Full QC](#part-3--workflow-settings--full-auto-mode-auto-escalate-on-stall-and-full-qc)
- [Part 4 — Workflow Settings — Compliance and axes4](#part-4--workflow-settings--compliance-and-axes4)
- [Part 5 — User Management](#part-5--user-management)
- [Part 6 — Team Management](#part-6--team-management)
- [Part 7 — Operational Reports](#part-7--operational-reports)
- [Part 8 — Feedback Dashboard](#part-8--feedback-dashboard)
- [Part 9 — Known Gaps / Open Items](#part-9--known-gaps--open-items)

---

## Part 1 — Platform Role vs. Team Role

Every account carries **two independent roles** that answer two different questions, not one combined permission level:

- **Platform role** (`ADMIN` / `OPERATOR` / `USER` / `VIEWER`) — what you can do platform-wide. As an **Admin**, you can access any job in your own tenant (not just your own) and reach the **Admin** section in the sidebar — every other platform role is scoped to their own work.
- **Team role** (`TEAM_LEADER` / `EXECUTIVE` / team-level `VIEWER`) — standing within a production **Team** (a "cell": one Team Leader plus a handful of Executives), completely independent of platform role. This is the axis Part 6 below manages — Team structure and membership are Admin-managed, not something a Team Leader can self-service.

This guide only covers the Admin-exclusive surfaces. For the hands-on audit/remediation workflow, see the **Operator Guide**; for the Team Leader's own management view of their team, see the **Team Leader Guide**.

---

## Part 2 — Workflow Settings — PDF AI Remediation Defaults

**Where:** sidebar → Tools → **Workflow Settings** → PDF AI Remediation section. Readable by everyone on the tenant, but only an Admin can actually change any of it — enforced both in the UI and by the backend.

These are the tenant-wide fallback behaviors every PDF job uses whenever a request doesn't send its own override — the initial automatic pass right after upload always uses these, and so do most Auto Remediation runs. Changing a default here never affects a run already in progress.

| Setting | Options | What it governs |
|---|---|---|
| **Alt text** | Auto-apply / Guidance only | Whether AI-drafted alt text for images writes into the PDF automatically or only ever shows as a suggestion. |
| **Color contrast** | Auto-apply / Guidance only / Disabled | Whether contrast fixes (which directly rewrite visible color in the content stream) apply automatically. |
| **Link text** | Auto-apply / Guidance only / Disabled | Ambiguous/placeholder link text fixes. This category has no per-run override anywhere on the Audit Results page — it always follows this tenant default. |
| **Bookmarks** | Auto-apply / Guidance only / Disabled | Covers both generating missing bookmarks from headings and regenerating generic bookmark titles (e.g. InDesign's own "Section — p.25") — both share this one setting, and like Link text, it has no per-run popover override. |

A per-job operator can still override **Alt text** and **Color contrast** for a single run via the Re-run AI Analysis checkboxes or the Start Auto Remediation popover (Operator Guide, Part 4) — those overrides apply on top of whatever you set here, for that one action only.

---

## Part 3 — Workflow Settings — Full Auto Mode, Auto-Escalate on Stall, and Full QC

Same section of Workflow Settings as Part 2, three more toggles — each is a tenant-wide default with a per-job override available later (see below), using the same "inherit / on / off" three-state shape everywhere it appears.

| Setting | Default | What turning it on does |
|---|---|---|
| **Full Auto Mode** | Off | Auto Remediation starts automatically right after the initial audit completes, with no operator click and no popover configuration — it just runs. With it off (the normal case), an operator clicks "Start Auto Remediation" themselves and picks their own settings each time (Operator Guide, Part 4, Step 3). |
| **Auto-escalate on stall** | Off | When a run would otherwise stop with "Stalled," it automatically escalates its guidance-only Color contrast / Link text / Bookmarks settings to Auto-apply for one more pass before giving up for real. Only ever escalates once per run — a second stall after escalation stops for good. |
| **Full QC** | Off | Makes the page-by-page "Review structure tags" mode (and the Flag / QC Notes feature) visible on the job's Audit Results page at all. See the **Full QC Guide** for the complete reference on what this unlocks. |

**Per-file override at upload:** each has a matching checkbox on the PDF Accessibility upload screen, for setting it on just one file without changing the tenant default.

**Per-job override after upload:** on that job's Audit Results page, the **Settings** button on the toolbar opens a menu with Full Auto Mode / Auto-escalate on stall as three-state dropdowns (On / Off / "Use tenant default") — editable any time, not frozen at upload. (Full QC's own per-job override lives only at upload time today, not in this same menu.)

---

## Part 4 — Workflow Settings — Compliance and axes4

Two more tenant-wide toggles, in a separate section of the same Workflow Settings page:

**Require ACR for Compliance** — controls whether the PDF Audit Results page's Compliance phase needs both the PAC report *and* a generated ACR to show "Done," or just the PAC report alone. Defaults to **on**. Scoped to that one phase indicator only — it never affects the separate Workflow Agent's own ACR sign-off gate, which stays mandatory regardless of this setting.

**axes4 PAC Cloud** *(paid feature)* — whether the live "axes4 Live Check" tab appears at all inside the PAC Report modal, running the real axes4 engine live from inside Ninja, billed per page, instead of requiring the operator to run the desktop PAC tool separately.

---

## Part 5 — User Management

**Where:** sidebar → Admin → **User Management**.

Lists every user on the tenant with a role filter (`USER` / `OPERATOR` / `ADMIN` / `VIEWER`). **Create User** opens a form for email, first/last name, platform role, and password. Changing an existing user's role is a direct inline action on their row.

This is platform-role management only — it does not touch team membership (Part 6) or the separate team-level role (`TEAM_LEADER` / `EXECUTIVE` / `VIEWER`) a user might also hold.

---

## Part 6 — Team Management

**Where:** sidebar → Admin → **Team Management**.

This is where a Team ("cell": one Team Leader plus a handful of Executives) actually gets created and staffed — the Team Leader Guide covers what a Team Leader does *with* their team once it exists, but creating the team and deciding who's on it is Admin-only, done here.

- **Create Team** — name only; teams aren't scoped to a product or document type.
- **Add member** — pick a user and assign them a team role: `EXECUTIVE`, `TEAM_LEADER`, or team-level `VIEWER`. A user can belong to more than one team.
- **Remove member** / **Delete team** — both available directly from the team's own row.

There's no bulk-import or CSV path today — every add/remove is one action at a time.

---

## Part 7 — Operational Reports

**Where:** sidebar → Admin → **Operational Reports**.

This is internal operational reporting — how the system (speed, cost, reliability, fix quality, team throughput) is performing, not a per-document compliance report. The full tab-by-tab reference (Throughput, Cost, Quality, Reliability, Team Activity, and the Job Drilldown Dialog) lives in the **Operator Guide, Part 9** — it's written there since every operator should know this exists even though only an Admin can open it; this guide doesn't duplicate that content.

---

## Part 8 — Feedback Dashboard

**Where:** sidebar → Tools → **Feedback**, or the floating feedback button on any page.

Every bug report, defect, or suggestion filed on the platform — including a **Full QC Review Note** filed via the Flag action (Full QC Guide, Part 6) — lands here. The full reference for filing, severity, status, and notification behavior lives in the **Operator Guide, Part 13**, since filing feedback isn't Admin-exclusive. The one Admin-specific behavior worth knowing: **every tenant Admin gets both an in-app notification and an email the moment any feedback is filed**, not just when its status later changes — you don't need to go looking for new submissions yourself.

---

## Part 9 — Known Gaps / Open Items

- **No bulk user/team import.** Users, teams, and memberships are all created one at a time through the UI — no CSV or batch path today (Parts 5–6).
- **Full QC's per-job override lives only at upload time.** Unlike Full Auto Mode and Auto-escalate on stall, there's no post-upload menu to flip Full QC for an already-running job today — only the tenant default (Part 3) and the per-file upload checkbox.
- **No audit log of settings changes.** Workflow Settings changes (Parts 2–4) aren't themselves tracked anywhere queryable — if a default changed and nobody remembers when or why, there's no built-in history to check yet.
