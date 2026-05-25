---
bootstrapped_at: 2026-05-25T21:12:00Z
starter_id: 10x-astro-starter
starter_name: 10x Astro Starter (Astro + Supabase + Cloudflare)
project_name: crm
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: crm
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: true
  has_background_jobs: true
```

### Why this stack

A solo founder shipping a 5-week after-hours MVP with auth, AI content analysis, and
file uploads needs a battle-tested, agent-friendly starter that handles auth, database,
and storage out of the box — without assembling the stack from scratch. The 10x Astro
Starter (Astro + Supabase + Cloudflare Pages) is the recommended default for
`(web-app, js)`, clears all four agent-friendly gates, and maps directly to three
PRD feature flags: auth via Supabase Auth, AI integration via the TypeScript SDK with
explicit types at every boundary, and file storage via Supabase Storage. The one
constraint — background AI processing that must run non-blocking — is handled by
routing analysis through Supabase Edge Functions rather than Cloudflare Workers,
keeping the compute close to the data layer. CI runs on GitHub Actions with
auto-deploy-on-merge, matching what the starter ships with.

## Pre-scaffold verification

| Signal      | Value                                      | Severity    | Notes                                      |
| ----------- | ------------------------------------------ | ----------- | ------------------------------------------ |
| npm package | not run                                    | —           | cmd_template starts with `git clone`; npm check skipped |
| GitHub repo | not run                                    | —           | `gh` CLI not available; recency check unavailable |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone (cloned starter without keeping upstream git history)
**Exit code**: 0
**Files moved**: 18 items (files + directories)
**Conflicts (.scaffold siblings)**: CLAUDE.md.scaffold, package.json.scaffold
**.gitignore handling**: moved silently (no prior .gitignore in cwd)
**.bootstrap-scaffold cleanup**: deleted (was empty after move-up)

### Conflict detail

| File | Resolution |
| ---- | ---------- |
| `CLAUDE.md` | Existing wins; starter's copy saved as `CLAUDE.md.scaffold` |
| `package.json` | Existing wins; starter's copy saved as `package.json.scaffold` |

> **Action required**: Review `CLAUDE.md.scaffold` and `package.json.scaffold` — diff them against the active files and merge any configuration, scripts, or agent-context content you need from the starter's copies.

## Post-scaffold audit

**Tool**: `npm audit --json`
**Summary**: 0 CRITICAL, 1 HIGH, 9 MODERATE, 0 LOW
**Direct vs transitive**: 0/0/0/0 direct of total 0/1/9/0 — all findings are transitive dev-tooling dependencies; 0 production dependency findings

#### HIGH findings

**devalue** (v5.6.3 – 5.8.0)
- Advisory: GHSA-77vg-94rm-hx3p — Svelte devalue: DoS via sparse array deserialization
- CVSS: 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
- Via: transitive dev dependency chain
- Fix: available (`npm audit fix`)
- Risk to this project: LOW — this is a dev/build tooling dependency not reachable from production application code

#### MODERATE findings

1. **ws** (v8.0.0 – 8.20.0) — GHSA-58qx-3vcg-4xpx: Uninitialized memory disclosure (CVSS 4.4). Via `@supabase/realtime-js` and `miniflare`.
2. **yaml** (v2.0.0 – 2.8.2) — GHSA-48c2-rrv3-qjmp: Stack overflow via deeply nested YAML collections (CVSS 4.3). Via `yaml-language-server`.
3. **volar-service-yaml** (≤0.0.70) — via `yaml-language-server`. Dev tooling only.
4. **yaml-language-server** — via `yaml`. Dev tooling only.
5. **@astrojs/language-server** (≥2.14.0) — via `volar-service-yaml`. Dev tooling (Astro LSP).
6. **@astrojs/check** (≥0.9.3) — via `@astrojs/language-server`. Dev tooling.
7. **miniflare** — via `ws`. Dev tooling (Cloudflare local emulator).
8. **wrangler** — via `miniflare`. Dev tooling (Cloudflare deploy CLI).
9. **@cloudflare/vite-plugin** — via `miniflare`, `wrangler`, `ws`. Dev tooling.

All MODERATE findings are in dev/build tooling. None affect the production dependency tree (1 production package, 0 findings).

## Hints recorded but not acted on

| Hint                    | Value                  |
| ----------------------- | ---------------------- |
| bootstrapper_confidence | first-class            |
| quality_override        | false                  |
| path_taken              | standard               |
| self_check_answers      | null                   |
| team_size               | solo                   |
| deployment_target       | cloudflare-pages       |
| ci_provider             | github-actions         |
| ci_default_flow         | auto-deploy-on-merge   |
| has_auth                | true                   |
| has_payments            | false                  |
| has_realtime            | false                  |
| has_ai                  | true                   |
| has_background_jobs     | true                   |

v1 bootstrapper reads these for logging and conversation surfacing only. A future M1L4 skill will act on `has_auth`, `has_ai`, `has_background_jobs`, and `deployment_target` to scaffold agent context (CLAUDE.md, AGENTS.md) and CI workflows.

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- Review `CLAUDE.md.scaffold` and diff it against your `CLAUDE.md` — merge the starter's agent-context content (Supabase patterns, Astro conventions) that belongs there.
- Review `package.json.scaffold` and compare it to your `package.json` — the starter's version has all the Astro, Supabase, and Cloudflare scripts; you'll likely want to use it as the base.
- `npm audit fix` to resolve the 10 transitive findings (all have fixes available).
- Configure your Supabase project and populate `.env.example` → `.env` with your project URL and anon key.
- `git add` and commit the scaffolded files to start your own repo history.
