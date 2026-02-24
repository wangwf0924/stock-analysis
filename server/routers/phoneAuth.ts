/**
 * 手机号 + 密码 + 邀请码 认证路由
 * 提供注册、登录、获取当前用户信息等接口
 */

import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";
import { publicProcedure, router } from "../_core/trpc";
import { getSessionCookieOptions } from "../_core/cookies";
import {
  getPhoneUserByPhone,
  createPhoneUser,
  getPhoneUserById,
  updatePhoneUserLastSignedIn,
  validateInviteCode,
  incrementInviteCodeUsed,
  recordInviteCodeUse,
} from "../db";

const PHONE_SESSION_COOKIE = "sw_phone_session";
const JWT_SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "stockwise-secret-key");

/** 签发 JWT */
async function signPhoneToken(userId: number): Promise<string> {
  return new SignJWT({ sub: String(userId), type: "phone" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET_KEY);
}

/** 验证 JWT，返回 userId 或 null */
async function verifyPhoneToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    if (payload.type !== "phone" || !payload.sub) return null;
    return parseInt(payload.sub, 10);
  } catch {
    return null;
  }
}

export const phoneAuthRouter = router({
  /** 注册：手机号 + 密码 + 邀请码 */
  register: publicProcedure
    .input(z.object({
      phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号"),
      password: z.string().min(8, "密码至少 8 位").max(64, "密码最多 64 位"),
      nickname: z.string().min(1, "请输入昵称").max(32, "昵称最多 32 个字符"),
      inviteCode: z.string().min(1, "请输入邀请码"),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. 验证邀请码
      const codeResult = await validateInviteCode(input.inviteCode);
      if (!codeResult.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: codeResult.reason });
      }

      // 2. 检查手机号是否已注册
      const existing = await getPhoneUserByPhone(input.phone);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "该手机号已注册" });
      }

      // 3. 哈希密码
      const passwordHash = await bcrypt.hash(input.password, 12);

      // 4. 创建用户
      const result = await createPhoneUser({
        phone: input.phone,
        nickname: input.nickname,
        passwordHash,
        inviteCode: input.inviteCode,
        role: "user",
        isActive: true,
      });

      // 获取新用户 id
      const newUser = await getPhoneUserByPhone(input.phone);
      if (!newUser) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "注册失败，请重试" });

      // 5. 消耗邀请码
      await incrementInviteCodeUsed(codeResult.record!.id);
      await recordInviteCodeUse(codeResult.record!.id, newUser.id);

      // 6. 签发 JWT，设置 Cookie
      const token = await signPhoneToken(newUser.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(PHONE_SESSION_COOKIE, token, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 天
      });

      return {
        success: true,
        user: {
          id: newUser.id,
          phone: newUser.phone,
          nickname: newUser.nickname,
          role: newUser.role,
        },
      };
    }),

  /** 登录：手机号 + 密码 */
  login: publicProcedure
    .input(z.object({
      phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号"),
      password: z.string().min(1, "请输入密码"),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. 查找用户
      const user = await getPhoneUserByPhone(input.phone);
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "手机号或密码错误" });
      }

      // 2. 验证密码
      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "手机号或密码错误" });
      }

      // 3. 检查账号状态
      if (!user.isActive) {
        throw new TRPCError({ code: "FORBIDDEN", message: "账号已被禁用，请联系管理员" });
      }

      // 4. 更新最后登录时间
      await updatePhoneUserLastSignedIn(user.id);

      // 5. 签发 JWT，设置 Cookie
      const token = await signPhoneToken(user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(PHONE_SESSION_COOKIE, token, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return {
        success: true,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          role: user.role,
        },
      };
    }),

  /** 登出 */
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(PHONE_SESSION_COOKIE, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  /** 获取当前登录的手机号用户信息 */
  me: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.req.cookies?.[PHONE_SESSION_COOKIE];
    if (!token) return null;

    const userId = await verifyPhoneToken(token);
    if (!userId) return null;

    const user = await getPhoneUserById(userId);
    if (!user || !user.isActive) return null;

    return {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      role: user.role,
      createdAt: user.createdAt,
    };
  }),

  /** 验证邀请码是否有效（注册前预检） */
  checkInviteCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const result = await validateInviteCode(input.code);
      return { valid: result.valid, reason: result.valid ? undefined : result.reason };
    }),
});
