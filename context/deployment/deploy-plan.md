# Deploy Plan: crm → Cloudflare Workers

**Status:** Deployed  
**Platform:** Cloudflare Workers  
**Worker name:** `crm`  
**Deployed at:** 2026-05-25  
**Live URL:** https://crm.wojciech-szczygielski91.workers.dev  
**Version ID:** 6a05d149-f151-42ff-bb8d-44e20c109278

---

## What's deployed

- **Runtime:** Cloudflare Workers (edge, workerd)
- **Framework:** Astro 6 SSR with `@astrojs/cloudflare` v13 adapter
- **Auth/DB:** Supabase (external cloud project, eu-central-1 recommended)
- **Secrets:** `SUPABASE_URL`, `SUPABASE_KEY` set via `wrangler secret put`
- **CI:** GitHub Actions — lint + build on all PRs; auto-deploy to Workers on push to `main`
- **Observability:** `wrangler tail` for live logs; Cloudflare Dashboard → Workers → Logs for UI

## Manual gates completed

- [ ] Gate 1: Cloudflare account created, `wrangler login` done, Account ID noted, scoped API token created
- [ ] Gate 2: Supabase cloud project created (eu-central-1), `SUPABASE_URL` and `SUPABASE_KEY` obtained
- [ ] Gate 3: `wrangler secret put SUPABASE_URL` + `wrangler secret put SUPABASE_KEY` done
- [ ] Gate 4 (CI): GitHub repo created, code pushed to `main`, 4 GitHub secrets set

## Deploy commands

```bash
# Build
npm run build

# Dry-run (verify Workers config, catch CJS issues)
npx wrangler deploy --dry-run

# Production deploy
npx wrangler deploy

# Stream live logs
npx wrangler tail

# View deployment history
npx wrangler deployments list

# Rollback to a prior version
npx wrangler rollback [version-id]
```

## Verification checklist

- [ ] `https://crm.<subdomain>.workers.dev/` loads (HTTP 200)
- [ ] `/auth/signup` → create account → redirects correctly
- [ ] `/auth/signin` → sign in → lands on `/dashboard`
- [ ] `/dashboard` without auth → redirects to `/auth/signin`
- [ ] Sign out button → works, redirects away
- [ ] `wrangler tail` shows no 5xx errors during above steps

## Known risks at time of first deploy

| Risk | Mitigation |
|---|---|
| Middleware + nodejs_compat bug (#15434) | If pages render as `[object Object]`, temporarily disable middleware to isolate |
| 10ms CPU free-tier limit | Upgrade to Workers Paid ($5/mo) before any production traffic with real data |
| React hydration SyntaxError (#16387) | Check browser console; fix is to restructure `react-dom/client` import path |
| wrangler.jsonc was previously in Pages mode | Verified: `main` entry point confirms Workers mode |

## Secrets reference

| Secret | Where set | Purpose |
|---|---|---|
| `SUPABASE_URL` | `wrangler secret put` + GitHub secret | Supabase project URL |
| `SUPABASE_KEY` | `wrangler secret put` + GitHub secret | Supabase anon key |
| `CLOUDFLARE_API_TOKEN` | GitHub secret only | CI deploy (scoped: Workers:Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub secret only | CI deploy target account |
