import { z } from "zod";
import { parse as parseCookie } from "cookie";
import { createHeartbeatJob, updateHeartbeatJob, deleteHeartbeatJob } from "./_core/heartbeat.js";
import { protectedProcedure } from "./_core/trpc.js";
import { getAlertPreferences, getWatchlist, addWatchlistEntry, removeWatchlistEntry, saveAlertPreferences } from "./db.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { systemRouter } from "./_core/systemRouter.js";
import { publicProcedure, router } from "./_core/trpc.js";
import { discoverTokens } from "./marketData.js";
import { shouldAlert } from "./researchGuards.js";
import { sendTelegramResearchAlert, type TelegramLocale } from "./telegram.js";
import { buildDailyUtcCron, type FixedAlertTime, type SupportedTimezone } from "./scheduleGuards.js";
import { COOKIE_NAME } from "../shared/const.js";
import { getLatestSourceHealth, runSourceHealthChecks } from "./sourceHealth.js";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  health: router({
    sources: publicProcedure.query(async () => {
      const current = await getLatestSourceHealth();
      return current.length ? current : runSourceHealthChecks();
    }),
  }),
  tokens: router({
    discover: publicProcedure.input(z.object({
      chain: z.string().optional(), search: z.string().max(80).optional(),
      sort: z.enum(["age", "liquidity", "volume", "momentum", "potential", "risk"]).optional(),
      minVolume24h: z.number().min(0).optional(), maxVolume24h: z.number().min(0).optional(),
      sparklineRange: z.enum(["1h", "4h", "24h"]).optional(),
      limit: z.number().int().min(1).max(24).optional(),
    }).optional()).query(({ input }) => discoverTokens(input ?? {})),
  }),
  research: router({
    watchlist: protectedProcedure.query(({ ctx }) => getWatchlist(ctx.user.id)),
    addToWatchlist: protectedProcedure.input(z.object({ tokenId: z.string().max(180), chainId: z.string().max(64) })).mutation(({ ctx, input }) => addWatchlistEntry(ctx.user.id, input.tokenId, input.chainId).then(() => ({ success: true }))),
    removeFromWatchlist: protectedProcedure.input(z.object({ tokenId: z.string().max(180) })).mutation(({ ctx, input }) => removeWatchlistEntry(ctx.user.id, input.tokenId).then(() => ({ success: true }))),
    alertPreferences: protectedProcedure.query(({ ctx }) => getAlertPreferences(ctx.user.id)),
    saveAlertPreferences: protectedProcedure.input(z.object({ potentialThreshold: z.number().int().min(0).max(100), highRiskThreshold: z.number().int().min(0).max(100), enabled: z.number().int().min(0).max(1) })).mutation(({ ctx, input }) => saveAlertPreferences(ctx.user.id, input).then(() => ({ success: true }))),
    saveAlertSchedule: protectedProcedure.input(z.object({ potentialThreshold: z.number().int().min(0).max(100), highRiskThreshold: z.number().int().min(0).max(100), enabled: z.number().int().min(0).max(1), scheduleEnabled: z.boolean(), timezone: z.enum(["UTC", "Asia/Ho_Chi_Minh", "America/New_York", "Europe/London"]), timesUtc: z.array(z.enum(["09:00", "13:00", "18:00", "21:00"])).min(1).max(4) })).mutation(async ({ ctx, input }) => {
      const session = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const cron = buildDailyUtcCron(input.timesUtc as FixedAlertTime[], input.timezone as SupportedTimezone);
      const current = await getAlertPreferences(ctx.user.id);
      let taskUid = current.scheduleCronTaskUid;
      if (input.scheduleEnabled) {
        if (taskUid) await updateHeartbeatJob(taskUid, { cron, enable: true, description: "Scheduled research-only memecoin Telegram alerts" }, session);
        else { const job = await createHeartbeatJob({ name: `memecoin-alert-${ctx.user.id}`, cron, path: "/api/scheduled/telegramAlerts", description: "Scheduled research-only memecoin Telegram alerts" }, session); taskUid = job.taskUid; }
      } else if (taskUid) { await updateHeartbeatJob(taskUid, { enable: false }, session); }
      await saveAlertPreferences(ctx.user.id, { potentialThreshold: input.potentialThreshold, highRiskThreshold: input.highRiskThreshold, enabled: input.enabled, scheduleEnabled: input.scheduleEnabled ? 1 : 0, scheduleCronTaskUid: taskUid, scheduleCron: cron, timezone: input.timezone });
      return { success: true, taskUid, cron };
    }),
    disableAlertSchedule: protectedProcedure.mutation(async ({ ctx }) => { const current = await getAlertPreferences(ctx.user.id); if (current.scheduleCronTaskUid) { const session = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? ""; await deleteHeartbeatJob(current.scheduleCronTaskUid, session); } await saveAlertPreferences(ctx.user.id, { potentialThreshold: current.potentialThreshold, highRiskThreshold: current.highRiskThreshold, enabled: current.enabled, scheduleEnabled: 0, scheduleCronTaskUid: null, scheduleCron: null }); return { success: true }; }),
    sendTelegramAlerts: protectedProcedure.input(z.object({ potentialThreshold: z.number().int().min(0).max(100), highRiskThreshold: z.number().int().min(0).max(100), watchedTokenIds: z.array(z.string().max(180)).max(100), locale: z.enum(["vi", "en"]) })).mutation(async ({ input }) => {
      const snapshot = await discoverTokens({ limit: 24 });
      const matches = snapshot.tokens.filter(token => shouldAlert({ enabled: true, potentialScore: token.potentialScore, riskScore: token.riskScore, potentialThreshold: input.potentialThreshold, highRiskThreshold: input.highRiskThreshold, watched: input.watchedTokenIds.includes(token.id) }));
      return sendTelegramResearchAlert(matches, input.locale as TelegramLocale);
    }),
    evaluateAlerts: protectedProcedure.input(z.object({ potentialThreshold: z.number().int().min(0).max(100), highRiskThreshold: z.number().int().min(0).max(100), watchedTokenIds: z.array(z.string().max(180)).max(100) })).query(async ({ input }) => {
      const snapshot = await discoverTokens({ limit: 24 });
      return snapshot.tokens.filter(token => shouldAlert({ enabled: true, potentialScore: token.potentialScore, riskScore: token.riskScore, potentialThreshold: input.potentialThreshold, highRiskThreshold: input.highRiskThreshold, watched: input.watchedTokenIds.includes(token.id) })).map(token => ({ tokenId: token.id, symbol: token.symbol, potentialScore: token.potentialScore, riskScore: token.riskScore, reasons: token.riskReasons }));
    }),
  }),
});

export type AppRouter = typeof appRouter;
