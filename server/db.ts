import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  watchlistEntries,
  alertPreferences,
  sourceHealth,
} from "../drizzle/schema.js";

let _db: ReturnType<typeof drizzle> | null = null;

// Khởi tạo kết nối Drizzle ORM
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
    const values: InsertUser = {
      openId: user.openId,
    };
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
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getWatchlist(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(watchlistEntries)
    .where(eq(watchlistEntries.userId, userId));
}

export async function addWatchlistEntry(
  userId: number,
  tokenId: string,
  chainId: string
) {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(watchlistEntries)
    .where(
      and(
        eq(watchlistEntries.userId, userId),
        eq(watchlistEntries.tokenId, tokenId)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    await db.insert(watchlistEntries).values({ userId, tokenId, chainId });
  }
}

export async function removeWatchlistEntry(userId: number, tokenId: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(watchlistEntries)
    .where(
      and(
        eq(watchlistEntries.userId, userId),
        eq(watchlistEntries.tokenId, tokenId)
      )
    );
}

export async function getAlertPreferences(userId: number) {
  const db = await getDb();
  const defaultPrefs = {
    potentialThreshold: 70,
    highRiskThreshold: 75,
    enabled: 1,
    scheduleEnabled: 0,
    scheduleCron: null,
    timezone: "UTC",
    lastDeliveredFingerprint: null,
    lastDeliveredAt: null,
  };

  if (!db) return defaultPrefs;

  const rows = await db
    .select()
    .from(alertPreferences)
    .where(eq(alertPreferences.userId, userId))
    .limit(1);

  return rows[0] ?? defaultPrefs;
}

export async function saveAlertPreferences(
  userId: number,
  values: {
    potentialThreshold: number;
    highRiskThreshold: number;
    enabled: number;
    scheduleEnabled?: number;
    scheduleCron?: string | null;
    timezone?: string;
    lastDeliveredFingerprint?: string | null;
    lastDeliveredAt?: Date | null;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(alertPreferences)
    .values({ userId, ...values })
    .onDuplicateKeyUpdate({ set: values });
}

export async function recordAlertDelivery(
  userId: number,
  fingerprint: string,
  deliveredAt = new Date()
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(alertPreferences)
    .set({
      lastDeliveredFingerprint: fingerprint,
      lastDeliveredAt: deliveredAt,
    })
    .where(eq(alertPreferences.userId, userId));
}

export async function getSourceHealthRows() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sourceHealth);
}

export async function getSourceHealthRow(source: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(sourceHealth)
    .where(eq(sourceHealth.source, source))
    .limit(1);
  return rows[0];
}

export async function saveSourceHealthAlert(
  source: string,
  fingerprint: string,
  alertedAt = new Date()
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(sourceHealth)
    .set({ alertFingerprint: fingerprint, lastAlertedAt: alertedAt })
    .where(eq(sourceHealth.source, source));
}
