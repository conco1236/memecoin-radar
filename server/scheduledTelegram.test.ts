import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getAlertPreferencesByTaskUid: vi.fn(),
  getWatchlist: vi.fn(),
  recordAlertDelivery: vi.fn(),
  discoverTokens: vi.fn(),
  sendTelegramResearchAlert: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./db", () => ({ getAlertPreferencesByTaskUid: mocks.getAlertPreferencesByTaskUid, getWatchlist: mocks.getWatchlist, recordAlertDelivery: mocks.recordAlertDelivery }));
vi.mock("./marketData", () => ({ discoverTokens: mocks.discoverTokens }));
vi.mock("./telegram", () => ({ sendTelegramResearchAlert: mocks.sendTelegramResearchAlert }));

import { scheduledTelegramAlerts } from "./scheduledTelegram.js";

function response() {
  const result: { statusCode?: number; body?: unknown } = {};
  const res = { status(code: number) { result.statusCode = code; return res; }, json(body: unknown) { result.body = body; return res; } } as any;
  return { res, result };
}

const token = (id: string, potentialScore = 80, riskScore = 20) => ({ id, symbol: id, potentialScore, riskScore, riskReasons: [] });

describe("scheduledTelegramAlerts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-cron callers", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false });
    const { res, result } = response();
    await scheduledTelegramAlerts({ originalUrl: "/api/scheduled/telegramAlerts" } as any, res);
    expect(result.statusCode).toBe(403);
    expect(result.body).toEqual({ error: "cron-only" });
  });

  it("skips orphan schedules", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-1" });
    mocks.getAlertPreferencesByTaskUid.mockResolvedValue(undefined);
    const { res, result } = response();
    await scheduledTelegramAlerts({ originalUrl: "/api/scheduled/telegramAlerts" } as any, res);
    expect(result.body).toEqual({ ok: true, skipped: "orphan" });
  });

  it("skips disabled schedules", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-1" });
    mocks.getAlertPreferencesByTaskUid.mockResolvedValue({ scheduleEnabled: 0, enabled: 1, userId: 7 });
    const { res, result } = response();
    await scheduledTelegramAlerts({ originalUrl: "/api/scheduled/telegramAlerts" } as any, res);
    expect(result.body).toEqual({ ok: true, skipped: "disabled" });
  });

  it("suppresses duplicate fingerprints", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-1" });
    mocks.getAlertPreferencesByTaskUid.mockResolvedValue({ scheduleEnabled: 1, enabled: 1, userId: 7, potentialThreshold: 70, highRiskThreshold: 75, lastDeliveredFingerprint: "A:80:20" });
    mocks.getWatchlist.mockResolvedValue([]);
    mocks.discoverTokens.mockResolvedValue({ tokens: [token("A")] });
    const { res, result } = response();
    await scheduledTelegramAlerts({ originalUrl: "/api/scheduled/telegramAlerts" } as any, res);
    expect(result.body).toEqual({ ok: true, sent: 0, skipped: "duplicate" });
    expect(mocks.sendTelegramResearchAlert).not.toHaveBeenCalled();
  });

  it("sends and records a new fingerprint", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-1" });
    mocks.getAlertPreferencesByTaskUid.mockResolvedValue({ scheduleEnabled: 1, enabled: 1, userId: 7, potentialThreshold: 70, highRiskThreshold: 75, lastDeliveredFingerprint: null });
    mocks.getWatchlist.mockResolvedValue([]);
    mocks.discoverTokens.mockResolvedValue({ tokens: [token("A")] });
    mocks.sendTelegramResearchAlert.mockResolvedValue({ count: 1 });
    const { res, result } = response();
    await scheduledTelegramAlerts({ originalUrl: "/api/scheduled/telegramAlerts" } as any, res);
    expect(result.statusCode).toBeUndefined();
    expect(result.body).toMatchObject({ ok: true, sent: 1, fingerprint: "A:80:20" });
    expect(mocks.recordAlertDelivery).toHaveBeenCalledWith(7, "A:80:20");
  });
});
