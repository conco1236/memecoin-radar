import type { Request, Response } from "express";
import { sdk } from "./_core/sdk.js";
import { getSourceHealthRows, saveSourceHealthAlert } from "./db.js";
import { runSourceHealthChecks, type SourceHealthSnapshot } from "./sourceHealth.js";
import { sendTelegramSourceHealthAlert } from "./telegram.js";

function isCronUser(user: { isCron?: boolean; taskUid?: string }): user is { isCron: true; taskUid: string } {
  return user.isCron === true && Boolean(user.taskUid);
}

function formatHealthLine(snapshot: SourceHealthSnapshot) {
  const label = snapshot.source === "dexScreener" ? "DEX Screener" : "GeckoTerminal";
  const status = snapshot.status === "down" ? "DOWN" : "STALE";
  return `• ${label}: ${status} — HTTP ${snapshot.httpStatus ?? "n/a"}, ${snapshot.latencyMs}ms, ${snapshot.recordCount} records${snapshot.errorMessage ? ` — ${snapshot.errorMessage}` : ""}`;
}

export async function scheduledSourceHealth(req: Request, res: Response) {
  const startedAt = new Date().toISOString();
  try {
    const user = await sdk.authenticateRequest(req);
    if (!isCronUser(user)) return res.status(403).json({ error: "cron-only" });
    const previous = await getSourceHealthRows();
    const snapshots = await runSourceHealthChecks();
    const previousBySource = new Map(previous.map(row => [row.source, row]));
    const unhealthy = snapshots.filter(snapshot => snapshot.status !== "healthy");
    const toAlert = unhealthy.filter(snapshot => {
      const prior = previousBySource.get(snapshot.source);
      return prior?.alertFingerprint !== snapshot.alertFingerprint || !prior?.lastAlertedAt;
    });
    let sent = 0;
    if (toAlert.length && (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID)) {
      return res.json({ ok: true, taskUid: user.taskUid, checked: snapshots.length, unhealthy: unhealthy.length, alerted: 0, skipped: "telegram-not-configured", snapshots, startedAt });
    }
    if (toAlert.length) {
      const result = await sendTelegramSourceHealthAlert(toAlert.map(formatHealthLine), "vi");
      sent = result.count;
      for (const snapshot of toAlert) await saveSourceHealthAlert(snapshot.source, snapshot.alertFingerprint ?? `${snapshot.source}:${snapshot.status}`);
    }
    return res.json({ ok: true, taskUid: user.taskUid, checked: snapshots.length, unhealthy: unhealthy.length, alerted: sent, snapshots, startedAt });
  } catch (error) {
    return res.status(500).json({ error: String(error), stack: error instanceof Error ? error.stack : undefined, context: { url: req.originalUrl, taskUid: "authenticated-cron" }, timestamp: startedAt });
  }
}
