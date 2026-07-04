# Company Management (S-01) — Plan Brief

> Full plan: `context/changes/company-management/plan.md`

## What & Why

Build the first domain vertical of the CRM: owner-scoped **company management** — add, edit, archive (soft-delete), list, and manually set relationship status on companies. It's the prerequisite the north star (S-02) attaches content to, and it sets the project-wide patterns (JSON+zod API, service layer, shared types, Astro-page + React-island UI) that every later slice reuses.

## Starting Point

F-01 (`persistence-rls-baseline`) is complete: migration tooling + npm scripts, the shared `set_updated_at()` trigger, a typed `Database` client (`createServerClient<Database>`, null when unconfigured), a copy-paste RLS convention doc, and a two-user isolation test harness. There are **no domain tables yet** (`database.types.ts` has zero tables), no `src/types.ts`, no `src/lib/services/`, and the only existing API routes are auth (form-post + redirect, no zod).

## Desired End State

A signed-in founder visits `/companies`, sees only their own active companies, and can add one, change its status inline, edit its name in a modal, and archive it (it leaves the active list but the row is preserved with `archived_at`). RLS enforces per-user privacy at the DB, zod validates at the API, types flow end-to-end, and automated tests prove user A can't touch user B's companies.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Table columns | `name` + `status` + `archived_at` only | Smallest table satisfying FR-001–005; notes/content come in S-02 | Plan |
| Status storage | `text` + CHECK over 5 values (+ TS union) | Trivial to evolve vs `ALTER TYPE`; plays well with typegen | Plan |
| Archive model | `archived_at timestamptz null`; list hides non-null | Lifecycle stays orthogonal to the `inactive` status value | Plan |
| API contract | JSON endpoints + zod validation | Matches CLAUDE.md; typed contracts S-02's loop needs; testable | Plan |
| UI shape | Astro page shell + React island for list/CRUD | Matches existing island pattern; keeps interactive state in React | Plan |
| Status & edit UX | Inline status dropdown on list + modal edit form | Status is the most-changed field; one reusable add/edit form | Plan |
| Testing | Companies RLS isolation test + zod validator unit tests | Guards the binding privacy NFR on the first real table | Plan |

## Scope

**In scope:** `companies` migration (RLS template + status CHECK + `archived_at`); regenerated types + new `src/types.ts`; `zod`; companies service; JSON CRUD API (GET/POST/PATCH/DELETE-as-archive); route guard; `/companies` page + React island (list, inline status, modal add/edit, archive); isolation + validator tests.

**Out of scope:** AI status inference (S-02), CSV import (S-05), content/summaries/tasks + company detail page (S-02–S-04), `notes`/free-text fields, hard delete, DB-in-CI.

## Architecture / Approach

Bottom-up, one verifiable layer per phase: **DB + types → service + zod + API → UI → tests.** The migration copies `docs/reference/rls-convention.md` and adds three columns. The service (`src/lib/services/companies.ts`) centralizes all Supabase queries plus the `archived_at is null` default; thin JSON routes validate with zod over it; the React island talks to that API. `DELETE` performs a soft archive (UPDATE `archived_at`), never a SQL delete.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Data layer | `companies` migration, regenerated types, `src/types.ts` | Typegen/CHECK ↔ TS union drift |
| 2. API + service | zod, service layer, JSON CRUD routes, route guard | Silent-filter gotcha on update/archive; client null-check |
| 3. UI | `/companies` page + React island (list/inline-status/modal/archive) | Optimistic-update rollback; first-paint data path |
| 4. Tests | Companies isolation test + zod validator unit tests | Needs local stack; asserting empty `.select()` not thrown errors |

**Prerequisites:** local Supabase stack runnable (Docker) for Phases 1 & 4; F-01 complete (it is).
**Estimated effort:** ~2–3 sessions across 4 phases (small code volume; care on the RLS/isolation semantics).

## Open Risks & Assumptions

- **Silent-filter gotcha**: RLS UPDATE/DELETE on another user's row returns success affecting zero rows — tests assert empty `.select()`, not thrown errors.
- `archived_at` (lifecycle) must stay distinct from `status='inactive'` (relationship state) — the default list filter is `archived_at is null`.
- The status CHECK constraint and the `CompanyStatus` TS union are two copies of one truth; a new value edits both.
- Isolation test is a **local gate**, not CI (consistent with F-01).

## Success Criteria (Summary)

- Founder can add / edit / archive / list companies and set status inline; archived companies leave the active list but persist.
- `npm run db:reset`, `typecheck`, `lint`, `build` all pass; `npm test` proves companies per-user isolation + validator behavior.
- A second signed-in user sees none of the first user's companies.
