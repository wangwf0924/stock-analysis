import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  InsertPhoneUser, phoneUsers,
  InsertInviteCode, inviteCodes, inviteCodeUses,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── 手机号用户 ──────────────────────────────────────────────

export async function getPhoneUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(phoneUsers).where(eq(phoneUsers.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPhoneUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(phoneUsers).where(eq(phoneUsers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPhoneUser(data: InsertPhoneUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(phoneUsers).values(data);
  return result;
}

export async function updatePhoneUserLastSignedIn(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(phoneUsers).set({ lastSignedIn: new Date() }).where(eq(phoneUsers.id, id));
}

export async function listPhoneUsers(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: phoneUsers.id,
    phone: phoneUsers.phone,
    nickname: phoneUsers.nickname,
    role: phoneUsers.role,
    inviteCode: phoneUsers.inviteCode,
    isActive: phoneUsers.isActive,
    createdAt: phoneUsers.createdAt,
    lastSignedIn: phoneUsers.lastSignedIn,
  }).from(phoneUsers).limit(limit).offset(offset).orderBy(phoneUsers.createdAt);
}

export async function countPhoneUsers() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(phoneUsers);
  return Number(result[0]?.count ?? 0);
}

// ── 邀请码 ──────────────────────────────────────────────────

export async function getInviteCodeByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createInviteCode(data: InsertInviteCode) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(inviteCodes).values(data);
}

export async function listInviteCodes(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inviteCodes).limit(limit).offset(offset).orderBy(inviteCodes.createdAt);
}

export async function disableInviteCode(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(inviteCodes).set({ isDisabled: true }).where(eq(inviteCodes.id, id));
}

export async function enableInviteCode(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(inviteCodes).set({ isDisabled: false }).where(eq(inviteCodes.id, id));
}

export async function deleteInviteCode(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(inviteCodes).where(eq(inviteCodes.id, id));
}

export async function incrementInviteCodeUsed(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(inviteCodes)
    .set({ usedCount: sql`${inviteCodes.usedCount} + 1` })
    .where(eq(inviteCodes.id, id));
}

export async function recordInviteCodeUse(inviteCodeId: number, usedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(inviteCodeUses).values({ inviteCodeId, usedBy });
}

/**
 * 验证邀请码是否可用（未过期、未禁用、未超出使用次数）
 * 返回邀请码记录（有效）或 null（无效）
 */
export async function validateInviteCode(code: string) {
  const record = await getInviteCodeByCode(code);
  if (!record) return { valid: false, reason: "邀请码不存在" as const };
  if (record.isDisabled) return { valid: false, reason: "邀请码已禁用" as const };
  if (record.expiresAt && record.expiresAt < new Date()) return { valid: false, reason: "邀请码已过期" as const };
  if (record.maxUses > 0 && record.usedCount >= record.maxUses) return { valid: false, reason: "邀请码已达使用上限" as const };
  return { valid: true, record };
}
