import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { phoneUsers, inviteCodes } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// 测试用的手机号和邀请码（使用不常见的前缀避免冲突）
const TEST_PHONE = "13900000001";
const TEST_PASSWORD = "Test@12345";
const TEST_NICKNAME = "测试用户_vitest";
const TEST_INVITE_CODE = "VITEST001";

function createPublicCtx(): TrpcContext {
  const cookies: Record<string, string> = {};
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string) => { cookies[name] = value; },
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-test",
      email: null,
      name: "Admin",
      loginMethod: "phone",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("phoneAuth — 邀请码与注册流程", () => {
  beforeAll(async () => {
    // 清理测试数据
    const db = await getDb();
    if (!db) return;
    await db.delete(phoneUsers).where(eq(phoneUsers.phone, TEST_PHONE));
    await db.delete(inviteCodes).where(eq(inviteCodes.code, TEST_INVITE_CODE));
    // 插入测试邀请码（createdBy 使用系统占位 ID 0）
    await db.insert(inviteCodes).values({
      code: TEST_INVITE_CODE,
      maxUses: 5,
      usedCount: 0,
      isDisabled: false,
      createdBy: 0,
    });
  });

  afterAll(async () => {
    // 清理测试数据
    const db = await getDb();
    if (!db) return;
    await db.delete(phoneUsers).where(eq(phoneUsers.phone, TEST_PHONE));
    await db.delete(inviteCodes).where(eq(inviteCodes.code, TEST_INVITE_CODE));
  });

  it("checkInviteCode — 有效邀请码返回 valid: true", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.phoneAuth.checkInviteCode({ code: TEST_INVITE_CODE });
    expect(result.valid).toBe(true);
  });

  it("checkInviteCode — 无效邀请码返回 valid: false", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.phoneAuth.checkInviteCode({ code: "INVALID999" });
    expect(result.valid).toBe(false);
  });

  it("register — 使用有效邀请码成功注册", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.phoneAuth.register({
      phone: TEST_PHONE,
      password: TEST_PASSWORD,
      nickname: TEST_NICKNAME,
      inviteCode: TEST_INVITE_CODE,
    });
    expect(result.success).toBe(true);
    expect(result.user.phone).toBe(TEST_PHONE);
    expect(result.user.nickname).toBe(TEST_NICKNAME);
  });

  it("register — 重复手机号注册失败", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.phoneAuth.register({
        phone: TEST_PHONE,
        password: TEST_PASSWORD,
        nickname: "另一个用户",
        inviteCode: TEST_INVITE_CODE,
      })
    ).rejects.toThrow();
  });

  it("login — 正确密码登录成功", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.phoneAuth.login({
      phone: TEST_PHONE,
      password: TEST_PASSWORD,
    });
    expect(result.success).toBe(true);
    expect(result.user.phone).toBe(TEST_PHONE);
  });

  it("login — 错误密码登录失败", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.phoneAuth.login({ phone: TEST_PHONE, password: "wrongpassword" })
    ).rejects.toThrow();
  });

  it("admin — 直接查询邀请码列表（db 层验证）", async () => {
    // admin 路由使用独立的 cookie 认证，测试中直接调用 db 层函数验证逻辑
    const { listInviteCodes } = await import("./db");
    const result = await listInviteCodes(10, 0);
    expect(Array.isArray(result)).toBe(true);
    // 确认测试邀请码在列表中
    const found = result.find(c => c.code === TEST_INVITE_CODE);
    expect(found).toBeDefined();
  });
});
