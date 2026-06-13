---
project: AI Relationship & Fundraising Assistant
version: 1
status: draft
created: 2026-06-13
updated: 2026-06-13
prd_version: 1
main_goal: speed
top_blocker: time
---

# Roadmap: AI Relationship & Fundraising Assistant

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

A solo founder mid-fundraise tracks 20–80 investor relationships with no single
source of truth, so commitments slip and follow-ups are forgotten. Existing CRMs
demand structured data entry, which founders won't do under pressure. The product
wedge — the one trait that, if removed, makes this indistinguishable from a generic
CRM — is that pasting raw text is the _entire_ effort: the product extracts the
summary and tasks, the founder only thinks. Primary use case is fundraising; the
upload-to-action loop must prove its value before anything else is built on top.

## North star

**S-02: Founder pastes notes and receives a cited summary + 1–5 action tasks** —
this is the validation milestone (the smallest end-to-end flow whose successful
delivery proves the core product hypothesis: that pasting text is enough). It is
placed as early as its Prerequisites allow because everything else only matters if
this loop works; it directly satisfies the PRD's primary Success Criterion (US-01).

## At a glance

| ID   | Change ID                | Outcome (user can …)                                             | Prerequisites    | PRD refs                                      | Status   |
| ---- | ------------------------ | ---------------------------------------------------------------- | ---------------- | --------------------------------------------- | -------- |
| F-01 | persistence-rls-baseline | (foundation) owner-scoped persistence + RLS convention live      | —                | NFR: privacy                                  | ready    |
| F-02 | background-ai-pipeline   | (foundation) async AI job + completion notification channel      | F-01             | NFR: background, NFR: privacy                 | proposed |
| S-01 | company-management       | add, edit, archive, list, and set status on companies            | F-01             | US-01, FR-001, FR-002, FR-003, FR-004, FR-005 | proposed |
| S-02 | paste-to-summary-tasks   | paste notes → cited summary + 1–5 prioritized tasks              | S-01, F-01, F-02 | US-01, FR-005, FR-006, FR-007, FR-008         | proposed |
| S-03 | global-task-list         | view/filter the global task list, complete, drill into a company | S-02             | FR-009, FR-011, FR-012, FR-015                | proposed |
| S-04 | manual-task-management   | create and edit manual tasks with priority and deadline          | S-02             | FR-010, FR-011, FR-012, FR-013, FR-014        | proposed |
| S-05 | csv-company-import       | bulk-add companies via CSV import                                | S-01, F-01       | FR-016, FR-001                                | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme                  | Chain                                      | Note                                                             |
| ------ | ---------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| A      | Trzon: dane → pętla AI | `F-01` → `S-01` → `S-02` → `S-03` / `S-04` | Główny tor wartości; gwiazda przewodnia `S-02` jak najwcześniej. |
| B      | Plumbing AI w tle      | `F-02`                                     | Buduj równolegle z `S-01`; dołącza do Stream A przy `S-02`.      |
| C      | Onboarding masowy      | `S-05`                                     | Odgałęzienie od `S-01`; równolegle z pętlą AI (cel: szybkość).   |

## Baseline

What's already in place in the codebase as of `2026-06-13` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — Astro 6 SSR + React 19 islands + Tailwind 4 + shadcn/ui (`src/layouts/Layout.astro`, `src/components/ui/button.tsx`, auth forms).
- **Backend / API:** partial — SSR API routes exist only for auth (`src/pages/api/auth/*`); no domain API (companies, tasks, analysis) yet.
- **Data:** absent — no `supabase/migrations/`, no schema or tables (only built-in `auth.users`).
- **Auth:** present — Supabase SSR client (`src/lib/supabase.ts`), middleware (`src/middleware.ts`), signin/signup/signout, email+password. OAuth (Google) from PRD not yet wired.
- **Deploy / infra:** present — Cloudflare Workers, deployed live (`context/deployment/deploy-plan.md`), `@astrojs/cloudflare` v13, CI (`.github/workflows/ci.yml`).
- **Observability:** absent — only `wrangler tail`; no logging library, error tracking, or metrics.

## Foundations

### F-01: Owner-scoped persistence + RLS convention

- **Outcome:** (foundation) Supabase migration tooling is wired and an owner-scoped, per-operation RLS policy template is established and verified, so every later entity persists privately to the authenticated founder by default.
- **Change ID:** persistence-rls-baseline
- **PRD refs:** NFR: privacy ("strictly private to the authenticated user; no leakage between accounts"); Access Control (single user, single workspace)
- **Unlocks:** S-01, S-02, S-03, S-04, S-05 (every persisted entity); reduces the blocking unknown "how is per-user data isolation enforced across all tables".
- **Prerequisites:** — (deploy + auth already present per Baseline)
- **Parallel with:** F-02 (after F-01's migration tooling lands, F-02 can proceed alongside S-01)
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Minimal enabler, not a schema build-out — it sets the tooling + RLS pattern only; entity tables arrive with their slices. Sequenced first because the privacy guardrail gates every slice and getting the RLS convention wrong later means reworking every table.
- **Status:** ready

### F-02: Background AI analysis job + completion notification

- **Outcome:** (foundation) submitting content can trigger a non-blocking async job that writes its result to the database, and the founder's browser is notified when the job completes — without blocking the UI.
- **Change ID:** background-ai-pipeline
- **PRD refs:** NFR: background processing ("non-blocking; visual indicator; notified when ready"); NFR: privacy ("only providers with explicit no-training guarantees"); US-01 acceptance ("analysis runs in the background; founder is notified")
- **Unlocks:** S-02 (north star) — provides the async-job + notify-on-complete plumbing the upload-to-action loop reuses; reduces the #1 architectural unknown (browser notification path is undefined per `context/foundation/infrastructure.md`).
- **Prerequisites:** F-01
- **Parallel with:** S-01
- **Blockers:** —
- **Unknowns:** — (both resolved 2026-06-13: notification path → client-side status polling; AI provider → Anthropic Claude API. See `## Open Roadmap Questions`.)
- **Risk:** Scoped to the _minimum_ plumbing (one async job + a status field the browser polls + the Anthropic API call), not "all background processing" — the extraction logic itself lives in S-02 and exercises this plumbing through the real user flow. The polling decision removes the WebSocket-through-Workers risk that infrastructure.md flagged as the project's highest; remaining work is a straightforward async job + status field.
- **Status:** proposed

## Slices

### S-01: Company management

- **Outcome:** Founder can add, edit, archive (soft-delete, data preserved), and list companies, and set a relationship status manually.
- **Change ID:** company-management
- **PRD refs:** US-01, FR-001, FR-002, FR-003, FR-004, FR-005 (manual status set; AI inference of status is in S-02)
- **Prerequisites:** F-01
- **Parallel with:** F-02
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Straightforward owner-scoped CRUD on top of F-01's RLS convention; sequenced before the north star because the AI loop needs a company to attach content to. Low risk, high unlock value.
- **Status:** proposed

### S-02: Paste notes → cited summary + tasks (north star)

- **Outcome:** Founder pastes text (or attaches a .md file) on a company, and — after background analysis — sees a relationship summary with a source citation for every commitment, an inferred relationship status, and 1–5 high-specificity tasks with proposed priority and deadline, shown on the company page.
- **Change ID:** paste-to-summary-tasks
- **PRD refs:** US-01, FR-005 (AI status inference), FR-006, FR-007, FR-008
- **Prerequisites:** S-01, F-01, F-02
- **Parallel with:** S-05
- **Blockers:** —
- **Unknowns:**
  - How is "every commitment includes a citation to the exact source passage" enforced so uncited claims never appear (accuracy guardrail)? — Owner: user/team. Block: no.
  - How is analysis made history-aware (consider existing tasks/interactions so surfaced actions are net-new, per Business Logic)? — Owner: team. Block: no.
- **Risk:** This is the validation milestone and the deepest investment area (extraction quality, citations, no-hallucination). It creates the content-submission and tasks tables as part of its vertical. Risk concentrates in extraction accuracy, not plumbing (plumbing is F-02). If citations/accuracy are weak, the product wedge collapses — so this slice is where care is spent, not speed.
- **Status:** proposed

### S-03: Global task list

- **Outcome:** Founder can view a global task list across all companies, filter by priority / deadline / urgency (overdue, due today), complete or dismiss tasks (including read-only AI tasks), and drill down into a single company's tasks.
- **Change ID:** global-task-list
- **PRD refs:** FR-009, FR-011 (AI tasks complete/dismiss only), FR-012, FR-015
- **Prerequisites:** S-02
- **Parallel with:** S-04
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Read-and-filter surface over the tasks created in S-02; the global list is the primary task interface per PRD, so getting filtering right matters, but the data model is already settled. Moderate-low risk.
- **Status:** proposed

### S-04: Manual task management

- **Outcome:** Founder can create tasks manually (no content submission), edit manual tasks, set/override priority and deadline on them, and mark any task complete — keeping the task list useful even with no new notes.
- **Change ID:** manual-task-management
- **PRD refs:** FR-010, FR-011 (manual tasks editable), FR-012, FR-013 (override priority), FR-014 (override deadline)
- **Prerequisites:** S-02
- **Parallel with:** S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Delivers the secondary Success Criterion (task list useful without AI). Reuses the tasks table from S-02 and must respect the AI-vs-manual editability split (FR-011); the only subtlety is enforcing that AI tasks stay read-only. Low risk.
- **Status:** proposed

### S-05: CSV company import

- **Outcome:** Founder can bulk-add many companies at once via CSV import.
- **Change ID:** csv-company-import
- **PRD refs:** FR-016, FR-001
- **Prerequisites:** S-01, F-01
- **Parallel with:** S-02, F-02
- **Blockers:** —
- **Unknowns:**
  - What is the minimum accepted CSV shape / column mapping for the founder's existing spreadsheet? — Owner: user. Block: no.
- **Risk:** PRD-designated adoption gate (a founder with 80 companies won't onboard via manual add). Independent of the AI loop, so it parallelizes; under the speed goal it can run alongside S-02 in a separate agent pass without contending for the north-star path.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID                | Suggested issue title                                     | Ready for `/10x-plan` | Notes                                                                    |
| ---------- | ------------------------ | --------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------ |
| F-01       | persistence-rls-baseline | Persistence + owner-scoped RLS baseline                   | yes                   | Run `/10x-plan persistence-rls-baseline` — unlocks the north star        |
| F-02       | background-ai-pipeline   | Background AI job + completion notification plumbing      | no                    | Needs F-01; resolve notification-path + AI-provider unknowns in planning |
| S-01       | company-management       | Company management (add / edit / archive / list / status) | no                    | Needs F-01                                                               |
| S-02       | paste-to-summary-tasks   | Paste notes → cited summary + tasks (north star)          | no                    | Needs S-01, F-01, F-02                                                   |
| S-03       | global-task-list         | Global task list with filtering and drill-down            | no                    | Needs S-02                                                               |
| S-04       | manual-task-management   | Manual task creation and editing                          | no                    | Needs S-02                                                               |
| S-05       | csv-company-import       | CSV bulk company import                                   | no                    | Needs S-01, F-01; parallel with the AI loop                              |

## Open Roadmap Questions

1. ~~**AI completion → browser notification path.**~~ **Resolved 2026-06-13: client-side status polling** for MVP (no Supabase Realtime/WebSocket). Avoids the highest technical risk in infrastructure.md and fits the speed goal; the PRD imposes no latency cap. Realtime stays a post-MVP UX upgrade. Unblocked F-02, S-02.
2. ~~**AI provider with an explicit no-training guarantee.**~~ **Resolved 2026-06-13: Anthropic Claude API** (no training on commercial-API data; citations enforced via structured outputs). Recorded in `tech-stack.md`. Model tier decided in `/10x-plan`. Unblocked F-02, S-02.
3. **`target_scale.qps` and `target_scale.data_volume` (carried from PRD Open Questions).** Set to `low`/`small` as ballpark; revisit if usage differs. — Owner: user. Block: roadmap-wide (none — non-blocking).

## Parked

- **OAuth (Google) login** — Why parked: Access Control allows "email+password OR OAuth"; email+password is already present in the baseline, so access is satisfied. Deferred under the speed goal; promote to a slice if social login becomes a real onboarding need.
- **AI chat / contextual Q&A per company** — Why parked: PRD §Non-Goals (v2; requires a RAG pipeline — prove the core loop first).
- **Proactive reminder / urgency engine** — Why parked: PRD §Non-Goals (v2; urgency is conveyed via task priority + filtering, not background alerts).
- **External integrations (Gmail, Slack, Notion, LinkedIn, Calendar)** — Why parked: PRD §Non-Goals (v1 works with pasted text + optional .md only).
- **Multi-user / team features** — Why parked: PRD §Non-Goals (solo tool by design).
- **Mobile browser support** — Why parked: PRD §Guardrails / NFR (desktop-only for v1).

## Done

(Empty on first generation. `/10x-archive` appends here — and flips the item's `Status` to `done` — when a change whose `Change ID` matches an item is archived.)
