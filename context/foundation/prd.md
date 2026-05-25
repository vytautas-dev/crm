---
project: AI Relationship & Fundraising Assistant
version: 1
status: draft
created: 2026-05-25
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 5
  hard_deadline: null
  after_hours_only: true
---

## Vision & Problem Statement

A solo founder raising a round or managing active deal flow simultaneously tracks
20–80 investor and partner relationships with no single source of truth. There is no
place that shows the current stage of each relationship, what has been discussed,
what was promised, and what requires urgent action. The result: commitments fall
through the cracks, follow-ups are forgotten, and business momentum disappears — not
because the founder is careless, but because no existing tool matches how founders
actually work.

The insight that makes this product worth building: existing CRM and relationship
management tools require structured data entry. Founders do not do structured data
entry under pressure. They write notes, paste transcripts, and move on. The product
survives adoption only if pasting raw text is the entire effort required to keep the
system current — the product does the extraction; the founder does the thinking.
Primary use case is fundraising — tracking investor relationships, round stage,
commitments, and follow-ups. Partnerships and BD are in scope but secondary.

## User & Persona

**Primary persona:** A solo founder (pre-seed to Series A) running an active
fundraise or managing ongoing investor relations. Simultaneously tracking 20–80
companies. Works alone or with at most one EA; no shared CRM workflow needed in v1.
Single named user — one account, one workspace, no roles or team sharing in MVP.

**Pain trigger moment:** Mid-fundraise, when 30+ investor relationships are live and
the founder's only system is four open browser tabs, a Notion page, a spreadsheet,
and memory.

## Success Criteria

### Primary

The upload-to-action loop works end-to-end: the founder adds a company, submits
text or a file containing meeting notes, a transcript, or an email thread, and
receives a relationship summary and 1–5 action tasks with priority and deadline.
A founder who completes these steps for their first company in under 10 minutes
without reading documentation proves the product works.

### Secondary

The founder can create tasks manually without submitting any content, keeping the
task list useful even when no new notes exist.

### Guardrails

- Submitted content must remain strictly private to the authenticated user. No
  leakage between accounts; no data exposure beyond the processing provider.
- The product must not fabricate commitments, promises, or decisions absent from the
  submitted content. When uncertain, the product must signal uncertainty rather than
  invent.
- Tasks must never silently disappear. Data loss breaks trust immediately and
  irreversibly.
- The product must work on a desktop or laptop computer browser. Mobile browser
  support is not in scope for v1.

## User Stories

### US-01: Submit relationship notes and receive summary and tasks

- **Given** the founder has added a company and is on the company detail page
- **When** they paste text (or upload a .md file) containing meeting notes, a
  transcript, or an email thread
- **Then** the product generates a relationship summary with a source citation for
  each extracted commitment, and 1–5 high-specificity action tasks with proposed
  priority and deadline, available for the founder to review and act on

#### Acceptance Criteria

- Every commitment or promise surfaced in the summary includes a citation to the
  exact passage in the submitted content
- Tasks are specific and actionable, not generic (e.g., not "follow up")
- Analysis runs in the background; the founder can navigate away and return to find
  results ready
- The founder receives a notification when results are available

## Functional Requirements

### Company Management

- FR-001: Founder can add a company. Priority: must-have
  > Socrates: Counter considered: "bulk import beats manual add for 80 companies."
  > Resolution: FR-016 added as must-have CSV import. Manual add is still needed
  > for one-off additions.

- FR-002: Founder can edit a company. Priority: must-have
  > Socrates: No counter-argument raised; stands as written.

- FR-003: Founder can archive a company (data preserved, company hidden from the
  active list). Priority: must-have
  > Socrates: Counter accepted: permanent deletion destroys uploaded notes and
  > task history. Revised from "delete" to "archive." Permanent deletion removed
  > from scope.

- FR-004: Founder can view the full company list. Priority: must-have
  > Socrates: No counter-argument raised; stands as written.

- FR-005: Founder can set a company relationship status (lead / in progress /
  negotiating / investor / inactive); the product infers status from submitted
  content; founder can override manually. Priority: must-have
  > Socrates: Counter accepted: manual-only status contradicts the zero-friction
  > thesis. Revised: product infers, founder overrides.

- FR-016: Founder can add multiple companies via CSV import. Priority: must-have
  > Socrates: Promoted from nice-to-have: a founder with 80 companies will not
  > onboard via manual add. CSV import is an adoption gate.

### Content Submission & Analysis

- FR-006: Founder can paste text (email thread, transcript, raw notes) into a
  company; optionally attach a .md file. Text paste is the primary input path.
  Priority: must-have
  > Socrates: Counter accepted: founders rarely have .md files — they have emails
  > and documents. Text paste is more frictionless than file upload. File
  > attachment kept as optional alternative.

- FR-007: The product generates a relationship summary from submitted content —
  including what was discussed, what was promised, and an inferred relationship
  status. Every extracted commitment includes a citation to the source passage.
  Priority: must-have
  > Socrates: Counter accepted: one hallucinated commitment poisons the entire
  > product. Resolution: source citation required. Accuracy takes priority over
  > completeness. Confidence signal required before shipping.

- FR-008: The product generates 1–5 high-specificity action tasks from submitted
  content. Generic tasks are a failure mode. Priority: must-have
  > Socrates: Counter accepted: vague tasks become noise and get ignored.
  > Resolution: quality over quantity — max 5, specificity required.

### Task Management

- FR-009: Founder can view a global task list across all companies, filtered by
  priority, deadline, and urgency (overdue / due today). Priority: must-have
  > Socrates: Counter accepted: an unfiltered list across 80 companies becomes
  > overwhelming. Resolution: filtering by urgency/overdue/today is built in.
  > Per-company task view is a drill-down within the global list.

- FR-010: Founder can create a task manually. Priority: must-have
  > Socrates: No counter-argument raised; stands as written.

- FR-011: Product-generated tasks are read-only (can only be completed or
  dismissed). Manually created tasks can be edited. Priority: must-have
  > Socrates: Counter accepted: prohibiting edits on product-generated tasks
  > preserves the integrity of the extracted decisions. Clean separation between
  > extracted and manual tasks.

- FR-012: Founder can mark any task (product-generated or manual) as complete.
  Priority: must-have
  > Socrates: No counter-argument raised; stands as written.

- FR-013: The product proposes task priority (low / medium / high / urgent);
  founder can override priority on manually created tasks. Priority: must-have
  > Socrates: Kept: product proposes, founder overrides. Full trust-the-product
  > approach rejected; manual override is essential.

- FR-014: The product proposes a task deadline; founder can override deadline on
  manually created tasks. Priority: must-have
  > Socrates: Counter accepted: proposed deadlines ("next week") will often be
  > wrong. Founder override is essential. Product proposes, founder corrects.

- FR-015: Founder can view per-company tasks as a filtered drill-down from the
  global task list. Priority: must-have
  > Socrates: Reframed from standalone per-company view to a filtered drill-down
  > within the global task view. Global list is the primary interface.

## Non-Functional Requirements

- The product remains responsive and navigable while content analysis runs. The
  founder receives visible feedback that analysis is in progress, and a notification
  when results are ready. Accuracy and completeness take priority over analysis
  speed; no hard latency cap is imposed.

- Submitted content (pasted text, attached files) is never used to train or
  fine-tune any model. This is a binding privacy commitment to the user.

- Every commitment, promise, or decision surfaced in a relationship summary includes
  a citation to the exact source passage from the submitted content. Output not
  traceable to the source must not appear.

- The product works correctly on current major versions of mainstream desktop
  browsers. Mobile browser support is not in scope for v1.

## Business Logic

From unstructured relationship notes, the product extracts commitments and generates
prioritized follow-up actions.

The inputs are raw text submitted by the founder — meeting notes, an email thread, a
call transcript, or any other unstructured text describing an interaction with a
company. When new content is submitted for a company, the analysis takes into account
the company's existing interaction history and open task list, ensuring that surfaced
actions are net-new rather than a repeat of what is already tracked.

The output the founder encounters is a relationship summary — what was discussed,
what was promised, and the inferred current status of the relationship — and a small
set of specific, prioritized tasks with deadlines. Each extracted commitment is
traceable to the source passage in the submitted content.

The product does not generate advice, recommendations, or relationship coaching. It
extracts what is present in the content and structures it. It does not invent
follow-ups that were not implied by the submitted text.

## Access Control

Login: email and password, or a linked social identity provider. Standard web
authentication; data is persisted server-side so the founder can access from any
device.

Single user, single workspace, flat role. The founder sees and can edit everything.
There is no admin/member split, no read-only viewer, no team sharing, and no role
separation in v1. This is a solo tool.

## Non-Goals

- **No contextual Q&A chat per company (v2).** The product does not support asking
  questions about a relationship or its history. The entire product-generated
  intelligence surface is content submission → summary and tasks. Rationale: a
  contextual retrieval Q&A pipeline requires meaningfully larger scope; the
  summary-and-tasks loop must prove value first.

- **No proactive relationship alerts or urgency engine (v2).** The product does not
  proactively surface cold relationships, overdue promises, or risk signals via
  automated notifications or background alerts. Urgency is conveyed through task
  priority and filtering in the global task list. Rationale: background scheduling
  infrastructure adds scope before the core loop is proven.

- **No external service integrations.** Email, messaging, document, calendar, and
  professional-network integrations are out of scope until the core loop is
  validated. v1 works exclusively with pasted text and optional .md file attachments.
  Rationale: integrations add authentication complexity and ongoing maintenance
  before the product's fundamental value is proven.

- **No multi-user or team features.** No sharing, no co-founder workspace, no
  read-only viewer, no role system. Single user, single workspace only. Rationale:
  this is a solo tool by design.

## Open Questions

1. **`target_scale.qps` and `target_scale.data_volume`** — Set to `low` and `small`
   as ballpark estimates based on the 1–10 user scope and expected note-paste volume.
   Revisit if usage patterns differ from expectations. Owner: user. No blocking
   dependency.
