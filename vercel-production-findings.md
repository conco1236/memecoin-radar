# Vercel production findings

Checked `https://memecoin-radar-kappa.vercel.app/` on 2026-08-27. The frontend shell renders, but the discovery table remains in skeleton/loading state and never receives token data.

Direct request to `https://memecoin-radar-kappa.vercel.app/api/trpc/tokens.discover` returns Vercel `500 INTERNAL_SERVER_ERROR` with `FUNCTION_INVOCATION_FAILED` (`cle1::jnx6h-1787845057174-701111b8bfc3`). Browser console had no additional output. This confirms the mismatch is a production serverless API crash, not a CSS/rendering issue.

Next diagnostic target: Vercel function runtime/build logs and production environment variables, especially DATABASE_URL, BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY, OAuth/runtime values, and compatibility of the tRPC function wrapper with the deployed build.

Additional Vercel inspection: the configured Vercel team `conco's projects` (`team_0VHYsdt0hEyiExlJmzY5mwCE`) reports `linkedProjects: []`; querying build logs for `memecoin-radar-kappa.vercel.app` under that team returns `404 Deployment not found`. This indicates the production URL belongs to a different Vercel account/team or is not linked to the configured team, so its private runtime logs/settings cannot be fetched from this session.

Second production check on 2026-08-27: the root now includes the Settings link, confirming a newer frontend deployment is live, but the valid batch request to `/api/trpc/tokens.discover` still returns `500 FUNCTION_INVOCATION_FAILED` (`cle1::w9bk2-1787846400368-c610cd10b4a7`). The dashboard therefore remains stuck in skeleton state. This rules out a frontend-only mismatch; the production serverless function is still crashing before returning tRPC JSON.

Third production check: `auth.me` also returns `FUNCTION_INVOCATION_FAILED` 500, confirming the failure affects the entire tRPC serverless function, not only the market-data procedure. The Vercel `_logs` link redirects to the Vercel login page, so the stack trace cannot be read without the owner's Vercel session.

Authenticated Vercel Runtime Logs identified the exact root cause: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/server/routers' imported from /var/task/api/trpc/[...path].js`. The deployed Node ESM function rejects extensionless relative imports emitted from the TypeScript source. This affects all tRPC procedures during module load, explaining the universal 500 response.
