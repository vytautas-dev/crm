---
project: AI Relationship & Fundraising Assistant
context_type: greenfield
updated: 2026-05-25
product_type: web-app
target_scale: small
timeline_budget:
  mvp_weeks: 5
  after_hours_only: true
  hard_deadline: null
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  frs_drafted: 16
  quality_check_status: accepted
---

## Vision & Problem Statement

A startup founder raising a round or managing active deal flow is simultaneously
tracking 20–80 investor and partner relationships. There is no single source of
truth that shows the current stage of each relationship, what has been discussed,
what was promised, and what requires urgent action.

The result: commitments fall through the cracks, follow-ups are forgotten, and
business momentum disappears — not because the founder is careless, but because
no existing tool matches how founders actually work. CRMs like HubSpot, Pipedrive,
and Affinity require structured data entry. Founders don't do structured data entry
under pressure. They write notes, paste transcripts, and move on.

**Key insight:** The tool only survives adoption if uploading a `.md` file (or
pasting raw text) is the entire effort required to keep the system current. AI does
the extraction; the founder does the thinking.

**Primary use case:** fundraising — tracking investor relationships, round stage,
commitments, and follow-ups. Partnerships and BD are in scope but secondary.

## User & Persona

**Primary persona:** Solo founder (pre-seed to Series A) running an active fundraise
or ongoing investor relations. Managing 20–80 companies simultaneously. Works alone
or with at most one EA; no shared CRM workflow needed in v1.

**User scope:** Single named user — one account, one workspace, no roles or team
sharing in MVP.

**Pain trigger moment:** Mid-fundraise, when 30+ investor relationships are live and
the founder has 4 open browser tabs, a Notion page, a spreadsheet, and memory as
their only system.

## Access Control

**Auth:** Email + password OR OAuth (Google). Standard web auth; data persisted
server-side so the founder can access from any device.

**User model:** Flat — single user, single workspace, one role. The founder sees
and can edit everything. No admin/member split, no read-only viewer, no team
sharing in MVP.

**No roles.** This is a solo tool. Role separation is a non-goal for v1.

## Success Criteria

### Primary

The upload-to-action loop works end-to-end:
1. Founder adds a company (name, relationship status, optional notes)
2. Uploads a `.md` file containing meeting notes, a transcript, or an email thread
3. AI generates a relationship summary (what was discussed, what was promised, current status)
4. AI generates 1–5 action tasks with priority and deadline
5. Founder can view, edit, mark done, or create tasks manually

If a founder can do these 5 things for their first company in under 10 minutes
without reading a manual, the product works.

### Secondary

Founder can create tasks manually (without uploading a file), so the task list
remains useful even when there are no new notes to upload.

### Guardrails

- **Privacy:** Uploaded files must remain strictly private to the authenticated user.
  No leakage between accounts, no third-party data exposure beyond the AI provider.
- **Accuracy:** AI must not fabricate commitments, promises, or decisions that were
  not present in the uploaded content. Hallucinated promises are worse than no
  summary. When uncertain, the AI must signal uncertainty rather than invent.
- **Reliability:** Tasks must never silently disappear. Data loss destroys founder
  trust immediately and irreversibly.
- **Platform:** Desktop browser (laptop/desktop). Mobile is not in scope for v1.

## Functional Requirements

### Company Management

- FR-001: Founder can add a company. Priority: must-have
  > Socrates: Counter considered: "bulk import beats manual add for 80 companies."
  > Resolution: FR-016 added as must-have CSV import. Manual add is still needed
  > for one-off additions.

- FR-002: Founder can edit a company. Priority: must-have
  > Socrates: No counter-argument raised; stands as written.

- FR-003: Founder can archive a company (soft-delete — data preserved). Priority: must-have
  > Socrates: Counter accepted: hard delete destroys uploaded notes and task history.
  > Revised from "delete" to "archive." Hard delete removed from scope.

- FR-004: Founder can view the full company list. Priority: must-have
  > Socrates: No counter-argument raised; stands as written.

- FR-005: Founder can set a company relationship status (lead / in progress /
  negotiating / investor / inactive); AI infers status from uploaded content;
  founder can override manually. Priority: must-have
  > Socrates: Counter accepted: manual-only status contradicts the zero-friction
  > thesis. Revised: AI infers, founder overrides.

- FR-016: Founder can add multiple companies via CSV import. Priority: must-have
  > Socrates: Promoted from nice-to-have: a founder with 80 companies will not
  > onboard via manual add. CSV import is an adoption gate.

### File Upload & AI Analysis

- FR-006: Founder can paste text (email thread, transcript, raw notes) into a
  company; optionally upload a .md file. Text paste is the primary input path.
  Priority: must-have
  > Socrates: Counter accepted: founders don't have .md files — they have emails
  > and Google Docs. Text paste is more frictionless than file upload. .md upload
  > kept as optional alternative.

- FR-007: AI generates a relationship summary from pasted/uploaded content —
  including what was discussed, what was promised, and current relationship status.
  AI must cite the source passage for each claim. Priority: must-have
  > Socrates: Counter accepted: one hallucinated commitment poisons the entire
  > product. Resolution: AI must cite source passage. Accuracy > completeness.
  > Confidence signal required before shipping.

- FR-008: AI generates 1–5 high-specificity action tasks from pasted/uploaded
  content. Generic tasks ("follow up") are a failure mode. Priority: must-have
  > Socrates: Counter accepted: vague AI tasks become noise and get ignored.
  > Resolution: quality over quantity — max 5, specificity is required.

### Task Management

- FR-009: Founder can view a global task list across all companies, filtered by
  priority, deadline, and urgency (overdue / due today). Priority: must-have
  > Socrates: Counter accepted: global list without filtering is overwhelming at
  > 80 companies. Resolution: smart filtering by urgency/overdue/today is built in.
  > Per-company task view is a drill-down within the global list.

- FR-010: Founder can create a task manually (not AI-generated). Priority: must-have
  > Socrates: No counter-argument raised; stands as written.

- FR-011: AI-generated tasks are read-only (can only be completed or dismissed).
  Manually created tasks can be edited. Priority: must-have
  > Socrates: Counter accepted: allow manual task editing but not AI task editing
  > to preserve integrity of AI-generated decisions. Clean separation.

- FR-012: Founder can mark any task (AI-generated or manual) as complete.
  Priority: must-have
  > Socrates: No counter-argument raised; stands as written.

- FR-013: AI proposes task priority (low / medium / high / urgent); founder can
  override priority on manually created tasks. Priority: must-have
  > Socrates: Kept: AI proposes, founder overrides. Full trust-AI approach
  > rejected; manual override is essential.

- FR-014: AI proposes task deadline; founder can override deadline on manually
  created tasks. Priority: must-have
  > Socrates: Counter accepted: AI deadline guesses ("next week") will often be
  > wrong. Founder override is essential. AI proposes, founder corrects.

- FR-015: Founder can view per-company tasks as a filtered drill-down from the
  global task list. Priority: must-have
  > Socrates: Reframed from standalone per-company view to filtered drill-down
  > within global task view. Global list is the primary interface.

## User Stories

### US-01: Upload notes and receive relationship intelligence

```
Given: Founder has added a company and is on the company detail page
When:  They paste text (or upload a .md file) containing meeting notes,
       a transcript, or an email thread
Then:  AI generates a relationship summary (with cited source passages)
       and 1–5 high-specificity action tasks (with AI-proposed priority
       and deadline) that the founder can review and act on immediately
```

## Business Logic

**Domain rule (one sentence):** From unstructured relationship notes, AI extracts
commitments and generates prioritized follow-up actions.

**Inputs:** Raw text — meeting notes, email thread, call transcript, or any
unstructured text describing an interaction with a company. When processing new
content, the AI also retrieves and considers the company's existing interaction
history and open task list, so it can surface net-new actions rather than
duplicating what is already tracked.

**Output:** The founder encounters a relationship summary (what was discussed, what
was promised, current status inference) and a small set of specific, prioritized
tasks with deadlines. Each extracted commitment is traceable to the source passage.

**Rule boundaries:** The AI does not generate advice, recommendations, or
relationship coaching. It extracts what is already present in the content and
structures it. It does not invent follow-ups that weren't implied by the text.

## Non-Functional Requirements

- **Background processing:** AI summary and task generation is non-blocking. After
  the founder submits content, the app remains fully usable; a visual indicator shows
  that processing is in progress. The founder is notified when results are ready.
  No hard latency cap — correctness and completeness take priority over speed.

- **Content privacy:** Uploaded and pasted content is never used to train or
  fine-tune any third-party AI model. This is a binding privacy commitment to the
  user. Only providers with explicit no-training guarantees are eligible for use.

- **Citation requirement:** Every commitment, promise, or decision the AI surfaces
  in a summary must include a citation to the exact source passage from the uploaded
  content. Uncited claims must not appear in output.

- **Desktop browser support:** The app must work correctly on current versions of
  Chrome, Firefox, and Safari on desktop. Mobile browser support is out of scope
  for v1.

## Non-Goals

- **No AI chat per company (v2).** Contextual Q&A against relationship history is
  out of scope for v1. The entire AI surface is upload-to-summary-and-tasks.
  Rationale: requires a RAG pipeline; proves the product before adding complexity.

- **No proactive reminder / urgency engine (v2).** No background jobs that
  surface cold relationships or overdue promises. Urgency is conveyed through
  task priority in the global task list — not push notifications or automated alerts.
  Rationale: requires background job infrastructure before the core loop is proven.

- **No external integrations (v1 and near-term).** Gmail, Slack, Notion, LinkedIn,
  Google Calendar, and all other integrations are explicitly out of scope until
  after the core loop is validated. v1 works exclusively with pasted text and
  optional .md file uploads.
  Rationale: integrations add auth complexity, API surface maintenance, and scope.
  The zero-friction thesis is tested with plain text first.

- **No multi-user or team features.** No sharing, co-founder workspace, read-only
  viewer, or role system. Single-user, single-workspace only.
  Rationale: confirmed in Phase 2 — this is a solo tool.

## Timeline acknowledgment

Acknowledged on 2026-05-25: 4–6 week MVP (recorded as 5 weeks midpoint) requires
sustained after-hours dedication across evenings and weekends. User accepted with
explicit awareness of the effort cost.

## Quality cross-check

Checked on 2026-05-25. All 5 greenfield elements present. Status: accepted.

| Element              | Result  | Note                                                  |
|----------------------|---------|-------------------------------------------------------|
| Access Control       | present | email + OAuth, flat single-user model                 |
| Business Logic       | present | one-sentence rule: commitment extraction + tasks      |
| Project artifacts    | present | shape-notes.md with valid checkpoint                  |
| Timeline-cost ack    | present | 4–6 week, after-hours; accepted 2026-05-25            |
| Non-Goals            | present | 4 entries: chat, reminders, integrations, multi-user  |
| Preserved behavior   | n/a     | greenfield                                            |


