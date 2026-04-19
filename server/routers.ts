import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { localPasswordAuth, sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { costingRouter } from "./routers/costing";
import { workersRouter } from "./routers/workers";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(
        z.object({
          username: z.string().trim().min(1),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (
          input.username !== localPasswordAuth.username ||
          input.password !== localPasswordAuth.password
        ) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "帳號或密碼錯誤" });
        }

        const sessionToken = await sdk.createSessionToken(localPasswordAuth.openId, {
          name: localPasswordAuth.displayName,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);

        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: 1000 * 60 * 60 * 24 * 365,
        });

        return {
          success: true,
          user: {
            openId: localPasswordAuth.openId,
            name: localPasswordAuth.displayName,
            email: localPasswordAuth.username,
          },
        } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  costing: costingRouter,
  workers: workersRouter,
});

export type AppRouter = typeof appRouter;
