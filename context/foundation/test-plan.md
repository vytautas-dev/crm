# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-07-04 (Phase 1 change opened)

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "the team
   is worried about X, and the failure would surface somewhere in <area>"
   carry the same weight as PRD lines or hot-spot data. The top three risks
   here trace directly to the founder interview (Q1/Q3/Q4 all converged on
   AI extraction + citations).
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `src/`, `supabase/`
(excluding `node_modules`, `dist`, generated `database.types.ts`, docs).
Note: churn is flat (fresh project, only F-01 shipped) — likelihood
ratings lean on the roadmap and the Phase 2 interview, not on hot-spots.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the *evidence that surfaced
this risk* — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|-------------------------|--------|------------|--------------------------------|
| 1 | AI fabricates a commitment / decision / task absent from the submitted content; the founder acts on false information about an investor | High | High | PRD FR-007/FR-008 ("must not fabricate"); interview Q1, Q3, Q4; roadmap S-02 (risk) |
| 2 | A commitment surfaces in the summary without a valid source citation; an uncited claim reaches the founder | High | High | PRD NFR ("Output not traceable to the source must not appear"); interview Q4; roadmap S-02 (unknown: "uncited claims never appear") |
| 3 | Claude response parsing breaks on an unexpected shape (malformed JSON, refusal, empty content, API error) → endpoint crash or garbage tasks instead of clean degradation | High | High | interview Q3; tech-stack.md (structured outputs); roadmap S-02 |
| 4 | New entity tables (companies, tasks, content) expose one founder's data to another account — owner-scoped RLS regression | High | Medium | PRD NFR privacy + Access Control; interview Q1 (secondary); roadmap F-01 (canary covers a dummy table only; real entities land in S-01/S-02) |
| 5 | A task or analysis result silently disappears (lost async write, or delete instead of archive) | High | Medium | PRD guardrail ("Tasks must never silently disappear") + FR-003 (archive, not delete); interview Q1 (tertiary); roadmap F-02 (async job) |
| 6 | Untrusted paste bypasses server-side validation, or prompt-injection subverts the no-fabrication + citation contract (oversized input, non-text, adversarial text) | Medium | Medium | PRD FR-006 (paste = primary input path); abuse lens (untrusted input, server-side validation parity) |
| 7 | Analysis re-surfaces already-tracked tasks instead of net-new actions (history-awareness fails) | Medium | Medium | PRD Business Logic (net-new, history-aware); roadmap S-02 (unknown) |

**Impact × Likelihood rubric.** Both axes scored coarse High / Medium / Low
so two readers agree on the same row.

| Rating | Impact | Likelihood |
|--------|--------|------------|
| High   | user loses access, data, or money; failure is publicly visible | area changes weekly, or we have already been burned here |
| Medium | feature degrades, a workaround exists, only some users affected | touched occasionally, has been a source of bugs |
| Low    | cosmetic, easily reverted, no data effect | stable code, rarely touched |

Abuse / security lens is satisfied: #4 covers authorization/access (IDOR —
ownership, not just authentication), #6 covers untrusted input (server-side
validation parity).

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|------|-----------------------------|----------------|--------------------------------------|-----------------------|-----------------------|
| #1 | A negative fixture (text with NO commitment) yields zero commitments/tasks; a positive fixture with a known commitment extracts exactly that one | "Structured output = no hallucination" — a correct shape is not a faithful content | Extraction entry point, prompt shape, where the result is persisted, source of truth for fixtures | integration with ground-truth fixtures | **Oracle problem** — asserting against the model's own output instead of a hand-authored ground truth |
| #2 | Every commitment in the output maps to a real passage in the source; a claim with no citation never renders | "Citation present = citation valid" — the cited passage must actually contain the claim | How "no uncited claim" is enforced, citation format (offset/substring), the rendering layer | integration + AI-native (faithfulness judge, selective) | Checking only that a citation field exists, not that it is accurate |
| #3 | Malformed / refusal / empty response → a clean error (5xx/status), no DB write, no faked success | "200 = success" — the final status does not prove a correct shape | Parsing layer, error translation, what happens on an API error | unit (parser on edge fixtures) | Happy-path-only test; mocking the parser instead of feeding real bad payloads |
| #4 | Founder A's client cannot see Founder B's rows on the REAL tables (companies/tasks), not just the canary | "Canary green = all tables safe" — each table applies RLS separately | Which tables are created, per-operation policy, auth/session shape | integration (two sessions, canary pattern) | Isolation test only on the dummy table; one session with `auth.uid()` swapped |
| #5 | A completed/created task survives restart/polling; archive hides but preserves; a lost async write is detected | "Delete = archive", "polling returned 200 = result persisted" | Async job write path, status field, archive-vs-delete semantics | integration | Happy-path with no race; asserting UI state instead of DB state |
| #6 | Oversized / non-text / adversarial paste is rejected or safely bounded server-side; injection cannot break the citation contract | "Client validation is enough" — the server must not trust the client | The paste endpoint, size/type limits, where validation lives | integration | Testing only front-end validation; no adversarial case |
| #7 | A re-paste containing an already-tracked task creates NO duplicate; net-new is net-new | "The model will dedupe on its own" — history must be fed into the analysis | How existing tasks/history reach the prompt, the dedup key | integration | Fixture with no existing history (proves nothing) |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right; the orchestrator updates Status
as artifacts appear on disk.

Sequencing note: only F-01 (persistence-rls-baseline) is implemented. Phase 1
is actionable now; Phases 2–5 are gated on their feature slices (S-01, S-02,
F-02) and open once that code exists. The strategy is frozen now regardless.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|------------|-----------------|---------------|------------|--------|---------------|
| 1 | RLS isolation harness | Generalize the canary into a reusable owner-scoped isolation test applied to real entity tables as they land | #4 | integration (DB/RLS) | change opened | context/changes/testing-rls-isolation-harness/ |
| 2 | AI extraction contract | Prove no fabrication, faithful citations, and clean parse degradation | #1, #2, #3 | unit + integration + AI-native (citation-faithfulness judge, selective) | not started | — |
| 3 | Data integrity & no-silent-loss | Async job result is durable; archive not delete; no silent task loss | #5 | integration | not started | — |
| 4 | Input robustness & net-new | Server-side validation parity; history-aware analysis with no duplicates | #6, #7 | integration | not started | — |
| 5 | Quality-gates wiring | Lock the floor in CI + e2e on the paste→tasks critical flow | cross-cutting | gates/CI + e2e | not started | — |

**Status vocabulary** (fixed — parser literals): `not started` → `change opened`
→ `researched` → `planned` → `implementing` → `complete`.

## 4. Stack

The classic test base for this project. AI-native tools carry a `checked:`
date so future readers can see which lines need re-verification.

| Layer | Tool | Version | Notes |
|-------|------|---------|-------|
| unit + integration | Vitest | 3.x (from devDeps) | Configured; `npm test` = `vitest run`. One test today: `tests/rls-canary.test.ts` (RLS isolation). |
| DB / RLS integration | Supabase CLI (local stack) + `pg` | — | Local Postgres via `npx supabase start`; two anon sessions + service-role admin for user lifecycle. |
| API mocking | none yet — see Phase 2 | — | Anthropic Claude call boundary will need a network-edge mock/fixture strategy (decided in Phase 2 research). |
| e2e | none yet — see Phase 5 | — | Critical flow paste→tasks; runner chosen in Phase 5 (Playwright candidate). |
| accessibility | none yet | — | Not prioritized for v1 (desktop-only solo tool). |
| (optional) AI-native | citation-faithfulness LLM-judge — checked: 2026-07-04 | n/a | Selective, Phase 2 only. When NOT to use: when a deterministic substring/offset check already proves the citation points at real source text. |

**Stack grounding tools (current session):**
- Docs: none (no Context7 / framework-docs MCP) — not available in current session; WebFetch/WebSearch usable as fallback; checked: 2026-07-04
- Search: WebSearch — available, not yet used (stack is settled in tech-stack.md); checked: 2026-07-04
- Runtime/browser: no Playwright MCP; `claude-in-chrome` browser automation available as a possible e2e/verification layer for Phase 5; checked: 2026-07-04
- Provider/platform: no Supabase/GitHub MCP; `supabase` CLI + `gh` CLI available via Bash for local DB and CI gates; checked: 2026-07-04

## 5. Quality Gates

"Required after §3 Phase <N>" means the gate is enforced once that rollout
phase lands; before that it is `planned`.

| Gate | Where | Required? | Catches |
|------|-------|-----------|---------|
| lint + typecheck | local + CI | required | syntactic / type drift (`npm run lint`, `astro check`) |
| unit + integration | local + CI | required after §3 Phase 1 | RLS isolation regressions, extraction/parse logic regressions |
| e2e on critical flows | CI on PR | required after §3 Phase 5 | broken paste→summary→tasks path |
| post-edit hook | local (agent loop) | optional | regressions at edit time (Module 3 Lesson 3) |
| visual diff (deterministic) | CI on PR | optional | rendering regressions (low priority — solo desktop tool) |
| multimodal visual review | CI on PR | optional | visual issues classic diff misses (not prioritized v1) |
| pre-prod smoke | between merge + prod | optional | Cloudflare Worker environment-specific failures |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section fills in once the
relevant rollout phase ships; before that it reads "TBD — see §3 Phase <N>."

### 6.1 Adding a unit test

- TBD — see §3 Phase 2 (Claude response parser edge-case unit tests).

### 6.2 Adding an integration test

- **Location**: `tests/` (repo root; matches existing `tests/rls-canary.test.ts`).
- **Mocking policy**: only mock at the network edge (the Anthropic HTTP
  boundary). Never mock internal modules. Real local Supabase for DB tests.
- **Reference test**: `tests/rls-canary.test.ts`.
- **Run locally**: `npm test`.

### 6.3 Adding an RLS isolation test for a new table

- TBD — see §3 Phase 1 (owner-scoped isolation harness generalized from the canary).

### 6.4 Adding an AI extraction / citation test

- TBD — see §3 Phase 2 (ground-truth fixtures for no-fabrication + citation faithfulness).

### 6.5 Adding an e2e test for the paste→tasks flow

- TBD — see §3 Phase 5.

### 6.6 Per-rollout-phase notes

(Optional. After each phase lands, `/10x-implement` appends a 2–3 line note
here capturing anything surprising the rollout phase taught.)

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview, Q5). Respect these
unless the underlying assumption changes.

- **Generated Supabase types** (`src/db/database.types.ts`) — the generator
  is the test. Re-evaluate if types are hand-edited. (Source: interview Q5.)
- **Starter auth forms** — vetted library/starter code. Re-evaluate if the
  auth flow is customized beyond the starter. (Source: interview Q5.)
- **UI snapshot tests for marketing / static layout pages** — brittle, catch
  nothing. Re-evaluate if a marketing page gains real logic. (Source:
  interview Q5.)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-07-04
- Stack versions last verified: 2026-07-04
- AI-native tool references last verified: 2026-07-04

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
