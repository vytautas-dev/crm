<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Company Management (S-01)

- **Plan**: context/changes/company-management/plan.md
- **Scope**: All phases (1–4 of 4)
- **Date**: 2026-07-04
- **Verdict**: APPROVED
- **Findings**: 0 critical, 0 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Raw database error messages returned to the client in 500 responses

- **Severity**: 🟦 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/companies/index.ts:24, src/pages/api/companies/[id].ts:41
- **Detail**: On a service failure the routes return `json({ error: result.error }, 500)`, where `result.error` is the raw Supabase `error.message` propagated from `src/lib/services/companies.ts`. This can surface internal schema/driver detail to the client. Not exploitable on its own (RLS still enforces isolation) and the happy paths + validation errors are handled cleanly, but a generic 500 message with server-side logging is the more defensive shape.
- **Fix**: Return a fixed `"Something went wrong"` (or similar) string on the 500 branch and `console.error(result.error)` server-side, in both route files.
- **Decision**: FIXED — all 4 service-failure branches (GET/POST in index.ts, PATCH/DELETE in [id].ts) now log server-side and return a generic message.

### F2 — `vitest.config.ts` `@/` alias added in Phase 4 was not named in the plan

- **Severity**: 🟦 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: vitest.config.ts:1-19
- **Detail**: Phase 4 added a `resolve.alias` mapping `@` → `./src` so the validator test could import `@/lib/validation/companies` (which itself imports `@/types`). The plan's Phase 4 named only the two test files. The addition is necessary and correct — without it vitest cannot resolve the app's path alias — and it was surfaced to the user at the phase gate. Recorded for traceability, not a defect.
- **Fix**: None required. Optionally note the config change in the plan's Phase 4 block as an addendum.
- **Decision**: SKIPPED — accepted as-is; the alias is correct and necessary.

## Notes

- Every planned file exists and matches intent: migration copies the RLS convention verbatim (owner-scoped, CHECK on `status`, `archived_at`, `set_companies_updated_at` trigger, 4 per-op policies); service centralizes all queries with the `archived_at is null` active filter and soft-archive semantics; routes are thin zod-validated JSON handlers with client null-check (503) → auth (401) → validation (400) → not-found (404); UI island does optimistic inline status with rollback, shared add/edit form, and archive.
- "What we're NOT doing" boundaries all respected: no AI status inference, no CSV import, no company detail page, no notes, no hard delete (DELETE performs a soft archive).
- Success criteria verified fresh: `npm test` (30 pass), `npm run typecheck` (0 errors), `npm run lint` (clean), `npm run build` (pass), `grep zod package.json` (pass), `grep companies src/db/database.types.ts` (pass). Manual rows 1.5/1.6/2.5/2.6/3.4–3.7/4.4 confirmed by the operator during implementation.
- The isolation test correctly encodes the silent-filter gotcha (asserts empty `.select()` arrays for cross-user UPDATE/archive, reads back as the real owner, and expects `with check` to error on a forged `user_id`).
