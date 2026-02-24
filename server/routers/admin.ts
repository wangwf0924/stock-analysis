/**
 * 管理员路由 — 邀请码管理 + 用户管理
 * 所有接口需要通过手机号登录且 role = 'admin'
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";
import { publicProcedure, router } from "../_core/trpc";
import {
  getPhoneUserById,
  listInviteCodes,
  createInviteCode,
  disableInviteCode,
  enableInviteCode,
  deleteInviteCode,
  listPhoneUsers,
  countPhoneUsers,
} from "../db";
import { nanoid } from "nanoid";

const PHONE_SESSION_COOKIE = "sw_phone_session";
const JWT_SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "stockwise-secret-key");

/** 从请求中获取当前手机号用户（含 admin 验证） */
async function requirePhoneAdmin(req: any) {
  const token = req.cookies?.[PHONE_SESSION_COOKIE];
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    if (payload.type !== "phone" || !payload.sub) throw new Error("invalid token");
    const userId = parseInt(payload.sub, 10);
    const user = await getPhoneUserById(userId);
    if (!user || !user.isActive) throw new TRPCError({ code: "UNAUTHORIZED", message: "用户不存在或已禁用" });
    if (user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
    return user;
  } catch (e) {
    if (e instanceof TRPCError) throw e;
    throw new TRPCError({ code: "UNAUTHORIZED", message: "登录已过期，请重新登录" });
  }
}

export const adminRouter = router({
  /** 获取邀请码列表 */
  listInviteCodes: publicProcedure
    .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }))
    .query(async ({ input, ctx }) => {
      await requirePhoneAdmin(ctx.req);
      return listInviteCodes(input.limit, input.offset);
    }),

  /** 生成新邀请码 */
  createInviteCode: publicProcedure
    .input(z.object({
      note: z.string().max(255).optional(),
      maxUses: z.number().int().min(0).default(1),
      expiresAt: z.date().optional(),
      count: z.number().int().min(1).max(100).default(1), // 批量生成数量
    }))
    .mutation(async ({ input, ctx }) => {
      const admin = await requirePhoneAdmin(ctx.req);
      const codes: string[] = [];

      for (let i = 0; i < input.count; i++) {
        // 生成 8 位大写字母+数字的邀请码
        const code = nanoid(8).toUpperCase().replace(/[^A-Z0-9]/g, 'X').slice(0, 8);
        await createInviteCode({
          code,
          note: input.note,
          maxUses: input.maxUses,
          expiresAt: input.expiresAt,
          createdBy: admin.id,
          usedCount: 0,
          isDisabled: false,
        });
        codes.push(code);
      }

      return { success: true, codes };
    }),

  /** 禁用邀请码 */
  disableInviteCode: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      await requirePhoneAdmin(ctx.req);
      await disableInviteCode(input.id);
      return { success: true };
    }),

  /** 启用邀请码 */
  enableInviteCode: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      await requirePhoneAdmin(ctx.req);
      await enableInviteCode(input.id);
      return { success: true };
    }),

  /** 删除邀请码 */
  deleteInviteCode: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      await requirePhoneAdmin(ctx.req);
      await deleteInviteCode(input.id);
      return { success: true };
    }),

  /** 获取用户列表 */
  listUsers: publicProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input, ctx }) => {
      await requirePhoneAdmin(ctx.req);
      const [users, total] = await Promise.all([
        listPhoneUsers(input.limit, input.offset),
        countPhoneUsers(),
      ]);
      return { users, total };
    }),
});
