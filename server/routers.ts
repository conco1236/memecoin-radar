import { z } from "zod";
import { protectedProcedure } from "./_core/trpc";
import { getAlertPreferences, getWatchlist, addWatchlistEntry, removeWatchlistEntry, saveAlertPreferences } from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { discoverTokens } from "./marketData";
import { shouldAlert } from "./researchGuards";

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
  tokens: router({
    discover: publicProcedure.input(z.object({
      chain: z.string().optional(), search: z.string().max(80).optional(),
      sort: z.enum(["age", "liquidity", "volume", "momentum", "potential", "risk"]).optional(),
      minVolume24h: z.number().min(0).optional(), maxVolume24h: z.number().min(0).optional(),
      limit: z.number().int().min(1).max(24).optional(),
    }).optional()).query(({ input }) => discoverTokens(input ?? {})),
  }),
  research: router({
    watchlist: protectedProcedure.query(({ ctx }) => getWatchlist(ctx.user.id)),
    addToWatchlist: protectedProcedure.input(z.object({ tokenId: z.string().max(180), chainId: z.string().max(64) })).mutation(({ ctx, input }) => addWatchlistEntry(ctx.user.id, input.tokenId, input.chainId).then(() => ({ success: true }))),
    removeFromWatchlist: protectedProcedure.input(z.object({ tokenId: z.string().max(180) })).mutation(({ ctx, input }) => removeWatchlistEntry(ctx.user.id, input.tokenId).then(() => ({ success: true }))),
    alertPreferences: protectedProcedure.query(({ ctx }) => getAlertPreferences(ctx.user.id)),
    saveAlertPreferences: protectedProcedure.input(z.object({ potentialThreshold: z.number().int().min(0).max(100), highRiskThreshold: z.number().int().min(0).max(100), enabled: z.number().int().min(0).max(1) })).mutation(({ ctx, input }) => saveAlertPreferences(ctx.user.id, input).then(() => ({ success: true }))),
    evaluateAlerts: protectedProcedure.input(z.object({ potentialThreshold: z.number().int().min(0).max(100), highRiskThreshold: z.number().int().min(0).max(100), watchedTokenIds: z.array(z.string().max(180)).max(100) })).query(async ({ input }) => {
      const snapshot = await discoverTokens({ limit: 24 });
      return snapshot.tokens.filter(token => shouldAlert({ enabled: true, potentialScore: token.potentialScore, riskScore: token.riskScore, potentialThreshold: input.potentialThreshold, highRiskThreshold: input.highRiskThreshold, watched: input.watchedTokenIds.includes(token.id) })).map(token => ({ tokenId: token.id, symbol: token.symbol, potentialScore: token.potentialScore, riskScore: token.riskScore, reasons: token.riskReasons }));
    }),
  }),
});

export type AppRouter = typeof appRouter;
