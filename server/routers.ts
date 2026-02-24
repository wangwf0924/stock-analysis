import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { phoneAuthRouter } from "./routers/phoneAuth";
import { adminRouter } from "./routers/admin";

export const appRouter = router({
  system: systemRouter,

  /** Manus OAuth 认证（保留原有） */
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  /** 手机号 + 密码 + 邀请码 认证 */
  phoneAuth: phoneAuthRouter,

  /** 管理员接口（邀请码管理 + 用户管理） */
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
