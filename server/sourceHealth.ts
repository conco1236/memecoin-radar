import { sourceHealth, type SourceHealth } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { getDb } from "./db.js";

export type HealthStatus = "healthy" | "stale" | "down";
export type SourceHealthSnapshot = Omit<SourceHealth, "id" | "updatedAt">;

const STALE_AFTER_SECONDS = 15 * 60;
const REQUEST_TIMEOUT_MS = 8_000;

const SOURCE_ENDPOINTS = {
  dexScreener: "https://api.dexscreener.com/token-profiles/latest/v1",
  geckoTerminal: "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?page=1",
} as const;

function extractRecords(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.pairs)) return record.pairs;
  return [];
}

function latestPayloadTimestamp(payload: unknown): number | null {
  const records = extractRecords(payload);
  const timestamps = records.flatMap(record => {
    if (!record || typeof record !== "object") return [];
    const attributes = (record as Record<string, unknown>).attributes;
    const source = attributes && typeof attributes === "object" ? attributes : record;
    const value = (source as Record<string, unknown>).updated_at ?? (source as Record<string, unknown>).created_at;
    const timestamp = typeof value === "number" ? value : typeof value === "string" ? Date.parse(value) : NaN;
    return Number.isFinite(timestamp) ? [timestamp] : [];
  });
  return timestamps.length ? Math.max(...timestamps) : null;
}

export async function requestSource(source: keyof typeof SOURCE_ENDPOINTS, endpoint: string): Promise<SourceHealthSnapshot> {
  const checkedAt = new Date();
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, { signal: controller.signal, headers: { accept: "application/json", "user-agent": "MemecoinRadar/1.0 health-check" } });
    const payload = await response.json().catch(() => null);
    const latencyMs = Date.now() - started;
    const records = extractRecords(payload);
    const payloadTimestamp = latestPayloadTimestamp(payload);
    const dataAgeSeconds = payloadTimestamp ? Math.max(0, Math.round((checkedAt.getTime() - payloadTimestamp) / 1000)) : 0;
    const status: HealthStatus = !response.ok ? "down" : records.length === 0 || dataAgeSeconds > STALE_AFTER_SECONDS ? "stale" : "healthy";
    const errorMessage = !response.ok ? `HTTP ${response.status}` : records.length === 0 ? "Successful response contained no records" : dataAgeSeconds > STALE_AFTER_SECONDS ? `Latest upstream record is ${dataAgeSeconds}s old` : null;
    return { source, endpoint, status, httpStatus: response.status, latencyMs, recordCount: records.length, dataAgeSeconds, lastCheckedAt: checkedAt, lastSuccessAt: response.ok ? checkedAt : null, errorMessage, alertFingerprint: status === "healthy" ? null : `${source}:${status}:${errorMessage ?? "stale"}`, lastAlertedAt: null };
  } catch (error) {
    return { source, endpoint, status: "down", httpStatus: null, latencyMs: Date.now() - started, recordCount: 0, dataAgeSeconds: STALE_AFTER_SECONDS, lastCheckedAt: checkedAt, lastSuccessAt: null, errorMessage: error instanceof Error ? error.message : "Unknown source error", alertFingerprint: `${source}:down`, lastAlertedAt: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runSourceHealthChecks(): Promise<SourceHealthSnapshot[]> {
  const snapshots = await Promise.all(Object.entries(SOURCE_ENDPOINTS).map(([source, endpoint]) => requestSource(source as keyof typeof SOURCE_ENDPOINTS, endpoint)));
  const db = await getDb();
  if (db) {
    for (const snapshot of snapshots) {
      const previous = await db.select().from(sourceHealth).where(eq(sourceHealth.source, snapshot.source)).limit(1);
      const lastAlertedAt = previous[0]?.lastAlertedAt ?? null;
      await db.insert(sourceHealth).values({ ...snapshot, lastAlertedAt }).onDuplicateKeyUpdate({ set: { ...snapshot, lastAlertedAt } });
    }
  }
  return snapshots;
}

export async function getLatestSourceHealth(): Promise<SourceHealth[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sourceHealth);
}

export async function markSourceHealthAlerted(source: string, fingerprint: string, alertedAt = new Date()) {
  const db = await getDb();
  if (!db) return;
  await db.update(sourceHealth).set({ alertFingerprint: fingerprint, lastAlertedAt: alertedAt }).where(eq(sourceHealth.source, source));
}

export { SOURCE_ENDPOINTS, STALE_AFTER_SECONDS };
