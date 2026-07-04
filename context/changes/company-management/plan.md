# Company Management (S-01) Implementation Plan

## Overview

Deliver the first domain vertical of the CRM: owner-scoped **company management** — the founder can add, edit, archive (soft-delete, data preserved), list, and manually set the relationship status of companies. This slice rides entirely on the F-01 `persistence-rls-baseline` foundation (migration tooling, `set_updated_at()` trigger, typed `Database` client, and the copy-paste RLS convention) and establishes the project-wide patterns — JSON+zod API, `src/lib/services/` layer, `src/types.ts` shared types, Astro-page + React-island UI — that S-02–S-05 inherit.

## Current State Analysis

- **Persistence foundation is complete (F-01).** `docs/reference/rls-convention.md` holds the canonical owner-scoped table block; `supabase/migrations/20260613183357_set_updated_at_function.sql` defines the shared `public.set_updated_at()` trigger function. npm scripts `db:new` / `db:reset` / `db:types` are wired (`package.json:14-16`).
- **Typed client path exists.** `src/lib/supabase.ts` exports `createClient(headers, cookies)` → `createServerClient<Database>` and returns `null` when env is absent (`src/lib/supabase.ts:6-9`). `src/db/database.types.ts` is generated but currently has **no tables** (`public.Tables` = `never`).
- **Auth + middleware.** `src/middleware.ts` attaches `context.locals.user` and redirects unauthenticated users away from `PROTECTED_ROUTES` (currently only `/dashboard`). Domain routes and APIs must be added to this guard.
- **Existing API pattern is form-post + redirect, no zod** (`src/pages/api/auth/signin.ts`). CLAUDE.md's stated convention is "uppercase GET/POST exports; validate input with zod." **Decision (this plan): domain APIs use JSON + zod** — the auth routes stay as-is; new routes set the go-forward pattern.
- **UI pattern.** React islands (`src/components/auth/SignInForm.tsx` with `FormField`/`SubmitButton`/`ServerError`) mounted in Astro pages; `cn()` helper (`src/lib/utils.ts`); shadcn "new-york", only `button.tsx` installed. `src/types.ts` does **not** exist yet (CLAUDE.md designates it for shared entities/DTOs).
- **Test harness exists.** `tests/rls-canary.test.ts` + `supabase/tests/fixtures/canary_table.sql` prove two-user isolation via Vitest against the local stack; this is the template for the companies isolation test.
- **`zod` is not yet a dependency** — must be added in Phase 2.

## Desired End State

A signed-in founder visits `/companies` and sees only their own non-archived companies. They can add a company (name required, optional status), change a company's status inline from the list, edit its name, and archive it (it disappears from the active list but the row is preserved with an `archived_at` timestamp). Every operation is enforced private per-user by RLS at the database layer, validated by zod at the API layer, and typed end-to-end. Automated tests prove user A cannot read/update/archive user B's companies, and that the zod validators reject malformed input.

**Verification:** `npm run db:reset` applies the companies migration cleanly; `npm run typecheck`, `npm run lint`, `npm run build` pass; `npm test` passes including the new companies isolation + validator tests; manual UI walkthrough of add/edit/archive/status works and shows no other user's data.

### Key Discoveries:

- RLS template to copy verbatim: `docs/reference/rls-convention.md:19-43` (id/user_id/created_at/updated_at + 4 per-op policies + `set_<entity>_updated_at` trigger).
- **Silent-filter gotcha** (`docs/reference/rls-convention.md:66-76`): RLS UPDATE/DELETE against another user's row affects **zero rows and returns success** — never assert isolation by expecting a thrown error; chain `.select()` and assert an empty array, or read back as the real owner.
- Typed client is generic over `Database` (`src/lib/supabase.ts:10`) — after the migration, `npm run db:types` makes `companies` fully typed for the service layer.
- Client can be `null` (`src/lib/supabase.ts:6-9`) — every API route must null-check before use, like `signin.ts:10-12`.

## What We're NOT Doing

- **No AI status inference** — FR-005's "product infers status" is S-02. This slice is manual status only.
- **No CSV / bulk import** — that is S-05 (`csv-company-import`).
- **No content submission, summaries, tasks, or company detail page** — S-02/S-03/S-04. `/companies/[id]` is intentionally deferred; editing happens in a modal.
- **No `notes` or free-text company fields** — deferred; notes arrive via S-02 content submission.
- **No permanent delete** — PRD FR-003 replaced delete with archive; the DELETE endpoint performs a soft archive, and the RLS DELETE policy stays only for the canary/convention completeness.
- **No new shadcn components beyond what's needed** — reuse `button.tsx`; add only a minimal select/dialog primitive if required (prefer native `<select>` + a lightweight modal to avoid scope creep).
- **No wiring DB tests into GitHub CI** — CI stays lint+build; the isolation test is a local gate (consistent with F-01).

## Implementation Approach

Bottom-up, one verifiable layer per phase: **DB + types → service + zod + API → UI → tests.** The migration copies the RLS convention block and adds three entity columns (`name`, `status`, `archived_at`). The service layer centralizes all Supabase queries (so RLS filtering + the `archived_at is null` default live in one place), API routes are thin zod-validated JSON handlers over the service, and the UI is a React island that talks to the JSON API. Tests extend the existing canary harness to the real table.

## Critical Implementation Details

- **Archive vs. status are orthogonal.** `archived_at` (lifecycle) is a separate column from `status='inactive'` (relationship state). The default list filters `archived_at is null`; `inactive` companies still show in the active list. Do not conflate them.
- **The `status` CHECK constraint and the TS union must stay in lockstep.** The 5 values (`lead`, `in_progress`, `negotiating`, `investor`, `inactive`) are defined once in SQL (CHECK) and once as `CompanyStatus` in `src/types.ts`. A new value means editing both.
- **DELETE endpoint = soft archive.** `DELETE /api/companies/[id]` sets `archived_at = now()` via UPDATE; it does not issue a SQL DELETE. Chain `.select()` and assert a row came back to distinguish "archived mine" from "silently matched nothing."

## Phase 1: Data layer — companies table, types, shared entity types

### Overview

Create the `companies` table from the RLS convention, regenerate DB types, and establish `src/types.ts` with the `Company` entity, `CompanyStatus` union, and CRUD DTOs.

### Changes Required:

#### 1. Companies migration

**File**: `supabase/migrations/<timestamp>_create_companies.sql` (via `npm run db:new create_companies`)

**Intent**: Create the owner-scoped `companies` table by copying the canonical RLS block and filling in entity columns, so companies persist strictly private to the authenticated founder.

**Contract**: Copy `docs/reference/rls-convention.md:19-43` verbatim with `<entity>` = `companies`. Entity columns between `user_id` and `created_at`:
- `name text not null`
- `status text not null default 'lead' check (status in ('lead','in_progress','negotiating','investor','inactive'))`
- `archived_at timestamptz` (nullable; null = active)

Keep the fixed template unchanged: `id`, `user_id uuid ... references auth.users(id) on delete cascade default auth.uid()`, `created_at`, `updated_at`, `enable row level security`, the `set_companies_updated_at` trigger, and all four per-operation `authenticated` policies.

#### 2. Regenerate database types

**File**: `src/db/database.types.ts` (generated)

**Intent**: Make `companies` fully typed for the service layer.

**Contract**: Run `npm run db:reset` then `npm run db:types`. `Database["public"]["Tables"]["companies"]` now exposes `Row`/`Insert`/`Update`. Do not hand-edit this file.

#### 3. Shared entity + DTO types

**File**: `src/types.ts` (new)

**Intent**: Establish the project's shared-types home with the company entity, status union, and request DTOs the API + UI both import.

**Contract**: Export:
- `CompanyStatus` — union of the 5 status literals (single source mirroring the SQL CHECK).
- `Company` — alias of `Tables<'companies'>` (from `@/db/database.types`), or a hand-authored row shape if typegen is empty at author time.
- `CreateCompanyInput` (`{ name: string; status?: CompanyStatus }`) and `UpdateCompanyInput` (`{ name?: string; status?: CompanyStatus }`) as the DTO contracts. Also export a `COMPANY_STATUSES` readonly array for UI dropdowns + zod enum reuse.

### Success Criteria:

#### Automated Verification:
- Migration applies cleanly: `npm run db:reset`
- Types regenerate with the table present: `npm run db:types` then `grep -q "companies" src/db/database.types.ts`
- Type checking passes: `npm run typecheck`
- Linting passes: `npm run lint`

#### Manual Verification:
- In local Supabase Studio, `companies` exists with RLS enabled, the CHECK constraint, and 4 policies.
- Inserting a row as a signed-in user works; the `updated_at` trigger fires on update.

**Implementation Note**: After automated verification passes, pause for human confirmation of the Studio check before Phase 2.

---

## Phase 2: API + service layer — zod, service, JSON routes, route guard

### Overview

Add `zod`, build the companies service (all Supabase queries + the active-list filter), expose zod-validated JSON CRUD routes, and protect the new routes in middleware.

### Changes Required:

#### 1. Add zod

**File**: `package.json`

**Intent**: Bring in the validation library CLAUDE.md's API convention calls for.

**Contract**: `npm install zod`; it appears under `dependencies`.

#### 2. Zod schemas

**File**: `src/lib/validation/companies.ts` (new)

**Intent**: Single source of API input validation, reused by routes and unit tests.

**Contract**: Export `createCompanySchema` (`name`: trimmed, 1–200 chars; `status`: optional `z.enum` over `COMPANY_STATUSES`) and `updateCompanySchema` (all fields optional, but reject an empty object). Infer types align with `CreateCompanyInput`/`UpdateCompanyInput`.

#### 3. Companies service

**File**: `src/lib/services/companies.ts` (new)

**Intent**: Centralize every companies query so RLS filtering, the `archived_at is null` default, and archive semantics live in one tested place.

**Contract**: Functions take a non-null Supabase client (typed `SupabaseClient<Database>`) and return typed results / a discriminated error. Provide:
- `listActiveCompanies(client)` → rows where `archived_at is null`, ordered by `created_at desc`.
- `createCompany(client, input: CreateCompanyInput)` → inserts `{ name, status }` (omit `user_id`; `default auth.uid()` + INSERT `with check` handle ownership), returns the created row.
- `updateCompany(client, id, input: UpdateCompanyInput)` → UPDATE `.eq('id', id)` chained with `.select()`; empty returned array = not-found/not-owned.
- `archiveCompany(client, id)` → UPDATE sets `archived_at = new Date().toISOString()`, chained `.select()`.
Do not add a hard-delete function.

#### 4. JSON API routes

**Files**: `src/pages/api/companies/index.ts` (new), `src/pages/api/companies/[id].ts` (new)

**Intent**: Thin HTTP layer over the service — null-check client, require auth, validate with zod, map to JSON + status codes.

**Contract**:
- `index.ts`: `GET` → `{ companies: Company[] }`; `POST` → parse body with `createCompanySchema`, 400 on failure, 201 with the created company.
- `[id].ts`: `PATCH` → `updateCompanySchema`, 404 when the service returns empty, 200 with updated company; `DELETE` → `archiveCompany`, 404 when empty, 200 with archived company.
- Every handler: `createClient(...)` null → 503 JSON; `context.locals.user` falsy → 401 JSON. Return shape `{ error: string }` on failures. Use `new Response(JSON.stringify(...), { status, headers: { 'content-type': 'application/json' } })`.

#### 5. Route protection

**File**: `src/middleware.ts`

**Intent**: Require auth for the companies UI and API.

**Contract**: Add `/companies` and `/api/companies` to `PROTECTED_ROUTES`. Confirm the existing `startsWith` check covers `/api/companies/*`. (API routes may additionally return 401 JSON rather than redirect — the in-handler auth check in #4 covers that; the middleware guard covers the page.)

### Success Criteria:

#### Automated Verification:
- `zod` present: `grep -q '"zod"' package.json`
- Type checking passes: `npm run typecheck`
- Linting passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:
- `curl`/REST against a signed-in session: GET returns only own companies; POST with valid body creates; POST with empty name → 400; PATCH bad id → 404; DELETE archives (row hidden from GET, still in DB).
- Hitting `/api/companies` unauthenticated → 401 (or redirect for the page).

**Implementation Note**: Pause for human confirmation of the manual API checks before Phase 3.

---

## Phase 3: UI — companies page + React island

### Overview

A protected `/companies` Astro page mounts a React island that lists companies, changes status inline, adds/edits via a modal form, and archives — all via the Phase 2 JSON API.

### Changes Required:

#### 1. Companies page shell

**File**: `src/pages/companies.astro` (new)

**Intent**: Protected route that renders the island; optionally pass server-fetched initial companies as a prop to avoid an initial spinner.

**Contract**: Uses `Layout.astro`; reads `Astro.locals.user` (middleware already guards it). Mounts `<CompaniesView client:load />`. May server-call `listActiveCompanies` and pass `initialCompanies` for first paint.

#### 2. Companies island

**File**: `src/components/companies/CompaniesView.tsx` (new) + supporting components

**Intent**: The interactive CRUD surface.

**Contract**: 
- Renders a list; each row shows name, an **inline status `<select>`** (change → `PATCH /api/companies/[id]` with optimistic update + rollback on failure), an **Edit** button (opens modal), and an **Archive** button (`DELETE` → remove from list).
- An **Add company** button opens the same modal form (name + status) → `POST`.
- Empty state when no active companies; error + loading states.
- Reuse `button.tsx`, the `FormField` input pattern, and `cn()`. Keep a single reusable `CompanyForm` for add + edit. Prefer a lightweight modal (native `<dialog>` or a small controlled component) over pulling in a new shadcn dialog unless needed.

#### 3. Navigation entry (optional, low-cost)

**File**: `src/components/Topbar.astro`

**Intent**: Make `/companies` reachable.

**Contract**: Add a link to `/companies` for signed-in users if the Topbar renders nav; skip if it doesn't fit the existing structure.

### Success Criteria:

#### Automated Verification:
- Type checking passes: `npm run typecheck`
- Linting passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:
- Add → company appears; Edit name → persists after reload; inline status change → persists; Archive → disappears from list, still in DB.
- Optimistic status update rolls back on a forced API error.
- Signing in as a second user shows none of the first user's companies.
- Empty/loading/error states render correctly.

**Implementation Note**: Pause for human confirmation of the UI walkthrough before Phase 4.

---

## Phase 4: Automated tests — companies isolation + validators

### Overview

Prove per-user isolation on the first real table and lock the API input contract.

### Changes Required:

#### 1. Companies isolation test

**File**: `tests/companies-rls.test.ts` (new)

**Intent**: Prove two real users cannot see or mutate each other's companies through the real anon-key/JWT → `auth.uid()` path.

**Contract**: Mirror `tests/rls-canary.test.ts` structure (two users via service-role admin API, two anon clients). Assert: user B's `select` excludes A's rows; B's `update`/`archive` of A's row returns an **empty `.select()` array** (per the silent-filter gotcha) and A can read the row back unchanged; a forged `user_id` on insert is rejected by `with check`. Operate on the real `companies` table (no canary fixture); clean up created rows in teardown.

#### 2. Validator unit tests

**File**: `tests/companies-validation.test.ts` (new)

**Intent**: Guard the zod contract independent of the DB.

**Contract**: `createCompanySchema` rejects empty/whitespace name, over-long name, and invalid status; accepts valid input and defaults. `updateCompanySchema` rejects an empty object and invalid status; accepts partial updates.

### Success Criteria:

#### Automated Verification:
- Full suite passes against the local stack: `npm test`
- Type checking passes: `npm run typecheck`
- Linting passes: `npm run lint`

#### Manual Verification:
- Temporarily weakening a policy (or the `archived_at` filter) makes the isolation test fail — confirming it actually guards the invariant.

**Implementation Note**: Final phase — after this, all Progress items should be `[x]`.

---

## Testing Strategy

### Unit Tests:
- Zod validators (`createCompanySchema`, `updateCompanySchema`) — boundary and invalid-input cases.

### Integration Tests:
- Two-user `companies` RLS isolation (SELECT/UPDATE/archive/forged-insert) against the local Supabase stack.

### Manual Testing Steps:
1. Sign in, add a company, confirm it lists; reload to confirm persistence.
2. Change status inline; edit name via modal; archive — confirm it leaves the active list but remains in the DB (Studio).
3. Force an API error and confirm optimistic status update rolls back.
4. Sign in as a second user; confirm zero visibility of the first user's companies.

## Performance Considerations

Target scale is `low` qps / `small` data volume (PRD). No pagination needed for MVP; `listActiveCompanies` orders by `created_at desc` over a single user's rows. Revisit if a founder exceeds a few hundred companies.

## Migration Notes

Additive migration only (new table). `npm run db:reset` rebuilds local state; no existing data to migrate. Rollback = drop the migration file and reset.

## References

- RLS convention: `docs/reference/rls-convention.md:19-43` (template) and `:66-76` (silent-filter gotcha)
- F-01 foundation: `context/changes/persistence-rls-baseline/plan-brief.md`
- Existing API pattern (client null-check): `src/pages/api/auth/signin.ts:9-12`
- Existing island pattern: `src/components/auth/SignInForm.tsx`
- Test harness template: `tests/rls-canary.test.ts`
- Trigger function: `supabase/migrations/20260613183357_set_updated_at_function.sql`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Data layer — companies table, types, shared entity types

#### Automated
- [x] 1.1 Migration applies cleanly: `npm run db:reset` — 91de523
- [x] 1.2 Types regenerate with the table present: `npm run db:types` then `grep -q "companies" src/db/database.types.ts` — 91de523
- [x] 1.3 Type checking passes: `npm run typecheck` — 91de523
- [x] 1.4 Linting passes: `npm run lint` — 91de523

#### Manual
- [x] 1.5 `companies` exists in Studio with RLS enabled, CHECK constraint, and 4 policies — 91de523
- [x] 1.6 Insert as signed-in user works; `updated_at` trigger fires on update — 91de523

### Phase 2: API + service layer — zod, service, JSON routes, route guard

#### Automated
- [x] 2.1 `zod` present: `grep -q '"zod"' package.json` — 8cbe633
- [x] 2.2 Type checking passes: `npm run typecheck` — 8cbe633
- [x] 2.3 Linting passes: `npm run lint` — 8cbe633
- [x] 2.4 Build passes: `npm run build` — 8cbe633

#### Manual
- [x] 2.5 GET returns only own companies; POST valid creates; POST empty name → 400; PATCH bad id → 404; DELETE archives (hidden from GET, still in DB) — 8cbe633
- [x] 2.6 Unauthenticated `/api/companies` → 401 (or redirect for the page) — 8cbe633

### Phase 3: UI — companies page + React island

#### Automated
- [x] 3.1 Type checking passes: `npm run typecheck` — 01793b0
- [x] 3.2 Linting passes: `npm run lint` — 01793b0
- [x] 3.3 Build passes: `npm run build` — 01793b0

#### Manual
- [x] 3.4 Add / edit name / inline status change all persist after reload; Archive removes from list but row remains in DB — 01793b0
- [x] 3.5 Optimistic status update rolls back on a forced API error — 01793b0
- [x] 3.6 Second user sees none of the first user's companies — 01793b0
- [x] 3.7 Empty / loading / error states render correctly — 01793b0

### Phase 4: Automated tests — companies isolation + validators

#### Automated
- [x] 4.1 Full suite passes against local stack: `npm test`
- [x] 4.2 Type checking passes: `npm run typecheck`
- [x] 4.3 Linting passes: `npm run lint`

#### Manual
- [x] 4.4 Weakening a policy or the `archived_at` filter makes the isolation test fail (confirms it guards the invariant)
