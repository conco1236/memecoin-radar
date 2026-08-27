import type { Request, Response } from "express";
import { sdk } from "./_core/sdk.js";
import { getAlertPreferencesByTaskUid, getWatchlist, recordAlertDelivery } from "./db.js";
import { discoverTokens } from "./marketData.js";
import { shouldAlert } from "./researchGuards.js";
import { decideScheduledDelivery, isCronTaskUser } from "./scheduleGuards.js";
import { sendTelegramResearchAlert } from "./telegram.js";

export async function scheduledTelegramAlerts(req: Request, res: Response) {
  const startedAt = new Date().toISOString();
  try {
    const user = await sdk.authenticateRequest(req);
    if (!isCronTaskUser(user)) return res.status(403).json({ error: "cron-only" });
    const preferences = await getAlertPreferencesByTaskUid(user.taskUid!);
    if (!preferences) return res.json({ ok: true, skipped: "orphan" });
    if (!preferences.scheduleEnabled || !preferences.enabled) return res.json({ ok: true, skipped: "disabled" });

    const watchlist = await getWatchlist(preferences.userId);
    const watchedIds = new Set(watchlist.map(entry => entry.tokenId));
    const snapshot = await discoverTokens({ limit: 24 });
    const matches = snapshot.tokens.filter(token => shouldAlert({
      enabled: true,
      potentialScore: token.potentialScore,
      riskScore: token.riskScore,
      potentialThreshold: preferences.potentialThreshold,
      highRiskThreshold: preferences.highRiskThreshold,
      watched: watchedIds.has(token.id),
    }));
    const fingerprint = matches.map(token => `${token.id}:${token.potentialScore}:${token.riskScore}`).sort().join("|");
    const decision = decideScheduledDelivery({ preferenceFound: true, scheduleEnabled: Boolean(preferences.scheduleEnabled), alertsEnabled: Boolean(preferences.enabled), matchCount: matches.length, fingerprint, lastFingerprint: preferences.lastDeliveredFingerprint });
    if (decision !== "send") return res.json({ ok: true, sent: 0, skipped: decision });
    const result = await sendTelegramResearchAlert(matches, "vi");
    await recordAlertDelivery(preferences.userId, fingerprint);
    return res.json({ ok: true, sent: result.count, fingerprint, startedAt });
  } catch (error) {
    return res.status(500).json({ error: String(error), stack: error instanceof Error ? error.stack : undefined, context: { url: req.originalUrl, taskUid: "authenticated-cron" }, timestamp: startedAt });
  }
}
