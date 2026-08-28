import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

/**
 * =========================================================================
 * 1. BẢNG QUẢN LÝ NGƯỜI DÙNG (USERS)
 * Đã loại bỏ hoàn toàn Manus OAuth, chuyển sang Email/Mật khẩu truyền thống
 * =========================================================================
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("passwordHash").notNull(), // Lưu mật khẩu băm bảo mật
  name: text("name"),
  role: text("role").$type<"user" | "admin">().default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).defaultNow().notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;


/**
 * =========================================================================
 * 2. BẢNG DANH SÁCH THEO DÕI (WATCHLIST ENTRIES)
 * =========================================================================
 */
export const watchlistEntries = sqliteTable("watchlist_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  tokenId: text("tokenId").notNull(),
  chainId: text("chainId").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
}, table => ({
  userTokenUnique: uniqueIndex("watchlist_user_token_unique").on(table.userId, table.tokenId)
}));

export type WatchlistEntry = typeof watchlistEntries.$inferSelect;


/**
 * =========================================================================
 * 3. BẢNG CẤU HÌNH CẢNH BÁO (ALERT PREFERENCES)
 * =========================================================================
 */
export const alertPreferences = sqliteTable("alert_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().unique(),
  potentialThreshold: integer("potentialThreshold").default(70).notNull(),
  highRiskThreshold: integer("highRiskThreshold").default(75).notNull(),
  enabled: integer("enabled").default(1).notNull(),
  scheduleEnabled: integer("scheduleEnabled").default(0).notNull(),
  scheduleCronTaskUid: text("scheduleCronTaskUid"),
  scheduleCron: text("scheduleCron"),
  timezone: text("timezone").default("UTC").notNull(),
  lastDeliveredFingerprint: text("lastDeliveredFingerprint"),
  lastDeliveredAt: integer("lastDeliveredAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).defaultNow().notNull(),
}, table => ({
  taskUidIndex: index("alert_preferences_task_uid_idx").on(table.scheduleCronTaskUid)
}));

export type AlertPreference = typeof alertPreferences.$inferSelect;


/**
 * =========================================================================
 * 4. BẢNG SỨC KHỎE NGUỒN DỮ LIỆU (SOURCE HEALTH)
 * =========================================================================
 */
export const sourceHealth = sqliteTable("source_health", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull().unique(),
  endpoint: text("endpoint").notNull(),
  status: text("status").$type<"healthy" | "stale" | "down">().notNull(),
  httpStatus: integer("httpStatus"),
  latencyMs: integer("latencyMs").notNull(),
  recordCount: integer("recordCount").notNull(),
  dataAgeSeconds: integer("dataAgeSeconds").notNull(),
  lastCheckedAt: integer("lastCheckedAt", { mode: "timestamp" }).notNull(),
  lastSuccessAt: integer("lastSuccessAt", { mode: "timestamp" }),
  errorMessage: text("errorMessage"),
  alertFingerprint: text("alertFingerprint"),
  lastAlertedAt: integer("lastAlertedAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).defaultNow().notNull(),
});

export type SourceHealth = typeof sourceHealth.$inferSelect;
