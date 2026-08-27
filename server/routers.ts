import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { discoverTokens } from "./marketData";

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
      limit: z.number().int().min(1).max(24).optional(),
    }).optional()).query(({ input }) => discoverTokens(input ?? {})),
  }),
});

export type AppRouter = typeof appRouter;
