<!-- PLAN-REVIEW-REPORT -->

# Plan Review: Owner-scoped Persistence + RLS Convention Baseline

- **Plan**: context/changes/persistence-rls-baseline/plan.md
- **Mode**: Deep
- **Date**: 2026-06-13
- **Verdict**: REVISE → SOUND (all findings fixed)
- **Findings**: 0 critical · 2 warnings · 1 observation

## Verdicts

| Dimension             | Verdict                       |
| --------------------- | ----------------------------- |
| End-State Alignment   | PASS                          |
| Lean Execution        | PASS                          |
| Architectural Fitness | PASS                          |
| Blind Spots           | WARNING → PASS (F1 fixed)     |
| Plan Completeness     | WARNING → PASS (F2, F3 fixed) |

## Grounding

6/6 paths ✓, supabase-js/build/lint verified, Progress↔Phase mechanical contract ✓, brief↔plan ✓.
Promise-gap: every Desired-End-State item has a backing phase ✓.

## Findings

### F1 — RLS-blocked UPDATE/DELETE are silent; assertions can pass vacuously

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 3 §4 — Canary isolation test (assertions)
- **Detail**: Under RLS, when user B updates/deletes a row it can't see, PostgREST returns no error and affects 0 rows silently. supabase-js doesn't report affected-row count unless `.select()` is chained (empty array when filtered). A test asserting "no error" would pass even if isolation broke. Read-back as A catches a broken UPDATE/DELETE — but the contract must lean on read-back + `.select()` empties, not on thrown errors.
- **Fix**: Phase 3 test contract now specifies: B's update/delete chain `.select()` and assert empty array; read back as A (count + field values unchanged) as the real isolation check; no error-based assertions for UPDATE/DELETE; only the forged-`user_id` INSERT case errors.
- **Decision**: FIXED (Fix in plan)

### F2 — "Type checking passes: npm run build" doesn't actually typecheck TS

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Completeness
- **Location**: Phase 1 (criterion 1.4) & Phase 3 (criterion 3.4)
- **Detail**: `npm run build` = `astro build`, which does not run a full TS typecheck. Vitest runs via esbuild (no typecheck). So the new `createServerClient<Database>` generic and `tests/rls-canary.test.ts` had no real typecheck gate. `@astrojs/check ^0.9.8` is installed but unused.
- **Fix A ⭐ Recommended**: Add `typecheck` → `astro check` script; use it in criteria 1.4 & 3.4; ensure tsconfig `include` covers `tests/`.
  - Strength: `@astrojs/check` already a dep — one line; honest typecheck for .astro + .ts.
  - Tradeoff: One more script; seconds slower.
  - Confidence: HIGH — astro check is the documented Astro typecheck path.
  - Blind spot: tsconfig `include` must cover `tests/` (now noted in Phase 3 §2).
- **Fix B**: Relabel criterion to `npm run lint` and drop the build-as-typecheck claim.
  - Strength: No new script; lint uses type-checked rules.
  - Tradeoff: Weaker; depends on tsconfig include.
  - Confidence: MED.
  - Blind spot: Whether eslint flat config type-lints `tests/`.
- **Decision**: FIXED (Fix A) — added `typecheck` script, updated criteria 1.4/3.4 + Progress, added tsconfig-include note in Phase 3 §2, updated Desired End State.

### F3 — `db:types` redirect needs `src/db/` to pre-exist on first run

- **Severity**: 🔭 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 §2 — db:types script
- **Detail**: `supabase gen types ... > src/db/database.types.ts` — shell `>` creates the file but not the parent dir. `src/db/` is absent today, so the first `npm run db:types` would fail.
- **Fix**: db:types script now prefixed with `mkdir -p src/db &&`.
- **Decision**: FIXED (Fix in plan)
