# deployPlan.md — deploy Mercor AI Interviewer (for an AI model to follow)

Goal: running at `https://mercor.paulnixon.in` (frontend) with API at `https://api-mercor.paulnixon.in`.

| Piece | Host | Notes |
| --- | --- | --- |
| Frontend (static `apps/frontend/dist`) | Cloudflare Pages (free) | Bun build, built-in SPA fallback |
| Backend (Bun + Express) | Render web service | Long-running process; Render terminates TLS |
| Database | Neon | Already created and migrated. Do NOT run migrations |
| DNS | GoDaddy (`paulnixon.in`) | Two CNAME records. No nameserver change |

## Rules for the AI
- Never print, log, or commit secrets (`OPENAI_API_KEY`, `DATABASE_URL`, `DIRECT_DATABASE_URL`). Secrets are pasted by the human into dashboards.
- Do not run database migrations. Do not touch DNS or dashboards yourself; give the human exact values.
- Steps marked **[HUMAN]** need the user. Stop and ask them, then continue.
- Keep `OPENAI_API_KEY` out of anything under `apps/frontend` and out of `BUN_PUBLIC_*` variables.

## Phase A — code prep (AI)
1. Branch must be pushed and merged to `main` (**[HUMAN]** pushes/merges, or asks the AI to open a PR).
2. Confirm the backend supports Render: `apps/backend/src/config/env.ts` has `HOST`, `PORT`, `TRUST_PROXY`; `app.ts` exposes `GET /health`.
3. Run from repo root: `bun install --frozen-lockfile && bun run check-types`.
4. Local static build test:
   ```sh
   cd apps/frontend
   BUN_PUBLIC_BACKEND_URL=https://api-mercor.paulnixon.in bun run build
   test -f dist/index.html && ! grep -l "localhost:3001" dist/*.js
   ```

## Phase B — backend on Render **[HUMAN]**
Create at render.com: New → Web Service → connect the GitHub repo, branch `main`.

| Setting | Value |
| --- | --- |
| Runtime | Node (Bun is preinstalled) |
| Root directory | *(repo root, leave blank)* |
| Build command | `bun install --frozen-lockfile` |
| Start command | `cd apps/backend && bun index.ts` |
| Health check path | `/health` |
| Instance type | Free for a trial (sleeps when idle, loses in-memory interviews on restart); Starter for reliability |

Environment variables:

| Name | Value | Secret |
| --- | --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string (host contains `-pooler`) | yes |
| `OPENAI_API_KEY` | server-side OpenAI key | yes |
| `FRONTEND_ORIGIN` | `https://mercor.paulnixon.in` (no trailing slash) | no |
| `HOST` | `0.0.0.0` (Render requires this; do not use `127.0.0.1`) | no |
| `TRUST_PROXY` | `1` (so `req.ip` is the real visitor; rate limiting depends on it) | no |
| `REALTIME_MODEL` | `gpt-realtime-2.1` | no |
| `SCORING_MODEL` | `gpt-5-mini` | no |
| `NODE_VERSION` | `24` | no |
| `GITHUB_TOKEN` | GitHub personal access token, no scopes (public data only). Without it, `/api/pre-interview` returns 502 on Render because unauthenticated GitHub calls are limited to 60/hour per shared IP | yes |

`PORT` is injected by Render; do not set it.
Verify once deployed (Render URL first): `curl -i https://<service>.onrender.com/health` → `200 {"status":"ok"}`.

## Phase C — frontend on Cloudflare Pages **[HUMAN]**
Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → the repo.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `apps/frontend` |
| Build command | `bun install && bun run build` |
| Build output directory | `dist` |
| `BUN_PUBLIC_BACKEND_URL` | `https://api-mercor.paulnixon.in` |
| `BUN_VERSION` | `1.3.13` |

The build fails on purpose if `BUN_PUBLIC_BACKEND_URL` is missing. Do not add a `404.html` (it would disable SPA fallback).

## Phase D — custom domains and DNS **[HUMAN]**
Order matters: add the domain in the dashboard first, copy the target it shows, then add DNS.
1. Render → service → Settings → Custom Domains → add `api-mercor.paulnixon.in`. Note the target (`<service>.onrender.com`).
2. Cloudflare Pages → project → Custom domains → add `mercor.paulnixon.in`. Note the target (`<project>.pages.dev`).
3. GoDaddy → My Products → `paulnixon.in` → DNS → Add record, type **CNAME**:
   - Name `api-mercor` → value `<service>.onrender.com`
   - Name `mercor` → value `<project>.pages.dev`
   - Remove any existing A/CNAME record for those two names. Leave other records alone.
4. Wait for both dashboards to show the domain verified and certificate issued (minutes to an hour).

## Phase E — verification (AI runs the curl checks, human does the browser test)
```sh
curl -i https://api-mercor.paulnixon.in/health
curl -i -X OPTIONS https://api-mercor.paulnixon.in/api/interviews \
  -H "Origin: https://mercor.paulnixon.in" -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization"
curl -s https://mercor.paulnixon.in | grep -o 'chunk-[a-z0-9]*\.js' | head -1
```
Expected: health `200`; preflight `204` with `Access-Control-Allow-Origin: https://mercor.paulnixon.in`; the page returns HTML.
**[HUMAN]** In a browser with a microphone: open `https://mercor.paulnixon.in`, enter a GitHub URL, run an interview, hard-refresh on `/interview/<id>`, open the result page.

## Troubleshooting
| Symptom | Cause / fix |
| --- | --- |
| Browser CORS error | `FRONTEND_ORIGIN` must exactly equal `https://mercor.paulnixon.in` (https, no trailing slash); redeploy Render after changing |
| Blank page or requests to `undefined`/localhost | `BUN_PUBLIC_BACKEND_URL` missing at Pages build time; set it and redeploy |
| `POST /api/pre-interview` returns 502, Render log shows `AxiosError ... 403` | GitHub rate limit on Render's shared IP; set `GITHUB_TOKEN` |
| Everyone gets 429 | `TRUST_PROXY` not set to `1` on Render |
| First request very slow | Render free tier cold start; use Starter |
| Interview lost mid-session | Render restarted the instance (sessions are in memory); use Starter and a single instance |
| Mic blocked | Page must be served over HTTPS (it is, once the cert is active) |
| Domain stuck "pending" | CNAME value typo or leftover conflicting record at GoDaddy; DNS can take up to an hour |
