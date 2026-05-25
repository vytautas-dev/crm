---
project: AI Relationship & Fundraising Assistant (crm)
researched_at: 2026-05-25
recommended_platform: Cloudflare Workers
runner_up: Netlify
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 6 (SSR, output: server)
  runtime: Cloudflare Workers (workerd edge runtime)
  adapter: "@astrojs/cloudflare v13"
  database: Supabase (external)
  auth: Supabase Auth (external)
---

## Recommendation

**Deploy on Cloudflare Workers.**

The stack was bootstrapped with `@astrojs/cloudflare` — the only adapter that targets the Cloudflare Workers runtime — meaning zero adapter migration cost and zero wasted work. Cloudflare Workers' free tier covers 100,000 requests per day (well above this solo MVP's expected load), making it the only candidate that is genuinely free at this scale. It scored 5/5 on all agent-friendly criteria: `wrangler` CLI covers every operational loop, docs are published as `llms.txt` and per-page Markdown since February 2026, and three production-ready MCP servers (workers-builds, bindings, observability) are GA. The combination of zero migration cost, zero monthly cost, and best-in-class agent tooling makes Cloudflare Workers the decisive recommendation — despite three known open bugs in `@astrojs/cloudflare` v13 that require awareness going in.

## Platform Comparison

Criteria scored Pass / Partial / Fail against the five agent-friendly criteria from `references/agent-friendly-criteria.md`. Hard filters applied first; interview weights applied to break ties.

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Total |
|---|---|---|---|---|---|---|
| **Cloudflare Workers** | Pass | Pass | Pass | Pass | Pass | **5/5** |
| **Netlify** | Pass | Pass | Pass | Pass | Pass | **5/5** |
| **Render** | Partial | Partial | Pass | Pass | Pass | **3.5/5** |
| **Vercel** | Pass | Pass | Pass | Pass | Partial | **4.5/5** |
| **Railway** | Partial | Partial | Partial | Pass | Partial | **2.5/5** |
| **Fly.io** | Partial | Partial | Partial | Partial | Fail | **1.5/5** |

**Hard filters:** No platform was dropped — no persistent connections are required, so serverless-only platforms (Netlify, Vercel) remain eligible.

**Cost weight (top priority from interview):** Cloudflare free tier (100k req/day) is the only genuinely zero-cost option at MVP scale. Netlify's free tier hard-caps at 300 credits/month and pauses all sites — unacceptable for a CRM; the Personal plan ($9/mo) is the minimum safe floor. Vercel's Hobby plan prohibits commercial use, requiring the $20/mo Pro plan. Render's free tier spins down after 15 minutes of inactivity (not suitable for production); the Starter plan is $7/mo. Fly.io eliminated its free tier in 2024 ($3–15/mo). Railway has no genuine free tier after the 30-day trial ($5/mo Hobby minimum).

**Adapter compatibility weight (tie-breaker):** Cloudflare is the only platform requiring zero adapter migration. All others require replacing `@astrojs/cloudflare` with a platform-specific adapter (1–2 days of work) and removing all `wrangler.jsonc` infrastructure.

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

The stack is already wired for Cloudflare — `@astrojs/cloudflare` v13, `wrangler.jsonc`, `astro:env/server` typed bindings, and the CI workflow are all Cloudflare-native. At 10k–100k requests/month the free tier costs $0. The `wrangler` CLI is the gold standard for CLI-first deployment: `wrangler deploy`, `wrangler rollback [version-id]`, and `wrangler tail` cover the full operational loop. Cloudflare's `llms.txt` and per-page Markdown endpoints (GA since February 2026) give agents direct doc access. Three production-ready MCP servers (workers-builds, bindings, observability) are GA with Claude Code explicitly documented at `developers.cloudflare.com/agent-setup/claude-code`. The three open bugs in `@astrojs/cloudflare` v13 are real but have documented workarounds; the 10ms CPU free-tier limit is the only cost trigger (resolved by the $5/mo Workers Paid plan).

#### 2. Netlify

Netlify matches Cloudflare on all five criteria (MCP GA since June 2025, `llms.txt` GA, `netlify` CLI full-featured). Its strength is its MCP server maturity and the `@astrojs/netlify` adapter being maintained by the Astro core team with day-one Astro 6 support. However, it requires a mandatory adapter swap (estimated 1–2 days: replace `@astrojs/cloudflare` → `@astrojs/netlify`, remove `wrangler.jsonc`, update CI). The free tier's hard-cap — sites go completely offline at 300 credits — makes it unsuitable for a production CRM without upgrading to the Personal plan at $9/mo. Scored second due to the migration cost and the cost floor.

#### 3. Render

Render has a GA MCP server (August 2025), the most complete `llms.txt` setup of any candidate (both `llms.txt` index and `llms-full.txt`), and a `render.yaml` blueprint for infrastructure-as-code. The REST API is described by an OpenAPI 3.0 spec — the most scriptable deployment API outside of Cloudflare and Vercel. The Starter plan at $7/mo provides always-on persistent containers (no spin-down). The trade-off vs. Cloudflare: a mandatory adapter swap to `@astrojs/node`, no edge/CDN distribution (static assets served from the same Node process), and being a single-region deployment target. Scored third: good agent story, but migration cost + lack of CDN vs. the first-place pick's zero-migration + edge distribution.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. **CJS module incompatibility taxes every `npm install`.** The `workerd` runtime rejects CommonJS (`require`/`module.exports`). Any dependency shipping CJS-only will break the build silently or at runtime. Every new package addition requires vetting for ESM compatibility — a recurring tax on a solo after-hours founder's time.

2. **The 10ms CPU free-tier limit is dangerously tight for non-trivial SSR.** Rendering the company list or task dashboard with 80+ Supabase rows will likely exceed 10ms of CPU regularly, triggering billing on the $5/mo Workers Paid plan. The free tier is effectively unusable for any page with real data; the upgrade is essential but wasn't made explicit in the starter template.

3. **Three active open bugs affect this exact stack (as of 2026-05-25).** (a) Middleware + `nodejs_compat` flag causes SSR pages to render as `[object Object]` (issue #15434, open). (b) React 19 island hydration SyntaxError with `react-dom/client` CJS conflict (issues #16387, #16529, open). (c) Image service binding (`imageService: 'compile'`) unavailable locally in dev (issue #15970). All have workarounds documented in the GitHub issues, but they add friction to the 5-week timeline.

4. **"Cloudflare Pages" in `tech-stack.md` is soft-deprecated.** Cloudflare marked Pages maintenance-only in April 2025; new projects should deploy directly to Workers. The starter template's `wrangler.jsonc` may embed Pages-era conventions. The Pages and Workers deployment surfaces are not interchangeable — the config must be verified and potentially migrated before the first production deploy.

5. **The AI analysis notification path is architecturally undefined in the current stack.** The PRD requires the founder's browser to be notified when background AI analysis completes. Supabase Edge Functions write results to the database, but Workers can't push to the browser. The natural solution (Supabase Realtime WebSocket from the client to Supabase) is a separate integration triangle not documented in the starter or CLAUDE.md — missing it violates US-01's acceptance criteria.

### Pre-Mortem — How This Could Fail

In week two of the 5-week sprint, the React island hydration SyntaxError (issue #16387) surfaces during development. The workaround takes a day to find — it requires restructuring how client components import React. In week three, the company list page goes live with real Supabase data: rendering 40+ rows exceeds the 10ms CPU free-tier cap on every request, forcing the $5/mo upgrade that was supposed to be zero. The real break comes in week four: the AI analysis notification feature, required by US-01's acceptance criteria, has no implementation path in the documented stack. Supabase Edge Functions write results to the database, but there is no mechanism to push to the browser. Wiring Supabase Realtime (client-side WebSocket to Supabase, bypassing Workers entirely) into the Astro SSR app requires understanding a three-layer interaction (Workers session cookies + client-side Supabase client + Realtime channel subscriptions) that no starter tutorial covers end-to-end. The founder ships without real-time notifications — users must manually refresh to see analysis results — directly violating US-01. The 5-week timeline slips to 9 weeks.

### Unknown Unknowns

- **The starter's `wrangler.jsonc` may still use Pages deployment conventions.** `tech-stack.md` says `cloudflare-pages`, but Pages is soft-deprecated. Deploying to Workers requires `wrangler deploy` against a Workers-mode config — not `wrangler pages deploy`. Config surgery may be needed before CI reliably deploys to the correct surface.

- **`workerd` as the dev server slows the local feedback loop.** Astro 6 + `@astrojs/cloudflare` v13 runs the `workerd` binary in `npm run dev` instead of standard Vite/Node. The cold start of `workerd` is noticeably slower than Vite, and some workerd-specific runtime errors only surface at serve time — not during build — making the red-green loop slower for an after-hours solo developer.

- **The Supabase Realtime notification path requires explicit architectural design.** Nothing in the current stack context defines how a Supabase Edge Function result reaches the user's browser. Supabase Realtime is the natural solution — but it requires the client to hold an open WebSocket to Supabase (entirely separate from the Cloudflare Workers request/response model). This needs to be designed before implementation begins, or US-01's notification criterion will be silently dropped.

- **Cloudflare MCP setup requires separate API token scoping not in the starter.** The three Cloudflare MCP servers (workers-builds, bindings, observability) each need a scoped Cloudflare API token as an MCP environment variable — separate from the `SUPABASE_URL`/`SUPABASE_KEY` Wrangler secrets. This configuration is not documented in the starter's CLAUDE.md and will require manual setup before Claude Code can use MCP tooling.

- **`astro:env/server` bindings and Wrangler secrets are a three-layer system.** The project uses typed env bindings declared in `astro.config.mjs`'s `env.schema`. Cloudflare secrets set via `wrangler secret put` are separate from the `wrangler.jsonc` `vars` block, which are separate from the Astro env schema. Getting the right secret into the right binding at build vs. runtime requires understanding all three layers — there is no single consolidated reference for this combination.

## Operational Story

- **Preview deploys**: `wrangler versions upload` creates a non-promoted version at a versioned URL. Promote to production with `wrangler versions deploy`. Branch/PR previews are not automatic — GitHub Actions CI can be configured to deploy to a named `--env staging` environment with a separate worker name for pre-production review.
- **Secrets**: Runtime secrets (`SUPABASE_URL`, `SUPABASE_KEY`) are set via `wrangler secret put <KEY>` (encrypted at rest, never in `wrangler.jsonc`). CI reads them from GitHub repository secrets, injected into the build environment. Local development uses `.dev.vars` (listed in `.gitignore`). Secrets are scoped to the Worker — no cross-project leakage.
- **Rollback**: `wrangler rollback [version-id]` redeploys a prior version. `wrangler deployments list` shows the last 10 deployments with version IDs. Time-to-revert is typically under 30 seconds. Database migrations (Supabase) do not roll back automatically — schema changes must be backward-compatible or handled separately.
- **Approval**: The agent may run `wrangler deploy` to production autonomously (no human gate enforced by the platform). Recommended human-only actions: rotating `SUPABASE_KEY`, dropping Supabase tables, deleting the Worker project, or changing billing plan. Cloudflare's platform does not enforce an approval step — discipline is a team convention, not a platform feature.
- **Logs**: `wrangler tail` streams live Worker invocation logs in real time. Add `--status error` to filter failures, `--format json` for structured output. Cloudflare Dashboard → Workers & Pages → your Worker → Logs provides a UI view. The observability MCP server (`observability.mcp.cloudflare.com`) exposes structured log queries if MCP is configured.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| React island hydration SyntaxError in dev (issue #16387, open) | Research finding | H | M | Follow the workaround in the GitHub issue thread (restructure `react-dom/client` import path); validate in dev before first deploy |
| Middleware + `nodejs_compat` causing SSR `[object Object]` (issue #15434, open) | Research finding | M | H | Avoid using middleware together with `nodejs_compat` until the issue is resolved; track issue for patch release |
| Free-tier 10ms CPU limit hit by SSR rendering real data | Devil's advocate | H | M | Upgrade to Workers Paid ($5/mo) before shipping to production; treat this as a known line item, not a surprise |
| AI analysis notification path undefined — US-01 criterion at risk | Devil's advocate | H | H | Design the Supabase Realtime client-side WebSocket integration explicitly before starting implementation; document the round-trip in CLAUDE.md |
| `wrangler.jsonc` still in Pages deployment mode (soft-deprecated April 2025) | Unknown unknowns | M | H | Verify the config deploys to Workers (not Pages) via `wrangler deploy --dry-run` before CI is wired; follow the Cloudflare migration guide if needed |
| Cloudflare Pages soft-deprecation — Pages dashboard features disappear over time | Research finding | M | L | Migrate fully to Workers deployment path (Workers Static Assets) before any new Pages-only feature is relied upon |
| CJS dependency breaks workerd build silently | Devil's advocate | M | M | Add a pre-deploy check: `wrangler deploy --dry-run` surfaces CJS errors before they hit production; prefer ESM-only packages |
| Cloudflare MCP tokens not configured — agent cannot use MCP observability | Unknown unknowns | H | L | Create a scoped Cloudflare API token (Workers:Edit, Account:Read), add to `.claude/settings.json` as the observability MCP env var; document in CLAUDE.md |
| `astro:env/server` binding resolution fails at runtime (three-layer env system) | Unknown unknowns | M | H | Test all env bindings in the `.dev.vars` → local dev → staging → production path before MVP launch; document the binding layer in CLAUDE.md |
| `workerd` dev server slower cold-start affecting after-hours productivity | Pre-mortem | M | L | Accept the tradeoff; use `--watch` mode after first cold start to keep workerd alive; monitor if it becomes blocking |

## Getting Started

The project is already configured for Cloudflare Workers. The key steps for first deploy are:

1. **Verify Workers (not Pages) deployment mode.** Check `wrangler.jsonc` has a `main` entry point (Workers mode) rather than a `pages` block (deprecated). If it has `pages`, follow the [Migrate from Pages to Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/) guide. Run `npx wrangler deploy --dry-run` to confirm no CJS errors before the real deploy.

2. **Create a Cloudflare account and authenticate.** `npx wrangler login` — opens browser OAuth, stores token in `~/.wrangler/config`. Create an API token scoped to Workers:Edit for the CI workflow separately (Dashboard → My Profile → API Tokens → Create Token → Edit Cloudflare Workers template).

3. **Set production secrets.** `npx wrangler secret put SUPABASE_URL` then `npx wrangler secret put SUPABASE_KEY` — prompts for value interactively, encrypted at rest. Add both as GitHub repository secrets (`SUPABASE_URL`, `SUPABASE_KEY`) and `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` for CI.

4. **First production deploy.** `npm run build && npx wrangler deploy` — builds the Astro app and uploads the Worker bundle. Confirm the live URL printed by Wrangler returns HTTP 200. Check `npx wrangler tail` for any runtime errors on first requests.

5. **Upgrade to Workers Paid ($5/mo).** Dashboard → Workers & Pages → Plans → Upgrade. This raises the CPU limit from 10ms to 30s per invocation — required before serving real Supabase data at any volume. Set a billing alert at $10/mo to catch unexpected overages.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup (covered by existing `.github/workflows/ci.yml`)
- Production-scale architecture (multi-region, HA, DR)
- Supabase Edge Functions deployment configuration (the AI background processing layer)
- Notification mechanism design (Supabase Realtime integration)
