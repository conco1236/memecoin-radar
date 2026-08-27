import { afterEach, describe, expect, it, vi } from "vitest";
import { requestSource } from "./sourceHealth.js";

const response = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body });

describe("source health checks", () => {
  afterEach(() => vi.restoreAllMocks());

  it("marks a populated upstream response healthy", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([{ chainId: "solana" }])));
    const snapshot = await requestSource("dexScreener", "https://example.test/dex");
    expect(snapshot.status).toBe("healthy");
    expect(snapshot.recordCount).toBe(1);
    expect(snapshot.httpStatus).toBe(200);
  });

  it("marks an empty successful response stale", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([])));
    const snapshot = await requestSource("dexScreener", "https://example.test/dex");
    expect(snapshot.status).toBe("stale");
    expect(snapshot.errorMessage).toContain("no records");
  });

  it("marks a failed upstream response down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ error: "rate limited" }, false, 429)));
    const snapshot = await requestSource("geckoTerminal", "https://example.test/gecko");
    expect(snapshot.status).toBe("down");
    expect(snapshot.httpStatus).toBe(429);
    expect(snapshot.alertFingerprint).toBe("geckoTerminal:down:HTTP 429");
  });

  it("marks a timestamped old payload stale", async () => {
    const old = new Date(Date.now() - 16 * 60 * 1000).toISOString();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ data: [{ attributes: { updated_at: old } }] })));
    const snapshot = await requestSource("geckoTerminal", "https://example.test/gecko");
    expect(snapshot.status).toBe("stale");
    expect(snapshot.dataAgeSeconds).toBeGreaterThan(900);
  });
});
