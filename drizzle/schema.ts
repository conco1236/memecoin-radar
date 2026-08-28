import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, uniqueIndex, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const watchlistEntries = mysqlTable("watchlist_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenId: varchar("tokenId", { length: 180 }).notNull(),
  chainId: varchar("chainId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ userTokenUnique: uniqueIndex("watchlist_user_token_unique").on(table.userId, table.tokenId) }));

export const alertPreferences = mysqlTable("alert_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  potentialThreshold: int("potentialThreshold").default(70).notNull(),
  highRiskThreshold: int("highRiskThreshold").default(75).notNull(),
  enabled: int("enabled").default(1).notNull(),
  scheduleEnabled: int("scheduleEnabled").default(0).notNull(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  scheduleCron: varchar("scheduleCron", { length: 32 }),
  timezone: varchar("timezone", { length: 64 }).default("UTC").notNull(),
  lastDeliveredFingerprint: varchar("lastDeliveredFingerprint", { length: 255 }),
  lastDeliveredAt: timestamp("lastDeliveredAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ taskUidIndex: index("alert_preferences_task_uid_idx").on(table.scheduleCronTaskUid) }));

export type WatchlistEntry = typeof watchlistEntries.$inferSelect;
export type AlertPreference = typeof alertPreferences.$inferSelect;

export const sourceHealth = mysqlTable("source_health", {
  id: int("id").autoincrement().primaryKey(),
  source: varchar("source", { length: 32 }).notNull().unique(),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["healthy", "stale", "down"]).notNull(),
  httpStatus: int("httpStatus"),
  latencyMs: int("latencyMs").notNull(),
  recordCount: int("recordCount").notNull(),
  dataAgeSeconds: int("dataAgeSeconds").notNull(),
  lastCheckedAt: timestamp("lastCheckedAt").notNull(),
  lastSuccessAt: timestamp("lastSuccessAt"),
  errorMessage: text("errorMessage"),
  alertFingerprint: varchar("alertFingerprint", { length: 255 }),
  lastAlertedAt: timestamp("lastAlertedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SourceHealth = typeof sourceHealth.$inferSelect;
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// ====================================================
// BỔ SUNG: Bảng lưu trữ tài khoản đăng ký bằng Email
// ====================================================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// TODO: Add your tables here
