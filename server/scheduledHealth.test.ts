import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getSourceHealthRows: vi.fn(),
  saveSourceHealthAlert: vi.fn(),
  runSourceHealthChecks: vi.fn(),
  sendTelegramSourceHealthAlert: vi.fn(),
}));

vi.mock("./_core/sdk.js", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./db.js", () => ({ getSourceHealthRows: mocks.getSourceHealthRows, saveSourceHealthAlert: mocks.saveSourceHealthAlert }));
vi.mock("./sourceHealth.js", () => ({ runSourceHealthChecks: mocks.runSourceHealthChecks }));
vi.mock("./telegram.js", () => ({ sendTelegramSourceHealthAlert: mocks.sendTelegramSourceHealthAlert }));

import { scheduledSourceHealth } from "./scheduledHealth.js";

function response() {
  const result: { statusCode?: number; body?: any } = {};
  const res = { status(code: number) { result.statusCode = code; return res; }, json(body: unknown) { result.body = body; return res; } } as any;
  return { res, result };
}

const healthy = { source: "dexScreener", status: "healthy", alertFingerprint: null, lastAlertedAt: null, recordCount: 2, latencyMs: 20, dataAgeSeconds: 0 };
const stale = { source: "geckoTerminal", status: "stale", alertFingerprint: "geckoTerminal:stale:old", lastAlertedAt: null, recordCount: 0, latencyMs: 80, dataAgeSeconds: 900, httpStatus: 200, errorMessage: "old" };

describe("scheduledSourceHealth", () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalChat = process.env.TELEGRAM_CHAT_ID;
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_CHAT_ID = "test-chat";
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "health-task" });
    mocks.getSourceHealthRows.mockResolvedValue([]);
    mocks.runSourceHealthChecks.mockResolvedValue([healthy, stale]);
    mocks.sendTelegramSourceHealthAlert.mockResolvedValue({ count: 1 });
  });
  afterEach(() => {
    if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN; else process.env.TELEGRAM_BOT_TOKEN = originalToken;
    if (originalChat === undefined) delete process.env.TELEGRAM_CHAT_ID; else process.env.TELEGRAM_CHAT_ID = originalChat;
  });

  it("rejects non-cron callers", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false });
    const { res, result } = response();
    await scheduledSourceHealth({ originalUrl: "/api/scheduled/healthCheck" } as any, res);
    expect(result.statusCode).toBe(403);
  });

  it("does not send when every source is healthy", async () => {
    mocks.runSourceHealthChecks.mockResolvedValue([healthy]);
    const { res, result } = response();
    await scheduledSourceHealth({ originalUrl: "/api/scheduled/healthCheck" } as any, res);
    expect(result.body).toMatchObject({ ok: true, unhealthy: 0, alerted: 0 });
    expect(mocks.sendTelegramSourceHealthAlert).not.toHaveBeenCalled();
  });

  it("suppresses an already-alerted fingerprint", async () => {
    mocks.getSourceHealthRows.mockResolvedValue([{ ...stale, lastAlertedAt: new Date() }]);
    const { res, result } = response();
    await scheduledSourceHealth({ originalUrl: "/api/scheduled/healthCheck" } as any, res);
    expect(result.body).toMatchObject({ ok: true, unhealthy: 1, alerted: 0 });
    expect(mocks.sendTelegramSourceHealthAlert).not.toHaveBeenCalled();
  });

  it("sends a new unhealthy condition and records it", async () => {
    const { res, result } = response();
    await scheduledSourceHealth({ originalUrl: "/api/scheduled/healthCheck" } as any, res);
    expect(result.body).toMatchObject({ ok: true, unhealthy: 1, alerted: 1 });
    expect(mocks.sendTelegramSourceHealthAlert).toHaveBeenCalledOnce();
    expect(mocks.saveSourceHealthAlert).toHaveBeenCalledWith("geckoTerminal", "geckoTerminal:stale:old");
  });

  it("returns a bounded success when Telegram is not configured", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    const { res, result } = response();
    await scheduledSourceHealth({ originalUrl: "/api/scheduled/healthCheck" } as any, res);
    expect(result.body).toMatchObject({ ok: true, skipped: "telegram-not-configured", unhealthy: 1, alerted: 0 });
    expect(mocks.sendTelegramSourceHealthAlert).not.toHaveBeenCalled();
  });
});
