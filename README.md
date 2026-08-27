# Memecoin Radar

Memecoin Radar is a **research-only** web dashboard for discovering newly created memecoin pairs and evaluating them through transparent market signals. It does not connect wallets, place orders, recommend a trade, or include buy/sell execution.

## What it includes

The dashboard reads newly published token profiles and pair metrics from the public DEX Screener API. It normalizes chain, pair age, liquidity, volume, momentum, transactions, freshness, and outbound market links. Each row exposes a Potential score and Risk score; the detail panel lists the exact positive and negative reasons used by the current heuristic.

Users can search by token or chain, sort the discovery table, adjust a local potential alert threshold, and save a browser-local watchlist. Alerts are intentionally informational UI notices. Holder concentration and contract safety are marked as unverified when the public source does not provide those fields; the app never invents values.

## Scoring posture

Potential is a screening score from 0–100 based on pair age, liquidity, volume, momentum, and early buy/sell balance. Risk is a separate 0–100 score that increases for thin liquidity, low activity, extreme momentum, stale data, and unverified holder/contract evidence. These are not financial advice, forecasts, profitability claims, or investment recommendations.

## Local development

```bash
pnpm install
pnpm dev
```

Run checks before committing:

```bash
pnpm check
pnpm test
pnpm build
```

## Telegram alert scheduling

The Settings page (`/settings`) lets an authenticated user choose potential and high-risk thresholds and select fixed UTC delivery slots: 09:00, 13:00, 18:00, or 21:00. Saving an enabled schedule creates or updates one Heartbeat job at `/api/scheduled/telegramAlerts`. The callback authenticates the cron task by `taskUid`, skips orphaned or disabled schedules, and suppresses duplicate fingerprints. **Deploy the project to production before enabling a schedule**, because sandbox preview URLs are not reachable by the scheduler. Telegram delivery remains research-only and never executes trades.

## Environment variables

Copy `.env.template` to a local environment file only for local development. Never commit `.env` or production credentials. The Manus project supplies database, auth, and server runtime variables through its managed environment. `DEXSCREENER_API_BASE_URL` is optional and defaults to the public API base URL.

## Vercel deployment

The repository is Vercel-ready through `vercel.json`. Use these exact import values:

| Setting | Value |
| --- | --- |
| Git repository | `conco1236/memecoin-radar` |
| Visibility | Private |
| Root directory | `.` |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build` |
| Framework preset | Vite |
| Output directory | `dist/public` |
| Node runtime | Use the project default / Node 22-compatible runtime |
|

Import the GitHub repository into Vercel, keep the project root at the repository root, and add these variables through Vercel Project Settings → Environment Variables. The connected Vercel team currently has no project listed for this repository, so the first Import/Redeploy must be completed by the project owner in Vercel before production settings or runtime logs can be verified.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DEXSCREENER_API_BASE_URL` | Optional | Public data base URL; defaults to `https://api.dexscreener.com` |
| `DATABASE_URL` | Managed production | Database connection for the existing project runtime |
| `JWT_SECRET` | Managed production | Session signing |
| `VITE_APP_ID` | Managed production | Manus OAuth application identifier |
| `OAUTH_SERVER_URL` | Managed production | OAuth backend base URL |
| `VITE_OAUTH_PORTAL_URL` | Managed production | Frontend login portal |
| `BUILT_IN_FORGE_API_URL` | Managed production | Managed backend API base URL |
| `BUILT_IN_FORGE_API_KEY` | Managed production | Server-side managed API credential |

Do not paste secrets into GitHub. For a database-backed production environment, configure `DATABASE_URL` and auth variables in the deployment environment rather than committing them.

### Post-deploy verification

After each Vercel redeploy, verify that `/` renders the dashboard, `/settings` renders the authenticated settings shell, and the browser Network panel shows a successful request to `/api/trpc/tokens.discover` with a JSON response containing `result.data`. If the API returns `FUNCTION_INVOCATION_FAILED`, check Vercel Runtime Logs and confirm the following production variables are present: `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID`. The public discovery route must work before enabling the Heartbeat schedule.

The browser watchlist remains available locally, while authenticated alert preferences and scheduled Telegram delivery are stored server-side. The Settings page requires login to create or change a schedule. The first scheduled callback only becomes reachable after production deployment and must be enabled from Settings; it is not a trading or execution worker.

The public data integration is server-side so that API calls and future rate-limit controls remain outside the browser. The default Autoscale deployment is appropriate for request-driven dashboard refreshes. High-frequency polling or always-on notification delivery should use a managed background/heartbeat configuration rather than a browser tab.

## GitHub handoff

```bash
git add .
git commit -m "Build research-only memecoin discovery dashboard"
git push origin main
```

Do not commit `.env`, `.env.*`, logs, `node_modules`, `dist`, coverage output, or private runtime exports.

## Data source

The current adapter uses DEX Screener's public API for latest token profiles and token pair metrics. Public endpoints can be rate-limited or temporarily unavailable; the UI reports a data notice and shows an empty state rather than fabricated rows. Explorer and market links are outbound verification surfaces only.
