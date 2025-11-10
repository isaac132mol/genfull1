import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  cardHistory: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const history = await db.getUserCardHistory(ctx.user.id);
      return history;
    }),
    create: protectedProcedure
      .input(
        z.object({
          bin: z.string(),
          month: z.string(),
          year: z.string(),
          cvv: z.string(),
          quantity: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await db.createCardHistory({
          userId: ctx.user.id,
          ...input,
        });
        return result;
      }),
    toggleFavorite: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.toggleCardHistoryFavorite(input.id, ctx.user.id);
        return result;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.deleteCardHistory(input.id, ctx.user.id);
        return result;
      }),
    clear: protectedProcedure.mutation(async ({ ctx }) => {
      const result = await db.clearUserCardHistory(ctx.user.id);
      return result;
    }),
  }),
});

export type AppRouter = typeof appRouter;
