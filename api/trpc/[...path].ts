import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../../server/routers.js";
import { createContext } from "../../server/_core/context.js";

export function normalizeTrpcPath(url: string): string {
  return url.startsWith("/api/trpc") ? url.slice("/api/trpc".length) || "/" : url;
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

// Vercel invokes this catch-all function with `/api/trpc/...` still present in
// req.url. Strip the deployment prefix so tRPC sees its canonical procedure path.
app.use((req, _res, next) => {
  if (req.url.startsWith("/api/trpc")) {
    req.url = normalizeTrpcPath(req.url);
  }
  next();
});

app.use("/", createExpressMiddleware({ router: appRouter, createContext }));

// Keep production failures observable in Vercel runtime logs and return JSON
// instead of allowing an uncaught Express error to terminate the function.
app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(error);
  console.error("[Vercel tRPC] request failed", {
    path: req.originalUrl,
    error: error instanceof Error ? error.message : String(error),
  });
  res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Yêu cầu API production thất bại. Kiểm tra Vercel runtime logs." });
});

export default app;
